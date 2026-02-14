/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initialize } from '@aptabase/electron/main';
import { registerIpcHandlers, setServerManager, setAuthManager, emitToRenderer } from './main/ipc-handlers';
import { createLogger, setMainWindow } from './main/utils/logger';
import { TalkToFigmaService, TalkToFigmaServerManager, TalkToFigmaTray } from './main/server';
import { trackAppStart, trackAppQuit, trackUserEngagement, trackFirstOpenIfNeeded, trackAppException, trackServerAction, trackOAuthAction, APTABASE_APP_KEY } from './main/analytics';
import { FigmaOAuthService } from './main/figma/oauth/FigmaOAuthService';
import { FigmaApiClient } from './main/figma/api/FigmaApiClient';
import { IPC_CHANNELS, STORE_KEYS } from './shared/constants';
import type { ServerState } from './shared/types';
import { getStore, saveFigmaUser, getFigmaUser } from './main/utils/store';
import { installStdioServer } from './main/utils/stdio-installer';
import { initializeUpdater } from './main/utils/updater';
import { createMenu } from './main/menu';

// Declare Vite plugin globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Initialize Aptabase before app is ready (must be before any app events)
initialize(APTABASE_APP_KEY);

const logger = createLogger('main');

// Global error handlers for crash reporting
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  trackAppException(
    true, // fatal
    error.name || 'UnknownError',
    error.message?.substring(0, 150),
    'main',
    error.stack?.split('\n')[1]?.trim()?.substring(0, 180)
  );
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled rejection:', error);
  trackAppException(
    false, // non-fatal
    'UnhandledRejection',
    error.message?.substring(0, 150),
    'main',
    error.stack?.split('\n')[1]?.trim()?.substring(0, 180)
  );
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: TalkToFigmaTray | null = null;
let serverManager: TalkToFigmaServerManager | null = null;
let service: TalkToFigmaService | null = null;

const createWindow = () => {
  logger.info('Creating main window');
  
  // Create the main browser window (sidebar layout)
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    frame: true,               // Standard window frame
    transparent: false,         // Opaque window
    alwaysOnTop: false,        // Normal window behavior
    resizable: true,           // Allow resize
    skipTaskbar: false,        // Show in taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Center window on screen
  mainWindow.center();

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Register IPC handlers
  registerIpcHandlers(mainWindow);

  // Set mainWindow reference for logger to emit logs
  setMainWindow(mainWindow);

  // Create application menu
  createMenu(mainWindow);

  logger.info('Main window created successfully');
};

const createTray = () => {
  logger.info('Creating system tray');

  if (!serverManager) {
    logger.error('Cannot create tray: serverManager not initialized');
    return;
  }

  tray = new TalkToFigmaTray(serverManager);
  tray.create();

  logger.info('System tray created');
};

const initializeServers = (window: BrowserWindow) => {
  logger.info('Initializing TalkToFigma servers...');

  // Initialize server manager
  serverManager = TalkToFigmaServerManager.getInstance();

  // Initialize service (singleton pattern)
  service = TalkToFigmaService.getInstance();

  // Helper to emit status changes to renderer
  const emitStatusChange = () => {
    // Safety check: ensure window is still valid
    if (!window || window.isDestroyed()) {
      logger.warn('Cannot emit status change: window is destroyed');
      return;
    }

    const result = service!.getStatus();
    if (result.success && result.status) {
      const figmaState = result.status;
      const status: ServerState = {
        websocket: {
          status: figmaState.websocket.running ? 'running' : 'stopped',
          port: figmaState.websocket.port,
          connectedClients: figmaState.websocket.clientCount || 0,
        },
        mcp: {
          status: 'running', // stdio mode is always available when app is running
          transport: 'stdio',
        },
        operationInProgress: false,
        lastError: null,
      };
      emitToRenderer(window, IPC_CHANNELS.SERVER_STATUS_CHANGED, status);
    }
  };

  // Register callback to emit status changes when service notifies
  // This is the single source of truth for status updates
  service.setTrayUpdateCallback(() => {
    emitStatusChange();
  });

  // Register callback to update menu when server status changes
  service.setMenuUpdateCallback(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      createMenu(mainWindow);
    }
  });

  // Create adapter for IPC handlers to use the new service
  const serverManagerAdapter: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    restart: () => Promise<void>;
    getStatus: () => ServerState;
  } = {
    start: async () => {
      const startTime = Date.now();
      try {
        const result = await service!.startAll();
        if (!result.success) {
          throw new Error(result.error || 'Failed to start servers');
        }
        // Track successful server start with startup time
        const startupTimeMs = Date.now() - startTime;
        trackServerAction('start', 'all', 3055, startupTimeMs, true);
        // Note: emitStatusChange is called via TrayUpdateCallback in service.startAll()
        // No need to call it explicitly here to avoid duplicate events
      } catch (error) {
        // Track failed server start
        const errorMessage = error instanceof Error ? error.message : String(error);
        trackServerAction('start', 'all', 3055, undefined, false, errorMessage);
        // Ensure UI reflects error state
        emitStatusChange();
        throw error;
      }
    },
    stop: async () => {
      try {
        const result = await service!.stopAll();
        if (!result.success) {
          throw new Error(result.error || 'Failed to stop servers');
        }
        // Track successful server stop
        trackServerAction('stop', 'all', 3055, undefined, true);
        // Note: emitStatusChange is called via TrayUpdateCallback in service.stopAll()
        // No need to call it explicitly here to avoid duplicate events
      } catch (error) {
        // Track failed server stop
        const errorMessage = error instanceof Error ? error.message : String(error);
        trackServerAction('stop', 'all', 3055, undefined, false, errorMessage);
        // Ensure UI reflects error state
        emitStatusChange();
        throw error;
      }
    },
    restart: async () => {
      // Track server restart at the beginning
      trackServerAction('restart', 'all', 3055, undefined, true);
      // Delegate to stop and start - they handle their own tracking
      await serverManagerAdapter.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await serverManagerAdapter.start();
    },
    getStatus: () => {
      const result = service!.getStatus();
      if (result.success && result.status) {
        // Convert FigmaServerState to ServerState format
        const figmaState = result.status;
        return {
          websocket: {
            status: figmaState.websocket.running ? 'running' : 'stopped',
            port: figmaState.websocket.port,
            connectedClients: figmaState.websocket.clientCount || 0,
            mcpClientCount: figmaState.websocket.mcpClientCount,
            figmaClientCount: figmaState.websocket.figmaClientCount,
          },
          mcp: {
            status: 'running', // stdio mode is always available when app is running
            transport: 'stdio',
          },
          operationInProgress: false,
          lastError: null,
        };
      }
      // Return default stopped state if getStatus fails
      return {
        websocket: { status: 'stopped', port: 3055, connectedClients: 0 },
        mcp: { status: 'stopped', transport: 'stdio' },
        operationInProgress: false,
        lastError: result.error || null,
      };
    },
  };

  // Set the adapter for IPC handlers
  setServerManager(serverManagerAdapter);

  // Create auth manager adapter
  const authManagerAdapter = {
    startOAuth: async () => {
      // Track OAuth start
      trackOAuthAction('start');
      try {
        const oauthService = new FigmaOAuthService();
        await oauthService.authenticate();

        // Track OAuth success
        trackOAuthAction('success');

        // Tokens are already saved by authenticate()
        // Now fetch user info
        const apiClient = await FigmaApiClient.create();
        if (apiClient) {
          const userResult = await apiClient.getCurrentUser();
          if (userResult.success && userResult.data) {
            // Save user info using helper function
            saveFigmaUser({
              id: userResult.data.id,
              email: userResult.data.email,
              handle: userResult.data.handle,
              imgUrl: userResult.data.img_url,
            });

            // Emit auth status change to renderer with user info
            emitToRenderer(window, IPC_CHANNELS.AUTH_STATUS_CHANGED, {
              isAuthenticated: true,
              user: {
                id: userResult.data.id,
                email: userResult.data.email,
                handle: userResult.data.handle,
                imgUrl: userResult.data.img_url,
              },
              tokens: null,
              fileKey: null,
              fileUrl: null,
            });
          }
        }
      } catch (error) {
        // Track OAuth error
        trackOAuthAction('error');
        logger.error('OAuth authentication failed:', error);
        throw error;
      }
    },
    logout: async () => {
      // Track OAuth logout
      trackOAuthAction('logout');

      // Clear tokens and user info using service method
      FigmaOAuthService.clearTokens();

      // Emit auth status change to renderer
      emitToRenderer(window, IPC_CHANNELS.AUTH_STATUS_CHANGED, {
        isAuthenticated: false,
        user: null,
        tokens: null,
        fileKey: null,
        fileUrl: null,
      });
    },
    getStatus: () => {
      const store = getStore();
      const accessToken = store.get(STORE_KEYS.FIGMA_ACCESS_TOKEN);
      const expiresAt = store.get(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT) || 0;
      const user = getFigmaUser();

      return {
        isAuthenticated: !!accessToken && expiresAt > Date.now(),
        user: user || null,
        tokens: null, // Don't expose tokens
        fileKey: null,
        fileUrl: null,
      };
    },
  };

  setAuthManager(authManagerAdapter);

  // Emit initial auth status on startup
  const initialAuthStatus = authManagerAdapter.getStatus();
  emitToRenderer(window, IPC_CHANNELS.AUTH_STATUS_CHANGED, initialAuthStatus);
  if (initialAuthStatus.isAuthenticated && initialAuthStatus.user) {
    logger.info(`Restored auth session for user: ${initialAuthStatus.user.handle}`);
  }

  logger.info('TalkToFigma servers initialized');
};

// App ready
app.on('ready', async () => {
  logger.info('App ready, initializing...');

  // Track app start and user engagement (Kotlin-compatible)
  trackAppStart();
  trackUserEngagement();
  trackFirstOpenIfNeeded();

  // Install stdio server to Application Support and create symlink
  logger.info('Installing MCP stdio server...');
  const installResult = await installStdioServer();
  if (installResult.success) {
    logger.info(`✅ MCP stdio server installed at: ${installResult.path}`);
  } else {
    logger.error(`❌ Failed to install MCP stdio server: ${installResult.error}`);
  }

  // Initialize auto-updater (production only)
  initializeUpdater();

  createWindow();

  // Initialize servers after window is created
  if (mainWindow) {
    initializeServers(mainWindow);
    createTray();
  }

  // Auto-start servers in development
  if (process.env.NODE_ENV === 'development') {
    try {
      logger.info('Auto-starting servers in development mode...');
      await service?.startAll({ showNotification: false });
    } catch (error) {
      logger.error('Failed to auto-start servers:', { error });
    }
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('All windows closed, quitting app');
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Graceful shutdown
app.on('before-quit', async () => {
  logger.info('App shutting down...');

  // Track app quit
  trackAppQuit();

  // Stop servers gracefully
  try {
    await service?.stopAll({ showNotification: false });
  } catch (error) {
    logger.error('Error stopping servers:', { error });
  }

  // Destroy tray
  tray?.destroy();

  logger.info('App shutdown complete');
});
