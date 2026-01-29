/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { BrowserWindow, Notification } from 'electron';
import { createLogger } from '../utils/logger';
import { IPC_CHANNELS } from '../../shared/constants';

import { TalkToFigmaServerManager } from './TalkToFigmaServerManager';

const logger = createLogger('Service');

/**
 * Centralized service for TalkToFigma server operations
 * Used by both IPC handlers and System Tray to ensure consistent behavior
 */
export class TalkToFigmaService {
  private static instance: TalkToFigmaService | null = null;
  private manager: TalkToFigmaServerManager;
  private trayUpdateCallback: (() => void) | null = null;

  private constructor() {
    this.manager = TalkToFigmaServerManager.getInstance();

    // Register callback for WebSocket client count changes
    this.manager.wsServer.setOnStatusChange(() => {
      this.notifyStatusChange();
    });
  }

  static getInstance(): TalkToFigmaService {
    if (!TalkToFigmaService.instance) {
      TalkToFigmaService.instance = new TalkToFigmaService();
    }
    return TalkToFigmaService.instance;
  }

  /**
   * Register callback to update tray when status changes
   */
  setTrayUpdateCallback(callback: () => void): void {
    this.trayUpdateCallback = callback;
    logger.info('[TalkToFigma Service] Tray update callback registered');
  }

  /**
   * Notify all windows, tray, and external listeners about status change
   */
  private notifyStatusChange(): void {
    // Get current status
    const result = this.getStatus();

    if (result.success && result.status) {
      const figmaState = result.status;

      // Convert to ServerState format expected by renderer
      const serverState = {
        websocket: {
          status: figmaState.websocket.running ? 'running' : 'stopped',
          port: figmaState.websocket.port,
          connectedClients: figmaState.websocket.clientCount || 0,
          mcpClientCount: figmaState.websocket.mcpClientCount,
          figmaClientCount: figmaState.websocket.figmaClientCount,
        },
        mcp: {
          status: 'running' as const, // stdio mode is always available when app is running
          transport: 'stdio' as const,
        },
        operationInProgress: false,
        lastError: null,
      };

      // Notify all renderer processes with status data
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send(IPC_CHANNELS.SERVER_STATUS_CHANGED, serverState);
      });
    }

    // Update tray icon and menu
    if (this.trayUpdateCallback) {
      this.trayUpdateCallback();
    }
  }

  /**
   * Start all servers (WebSocket + MCP)
   */
  async startAll(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    status?: any;
    error?: string;
  }> {
    try {
      logger.info('[TalkToFigma Service] Starting all servers...');
      const status = await this.manager.startAll();
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'TalkToFigma Servers Started',
          body: 'WebSocket and MCP servers are now running',
        }).show();
      }

      return { success: true, status };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to start servers:', error);
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'Error',
          body: `Failed to start servers: ${error instanceof Error ? error.message : String(error)}`,
        }).show();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: this.manager.getStatus(),
      };
    }
  }

  /**
   * Stop all servers
   */
  async stopAll(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    status?: any;
    error?: string;
  }> {
    try {
      logger.info('[TalkToFigma Service] Stopping all servers...');
      const status = await this.manager.stopAll();
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'TalkToFigma Servers Stopped',
          body: 'All servers have been stopped',
        }).show();
      }

      return { success: true, status };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to stop servers:', error);
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'Error',
          body: `Failed to stop servers: ${error instanceof Error ? error.message : String(error)}`,
        }).show();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: this.manager.getStatus(),
      };
    }
  }

  /**
   * Get current server status
   */
  getStatus(): {
    success: boolean;
    status?: any;
    error?: string;
  } {
    try {
      const status = this.manager.getStatus();
      return { success: true, status };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to get status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get server logs
   */
  getLogs(): {
    success: boolean;
    logs?: { ws: string[] };
    error?: string;
  } {
    try {
      const logs = this.manager.getLogs();
      return { success: true, logs };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to get logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear server logs
   */
  clearLogs(): {
    success: boolean;
    error?: string;
  } {
    try {
      this.manager.clearLogs();
      return { success: true };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to clear logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get MCP server configuration for Cursor IDE
   */
  getMcpServerConfig(): {
    success: boolean;
    config?: object;
    error?: string;
  } {
    try {
      const config = this.manager.getMcpServerConfig();
      return { success: true, config };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to get MCP server config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Force kill processes on ports
   */
  async killProcesses(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info('[TalkToFigma Service] Killing processes on ports...');
      await this.manager.killProcesses();
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'Processes Killed',
          body: 'All processes on ports 3055 and 3056 have been terminated',
        }).show();
      }

      return { success: true };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to kill processes:', error);

      if (options?.showNotification) {
        new Notification({
          title: 'Error',
          body: `Failed to kill processes: ${error instanceof Error ? error.message : String(error)}`,
        }).show();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start WebSocket server only
   */
  async startWebSocket(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.manager.wsServer.start(3055);
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'WebSocket Server Started',
          body: 'WebSocket server is now running on port 3055',
        }).show();
      }

      return { success: true };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to start WebSocket server:', error);

      if (options?.showNotification) {
        new Notification({
          title: 'Error',
          body: `Failed to start WebSocket server: ${error instanceof Error ? error.message : String(error)}`,
        }).show();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop WebSocket server only
   */
  async stopWebSocket(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.manager.wsServer.stop();
      this.notifyStatusChange();

      if (options?.showNotification) {
        new Notification({
          title: 'WebSocket Server Stopped',
          body: 'WebSocket server has been stopped',
        }).show();
      }

      return { success: true };
    } catch (error) {
      logger.error('[TalkToFigma Service] Failed to stop WebSocket server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start MCP server only
   * Note: MCP stdio server is spawned by MCP clients, not managed by this service
   */
  async startMcp(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    error?: string;
  }> {
    // MCP stdio server is spawned by clients (Cursor, Claude Code, etc)
    // No server-side action needed
    logger.info('[TalkToFigma Service] MCP server is stdio-based, spawned by clients');

    if (options?.showNotification) {
      new Notification({
        title: 'MCP Server (stdio)',
        body: 'MCP server is spawned by clients when needed',
      }).show();
    }

    return { success: true };
  }

  /**
   * Stop MCP server only
   * Note: MCP stdio server is managed by MCP clients
   */
  async stopMcp(options?: { showNotification?: boolean }): Promise<{
    success: boolean;
    error?: string;
  }> {
    // MCP stdio server is managed by clients
    // No server-side action needed
    logger.info('[TalkToFigma Service] MCP stdio servers are managed by clients');

    if (options?.showNotification) {
      new Notification({
        title: 'MCP Server (stdio)',
        body: 'MCP server is managed by clients',
      }).show();
    }

    return { success: true };
  }
}

