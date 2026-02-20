/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import inspector from 'node:inspector';
import started from 'electron-squirrel-startup';
import { initialize } from '@aptabase/electron/main';
import { registerIpcHandlers, setAuthManager, emitToRenderer } from './main/ipc-handlers';
import { createLogger, setMainWindow } from './main/utils/logger';
import { TalkToFigmaService, TalkToFigmaServerManager, TalkToFigmaTray } from './main/server';
import { trackAppStart, trackAppQuit, trackUserEngagement, trackFirstOpenIfNeeded, trackAppException, trackOAuthAction, APTABASE_APP_KEY } from './main/analytics';
import { FigmaOAuthService } from './main/figma/oauth/FigmaOAuthService';
import { FigmaApiClient } from './main/figma/api/FigmaApiClient';
import { IPC_CHANNELS, STORE_KEYS } from './shared/constants';
import type { ServerState } from './shared/types';
import { getStore, saveFigmaUser, getFigmaUser } from './main/utils/store';
import { installStdioServer } from './main/utils/stdio-installer';
import { initializeUpdater } from './main/utils/updater';
import { createMenu } from './main/menu';
import { SseDetectionServer } from './main/server/SseDetectionServer';

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

  // Renderer lifecycle diagnostics (critical for packaged/TestFlight blank-screen debugging)
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Renderer did-finish-load');
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      logger.error(
        `Renderer did-fail-load: code=${errorCode}, description=${errorDescription}, url=${validatedURL}, mainFrame=${isMainFrame}`
      );
    }
  );

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error(
      `Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`
    );
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error(
      `Preload error: path=${preloadPath}, message=${error?.message || 'unknown'}`
    );
  });

  mainWindow.on('unresponsive', () => {
    logger.warn('Main window became unresponsive');
  });

  mainWindow.on('responsive', () => {
    logger.info('Main window responsive again');
  });

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
  // KleverDesktop style: direct call, no setImmediate wrapper needed
  initializeUpdater();

  createWindow();

  // Initialize servers after window is created
  if (mainWindow) {
    initializeServers(mainWindow);
    createTray();
  }

  // Start SSE detection server — listens on port 3056 for 60s to detect legacy clients
  if (mainWindow) {
    const sseDetection = new SseDetectionServer(() => {
      emitToRenderer(mainWindow!, IPC_CHANNELS.SSE_CLIENT_DETECTED, {});
      sseDetection.stop();
    });
    sseDetection.start().then(() => {
      setTimeout(() => sseDetection.stop(), 60_000);
    });
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

  // Close all windows and their DevTools explicitly
  // This helps prevent inspector socket hang on MAS builds
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    try {
      if (window.webContents && !window.webContents.isDestroyed()) {
        window.webContents.closeDevTools();
      }
      if (!window.isDestroyed()) {
        window.close();
      }
    } catch (error) {
      logger.error('Error closing window:', { error });
    }
  }

  // Close Node.js inspector to prevent InspectorSocket::Shutdown hang
  // This is especially important for MAS sandbox builds
  try {
    inspector.close();
    logger.info('Inspector closed');
  } catch {
    // Inspector may not be active, ignore
  }

  // Destroy tray
  tray?.destroy();

  logger.info('App shutdown complete');
});
