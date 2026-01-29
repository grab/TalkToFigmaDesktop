/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { createLogger } from '../utils/logger';
import { ensurePortAvailable, killProcessOnPort } from '../utils/port-manager';
import { getStdioServerConfig } from '../utils/stdio-path';

import { TalkToFigmaWebSocketServer, ServerStatus } from './TalkToFigmaWebSocketServer';

const logger = createLogger('Manager');

export interface FigmaServerState {
  websocket: ServerStatus;
}

/**
 * Singleton manager for Figma servers
 * Manages WebSocket server only. MCP stdio server is spawned by clients (Cursor, Claude Code, etc).
 */
export class TalkToFigmaServerManager {
  private static instance: TalkToFigmaServerManager;

  public readonly wsServer: TalkToFigmaWebSocketServer;
  private isRunning = false;

  private constructor() {
    this.wsServer = new TalkToFigmaWebSocketServer();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TalkToFigmaServerManager {
    if (!TalkToFigmaServerManager.instance) {
      TalkToFigmaServerManager.instance = new TalkToFigmaServerManager();
    }
    return TalkToFigmaServerManager.instance;
  }

  /**
   * Start WebSocket server
   * Note: MCP stdio server is spawned by MCP clients, not by this manager
   */
  async startAll(): Promise<FigmaServerState> {
    if (this.isRunning) {
      return this.getStatus();
    }

    try {
      logger.info('[TalkToFigma Manager] 🚀 Starting WebSocket server...');

      const wsPortAvailable = await ensurePortAvailable(3055);
      if (!wsPortAvailable) {
        throw new Error('Failed to make WebSocket port 3055 available');
      }

      await this.wsServer.start(3055);

      this.isRunning = true;
      logger.info('[TalkToFigma Manager] ✅ WebSocket server ready (MCP stdio will be spawned by clients)');

      return this.getStatus();
    } catch (error) {
      logger.error('[TalkToFigma Manager] ❌ Start failed:', error);

      try {
        await this.stopAll();
      } catch (cleanupError) {
        logger.error('[TalkToFigma Manager] Cleanup error:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Stop WebSocket server
   */
  async stopAll(): Promise<FigmaServerState> {
    try {
      logger.info('[TalkToFigma Manager] 🛑 Stopping WebSocket server...');

      try {
        await this.wsServer.stop();
      } catch (error) {
        logger.error('[TalkToFigma Manager] WebSocket stop error:', error);
      }

      this.isRunning = false;
      logger.info('[TalkToFigma Manager] ✅ WebSocket server stopped');

      return this.getStatus();
    } catch (error) {
      logger.error('[TalkToFigma Manager] ❌ Stop failed:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Get status of WebSocket server
   */
  getStatus(): FigmaServerState {
    return {
      websocket: this.wsServer.getStatus(),
    };
  }

  /**
   * Get logs from WebSocket server
   */
  getLogs(): { ws: string[] } {
    return {
      ws: this.wsServer.getLogs(),
    };
  }

  /**
   * Clear logs from WebSocket server
   */
  clearLogs(): void {
    this.wsServer.clearLogs();
  }

  /**
   * Check if servers are running
   */
  isAllRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get MCP server configuration for stdio-based clients
   * Returns the configuration object that should be used by MCP clients
   */
  getMcpServerConfig(): object {
    return getStdioServerConfig();
  }

  /**
   * Force kill processes on WebSocket port
   * This is a nuclear option for when server won't stop gracefully
   */
  async killProcesses(): Promise<void> {
    logger.info('[TalkToFigma Manager] 💥 Force killing process on port 3055...');

    try {
      // First try to stop server gracefully
      await this.stopAll();
    } catch (error) {
      logger.warn('[TalkToFigma Manager] Graceful stop failed, proceeding with force kill');
    }

    // Force kill process on WebSocket port
    await killProcessOnPort(3055).catch((err) => {
      logger.error('[TalkToFigma Manager] Failed to kill process on port 3055:', err);
    });

    this.isRunning = false;
    logger.info('[TalkToFigma Manager] ✅ Force kill completed');
  }
}

