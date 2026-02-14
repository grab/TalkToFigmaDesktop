/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { ipcMain, BrowserWindow, shell, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { createLogger } from './utils/logger';
import * as storeUtils from './utils/store';
import type { ServerState, FigmaAuthState } from '../shared/types';
import { registerMcpConfigHandlers } from './handlers/mcp-config-handler';
import { trackTutorialAction, trackThemeChange, trackPageView } from './analytics';
import { checkForUpdates } from './utils/updater';

const logger = createLogger('IPC');

// Placeholder for server manager (will be implemented in Phase 2)
let serverManager: {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  getStatus: () => ServerState;
} | null = null;

// Placeholder for auth manager (will be implemented in Phase 4)
let authManager: {
  startOAuth: () => Promise<void>;
  logout: () => Promise<void>;
  getStatus: () => FigmaAuthState;
} | null = null;

export function setServerManager(manager: typeof serverManager): void {
  serverManager = manager;
}

export function setAuthManager(manager: typeof authManager): void {
  authManager = manager;
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  logger.info('Registering IPC handlers');

  // ===== Server Control =====
  ipcMain.handle(IPC_CHANNELS.SERVER_START, async () => {
    logger.info('IPC: server:start');
    if (!serverManager) {
      throw new Error('Server manager not initialized');
    }
    await serverManager.start();
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_STOP, async () => {
    logger.info('IPC: server:stop');
    if (!serverManager) {
      throw new Error('Server manager not initialized');
    }
    await serverManager.stop();
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_RESTART, async () => {
    logger.info('IPC: server:restart');
    if (!serverManager) {
      throw new Error('Server manager not initialized');
    }
    await serverManager.restart();
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_GET_STATUS, async () => {
    if (!serverManager) {
      return {
        websocket: { status: 'stopped', port: 3055, connectedClients: 0 },
        mcp: { status: 'stopped', port: 3056 },
        operationInProgress: false,
        lastError: null,
      } as ServerState;
    }
    return serverManager.getStatus();
  });

  // ===== Authentication =====
  ipcMain.handle(IPC_CHANNELS.AUTH_START_OAUTH, async () => {
    logger.info('IPC: auth:start-oauth');
    if (!authManager) {
      throw new Error('Auth manager not initialized');
    }
    await authManager.startOAuth();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    logger.info('IPC: auth:logout');
    storeUtils.clearFigmaTokens();
    storeUtils.clearFigmaUser();
    if (authManager) {
      await authManager.logout();
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_STATUS, async (): Promise<FigmaAuthState> => {
    logger.debug('IPC: auth:get-status');
    const tokens = storeUtils.getFigmaTokens();
    const user = storeUtils.getFigmaUser();
    const fileInfo = storeUtils.getFigmaFileKey();

    return {
      isAuthenticated: !!tokens && tokens.expiresAt > Date.now(),
      user,
      tokens,
      fileKey: fileInfo?.key ?? null,
      fileUrl: fileInfo?.url ?? null,
    };
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_SET_FILE_KEY, async (_event: IpcMainInvokeEvent, fileKey: string) => {
    logger.info('IPC: auth:set-file-key', { fileKey });
    storeUtils.setFigmaFileKey(fileKey);
  });

  // ===== Settings =====
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event: IpcMainInvokeEvent, key: string) => {
    logger.debug('IPC: settings:get', { key });
    return storeUtils.getSetting(key) ?? null;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
    logger.debug('IPC: settings:set', { key, value });
    storeUtils.setSetting(key, value);
  });

  // ===== Window Control =====
  ipcMain.handle(IPC_CHANNELS.WINDOW_RESIZE, async (_event: IpcMainInvokeEvent, width: number, height: number) => {
    logger.debug('IPC: window:resize', { width, height });
    const bounds = mainWindow.getBounds();
    const xDiff = Math.floor((width - bounds.width) / 2);
    mainWindow.setBounds({
      x: bounds.x - xDiff,
      y: bounds.y,
      width,
      height,
    }, false);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_HIDE, async () => {
    logger.debug('IPC: window:hide');
    mainWindow.hide();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW, async () => {
    logger.debug('IPC: window:show');
    mainWindow.show();
  });

  // ===== Shell =====
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event: IpcMainInvokeEvent, url: string) => {
    logger.info('IPC: shell:open-external', { url });
    await shell.openExternal(url);
  });

  // ===== MCP Configuration =====
  registerMcpConfigHandlers();

  // ===== Analytics (Renderer → Main) =====
  ipcMain.handle(IPC_CHANNELS.ANALYTICS_TRACK, async (
    _event: IpcMainInvokeEvent,
    eventType: string,
    properties?: Record<string, string | number | boolean>
  ) => {
    logger.debug('IPC: analytics:track', { eventType });

    switch (eventType) {
      case 'tutorial':
        if (properties?.action) {
          trackTutorialAction(properties.action as 'shown' | 'completed' | 'skipped');
        }
        break;
      case 'theme':
        if (properties?.theme) {
          trackThemeChange(properties.theme as 'light' | 'dark' | 'system');
        }
        break;
      case 'pageView':
        if (properties?.title && properties?.location) {
          trackPageView(
            String(properties.title),
            String(properties.location),
            properties.path ? String(properties.path) : undefined
          );
        }
        break;
      default:
        logger.warn(`Unknown analytics event type: ${eventType}`);
    }
  });

  // ===== Updates =====
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
    logger.info('IPC: update:check');
    checkForUpdates(true);
  });

  logger.info('IPC handlers registered successfully');
}

// Helper to emit events to renderer
export function emitToRenderer(mainWindow: BrowserWindow, channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}
