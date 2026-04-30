/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initialize } from '@aptabase/electron/main';
import { registerIpcHandlers, setAuthManager, emitToRenderer } from './main/ipc-handlers';
import { createLogger, setMainWindow } from './main/utils/logger';
import { TalkToFigmaService, TalkToFigmaServerManager, TalkToFigmaTray } from './main/server';
import { trackAppStart, trackUserEngagement, trackFirstOpenIfNeeded, trackAppException, APTABASE_APP_KEY, flushMCPToolSuccessBatch, trackAppQuit } from './main/analytics';
import { IPC_CHANNELS } from './shared/constants';
import { installStdioServer } from './main/utils/stdio-installer';
import { initializeUpdater } from './main/utils/updater';
import { createMenu } from './main/menu';
import { SseDetectionServer } from './main/server/SseDetectionServer';
import { createMainWindow } from './main/bootstrap/create-main-window';
import { loadRenderer, registerRendererProtocol, registerRendererProtocolScheme } from './main/bootstrap/renderer-loader';
import { toRendererServerState } from './main/bootstrap/server-state-mapper';
import { createAuthManagerAdapter } from './main/bootstrap/auth-manager';
import { shutdownApp } from './main/bootstrap/shutdown';

// Declare Vite plugin globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

registerRendererProtocolScheme();
initialize(APTABASE_APP_KEY);

const logger = createLogger('main');

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  trackAppException(
    true,
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
    false,
    'UnhandledRejection',
    error.message?.substring(0, 150),
    'main',
    error.stack?.split('\n')[1]?.trim()?.substring(0, 180)
  );
});

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: TalkToFigmaTray | null = null;
let serverManager: TalkToFigmaServerManager | null = null;
let service: TalkToFigmaService | null = null;
let quitRequested = false;
let shutdownComplete = false;

const rendererLoaderOptions = {
  devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
  rendererName: MAIN_WINDOW_VITE_NAME,
  logger,
};

const requestAppQuit = async () => {
  if (quitRequested) {
    logger.info('Quit already requested');
    return;
  }

  quitRequested = true;
  logger.info('Quit requested');

  try {
    await shutdownApp({
      logger,
      service,
      tray,
      flushMCPToolSuccessBatch,
      trackAppQuit,
    });
  } finally {
    shutdownComplete = true;
    app.exit(0);
  }
};

const shouldHideMainWindowOnClose = () => (
  process.platform === 'darwin' || process.platform === 'win32'
);

const revealMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
};

const attachMainWindowLifecycle = (window: BrowserWindow) => {
  window.on('close', (event) => {
    if (shouldHideMainWindowOnClose() && !quitRequested) {
      event.preventDefault();
      window.hide();
    }
  });

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
      setMainWindow(null);
    }
  });
};

const createWindow = () => {
  const window = createMainWindow({
    preloadPath: path.join(__dirname, 'preload.cjs'),
    logger,
    loadRenderer: (window) => loadRenderer(window, rendererLoaderOptions),
    registerIpcHandlers,
    setLoggerWindow: setMainWindow,
    createMenu: (window) => createMenu(window, requestAppQuit),
  });

  attachMainWindowLifecycle(window);
  mainWindow = window;
};

const createTray = () => {
  logger.info('Creating system tray');

  if (!serverManager) {
    logger.error('Cannot create tray: serverManager not initialized');
    return;
  }

  tray = new TalkToFigmaTray(serverManager, requestAppQuit);
  tray.create();

  logger.info('System tray created');
};

const initializeServers = (window: BrowserWindow) => {
  logger.info('Initializing TalkToFigma servers...');

  serverManager = TalkToFigmaServerManager.getInstance();
  service = TalkToFigmaService.getInstance();

  const emitStatusChange = () => {
    if (!window || window.isDestroyed()) {
      logger.warn('Cannot emit status change: window is destroyed');
      return;
    }

    const result = service!.getStatus();
    if (result.success && result.status) {
      emitToRenderer(window, IPC_CHANNELS.SERVER_STATUS_CHANGED, toRendererServerState(result.status));
    }
  };

  service.setTrayUpdateCallback(() => {
    emitStatusChange();
  });

  service.setMenuUpdateCallback(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      createMenu(mainWindow, requestAppQuit);
    }
  });

  const authManagerAdapter = createAuthManagerAdapter({
    window,
    logger,
    emitToRenderer,
  });
  setAuthManager(authManagerAdapter);

  const initialAuthStatus = authManagerAdapter.getStatus();
  emitToRenderer(window, IPC_CHANNELS.AUTH_STATUS_CHANGED, initialAuthStatus);
  if (initialAuthStatus.isAuthenticated && initialAuthStatus.user) {
    logger.info(`Restored auth session for user: ${initialAuthStatus.user.handle}`);
  }

  logger.info('TalkToFigma servers initialized');
};

app.on('ready', async () => {
  logger.info('App ready, initializing...');

  registerRendererProtocol(rendererLoaderOptions);
  trackAppStart();
  trackUserEngagement();
  trackFirstOpenIfNeeded();

  logger.info('Installing MCP stdio server...');
  const installResult = await installStdioServer();
  if (installResult.success) {
    logger.info(`✅ MCP stdio server installed at: ${installResult.path}`);
  } else {
    logger.error(`❌ Failed to install MCP stdio server: ${installResult.error}`);
  }

  initializeUpdater();
  createWindow();

  if (mainWindow) {
    initializeServers(mainWindow);
    createTray();
  }

  if (mainWindow) {
    const sseDetection = new SseDetectionServer(() => {
      emitToRenderer(mainWindow!, IPC_CHANNELS.SSE_CLIENT_DETECTED, {});
      sseDetection.stop();
    });
    sseDetection.start().then(() => {
      setTimeout(() => sseDetection.stop(), 60_000);
    });
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      logger.info('Auto-starting servers in development mode...');
      await service?.startAll({ showNotification: false });
    } catch (error) {
      logger.error('Failed to auto-start servers:', { error });
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('All windows closed, quitting app');
    void requestAppQuit();
  }
});

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    revealMainWindow();
    return;
  }

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', (event) => {
  if (shutdownComplete) {
    return;
  }

  event.preventDefault();
  void requestAppQuit();
});

app.on('will-quit', () => {
  try {
    flushMCPToolSuccessBatch('app_quit');
  } catch (error) {
    logger.warn('Failed to flush MCP success batch on will-quit:', { error });
  }
});
