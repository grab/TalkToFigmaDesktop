import { FigmaWebSocketServer } from './websocket-server';
import { McpSseServer } from './mcp-server';
import { ensurePortsAvailable, cleanupPorts } from '../utils/port-manager';
import { createLogger } from '../utils/logger';
import type { ServerState, ProgressUpdate } from '../../shared/types';

const logger = createLogger('Manager');

export interface ServerManagerEvents {
  onStatusChanged: (state: ServerState) => void;
  onFigmaConnected: (channelId: string) => void;
  onFigmaDisconnected: () => void;
  onProgressUpdate: (update: ProgressUpdate) => void;
}

export class ServerManager {
  private wsServer: FigmaWebSocketServer | null = null;
  private mcpServer: McpSseServer | null = null;
  private events: Partial<ServerManagerEvents> = {};
  private operationInProgress = false;
  private lastError: string | null = null;
  private currentChannelId: string | null = null;

  constructor(events?: Partial<ServerManagerEvents>) {
    this.events = events || {};
  }

  /**
   * Start all servers
   */
  async start(): Promise<void> {
    if (this.operationInProgress) {
      throw new Error('Operation already in progress');
    }

    logger.info('Starting all servers...');
    this.operationInProgress = true;
    this.lastError = null;
    this.emitStatus();

    try {
      // Ensure ports are available
      const { success, unavailablePorts } = await ensurePortsAvailable();
      if (!success) {
        throw new Error(`Ports not available: ${unavailablePorts.join(', ')}`);
      }

      // Create and start WebSocket server
      this.wsServer = new FigmaWebSocketServer({
        onClientConnected: (clientId) => {
          logger.info(`Figma plugin connected: ${clientId}`);
        },
        onClientDisconnected: (clientId) => {
          logger.info(`Figma plugin disconnected: ${clientId}`);
          if (this.wsServer?.getConnectedClientCount() === 0) {
            this.currentChannelId = null;
            this.events.onFigmaDisconnected?.();
          }
          this.emitStatus();
        },
        onChannelJoined: (channelId, clientId) => {
          logger.info(`Channel joined: ${channelId} by ${clientId}`);
          this.currentChannelId = channelId;
          this.events.onFigmaConnected?.(channelId);
          this.emitStatus();
        },
        onProgressUpdate: (update) => {
          this.events.onProgressUpdate?.(update);
        },
      });

      await this.wsServer.start();
      logger.info('WebSocket server started');
      this.emitStatus();

      // Create and start MCP server
      this.mcpServer = new McpSseServer();
      
      // Wire up WebSocket server for Figma command forwarding
      this.mcpServer.setWebSocketServer(this.wsServer);

      await this.mcpServer.start();
      logger.info('MCP SSE server started');
      this.emitStatus();

      logger.info('All servers started successfully');

    } catch (error) {
      const err = error as Error;
      logger.error('Failed to start servers:', { error: err.message });
      this.lastError = err.message;
      
      // Cleanup on failure
      await this.cleanup();
      throw error;
    } finally {
      this.operationInProgress = false;
      this.emitStatus();
    }
  }

  /**
   * Stop all servers
   */
  async stop(): Promise<void> {
    if (this.operationInProgress) {
      throw new Error('Operation already in progress');
    }

    logger.info('Stopping all servers...');
    this.operationInProgress = true;
    this.emitStatus();

    try {
      await this.cleanup();
      logger.info('All servers stopped');
    } catch (error) {
      const err = error as Error;
      logger.error('Error stopping servers:', { error: err.message });
      this.lastError = err.message;
      throw error;
    } finally {
      this.operationInProgress = false;
      this.emitStatus();
    }
  }

  /**
   * Restart all servers
   */
  async restart(): Promise<void> {
    logger.info('Restarting servers...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    await this.start();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Graceful shutdown initiated');
    
    try {
      await this.cleanup();
      await cleanupPorts();
    } catch (error) {
      logger.error('Error during shutdown:', { error });
    }
  }

  /**
   * Handle MCP tool call by forwarding to Figma plugin
   */
  private async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.wsServer) {
      throw new Error('WebSocket server not running');
    }

    if (!this.currentChannelId) {
      throw new Error('No Figma plugin connected');
    }

    logger.info(`Forwarding tool call to Figma: ${toolName}`, { args });

    try {
      const result = await this.wsServer.sendCommandToFigma(this.currentChannelId, {
        action: toolName,
        params: args,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      logger.error(`Tool call failed: ${toolName}`, { error: err.message });
      throw error;
    }
  }

  /**
   * Cleanup servers
   */
  private async cleanup(): Promise<void> {
    if (this.mcpServer) {
      await this.mcpServer.stop();
      this.mcpServer = null;
    }

    if (this.wsServer) {
      await this.wsServer.stop();
      this.wsServer = null;
    }

    this.currentChannelId = null;
  }

  /**
   * Get current server status
   */
  getStatus(): ServerState {
    return {
      websocket: {
        status: this.wsServer ? 'running' : 'stopped',
        port: 3055,
        connectedClients: this.wsServer?.getConnectedClientCount() ?? 0,
      },
      mcp: {
        status: this.mcpServer ? 'running' : 'stopped',
        port: 3056,
      },
      operationInProgress: this.operationInProgress,
      lastError: this.lastError,
    };
  }

  /**
   * Emit status change event
   */
  private emitStatus(): void {
    this.events.onStatusChanged?.(this.getStatus());
  }

  /**
   * Get active channel ID
   */
  getActiveChannelId(): string | null {
    return this.currentChannelId;
  }

  /**
   * Check if Figma is connected
   */
  isFigmaConnected(): boolean {
    return this.currentChannelId !== null && 
           this.wsServer?.isChannelActive(this.currentChannelId) === true;
  }

  /**
   * Broadcast event to all MCP clients
   */
  broadcastToMcpClients(event: string, data: unknown): void {
    this.mcpServer?.broadcast(event, data);
  }
}
