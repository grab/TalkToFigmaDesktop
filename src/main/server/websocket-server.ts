import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../utils/logger';
import { PORTS, isRestApiTool } from '../../shared/constants';
import type { WebSocketMessage, Channel, ProgressUpdate } from '../../shared/types';

const logger = createLogger('WebSocket');

export interface FigmaWebSocketServerEvents {
  onClientConnected: (clientId: string) => void;
  onClientDisconnected: (clientId: string) => void;
  onChannelJoined: (channelId: string, clientId: string) => void;
  onMessageReceived: (channelId: string, message: unknown) => void;
  onProgressUpdate: (update: ProgressUpdate) => void;
}

export class FigmaWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private channels: Map<string, Channel> = new Map();
  private events: Partial<FigmaWebSocketServerEvents> = {};
  private clientIdCounter = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toolMap: Map<string, any> = new Map();
  private servicesInitialized = false;

  constructor(events?: Partial<FigmaWebSocketServerEvents>) {
    this.events = events || {};
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.wss) {
      logger.warn('WebSocket server is already running');
      return;
    }

    // Initialize services for REST API tool handling
    await this.initializeToolServices();

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ 
          port: PORTS.WEBSOCKET,
          host: '127.0.0.1',
        });

        this.wss.on('listening', () => {
          logger.info(`WebSocket server started on port ${PORTS.WEBSOCKET}`);
          resolve();
        });

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error:', { error: error.message });
          reject(error);
        });

        this.wss.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

      } catch (error) {
        logger.error('Failed to start WebSocket server:', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.wss) {
      logger.warn('WebSocket server is not running');
      return;
    }

    return new Promise((resolve) => {
      // Close all client connections
      for (const [clientId, ws] of this.clients) {
        ws.close(1000, 'Server shutting down');
        logger.debug(`Closed connection to client ${clientId}`);
      }

      this.clients.clear();
      this.channels.clear();

      this.wss!.close(() => {
        logger.info('WebSocket server stopped');
        this.wss = null;
        resolve();
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: { socket: { remoteAddress?: string } }): void {
    const clientId = `client_${++this.clientIdCounter}`;
    this.clients.set(clientId, ws);
    
    logger.info(`Client connected: ${clientId} from ${req.socket.remoteAddress}`);
    this.events.onClientConnected?.(clientId);

    ws.on('message', (data) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        // Normalize field names: websocket-client sends 'channel' and 'message',
        // but WebSocketMessage expects 'channelId' and 'data'
        const message: WebSocketMessage = {
          ...rawMessage,
          channelId: rawMessage.channelId || rawMessage.channel,
          data: rawMessage.data || rawMessage.message,
        };
        this.handleMessage(clientId, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', { error, clientId });
      }
    });

    ws.on('close', (code, reason) => {
      logger.info(`Client disconnected: ${clientId}, code: ${code}, reason: ${reason.toString()}`);
      this.removeClientFromAllChannels(clientId);
      this.clients.delete(clientId);
      this.events.onClientDisconnected?.(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`Client ${clientId} error:`, { error: error.message });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(clientId: string, message: WebSocketMessage): void {
    logger.debug(`Message from ${clientId}:`, { type: message.type, channelId: message.channelId });

    switch (message.type) {
      case 'join':
        this.handleJoin(clientId, message.channelId!);
        break;
      
      case 'leave':
        this.handleLeave(clientId, message.channelId!);
        break;
      
      case 'message':
        this.handleChannelMessage(clientId, message.channelId!, message.data);
        break;
      
      case 'progress_update':
        this.handleProgressUpdate(message.data as ProgressUpdate);
        break;
      
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle channel join request
   */
  private handleJoin(clientId: string, channelId: string): void {
    let channel = this.channels.get(channelId);
    
    if (!channel) {
      channel = {
        id: channelId,
        clients: new Set(),
        createdAt: new Date(),
      };
      this.channels.set(channelId, channel);
      logger.info(`Channel created: ${channelId}`);
    }

    channel.clients.add(clientId);
    logger.info(`Client ${clientId} joined channel ${channelId}`);
    
    this.events.onChannelJoined?.(channelId, clientId);
    
    // Send join confirmation
    this.sendToClient(clientId, {
      type: 'join_ack',
      channelId,
      data: { success: true },
    });
  }

  /**
   * Handle channel leave request
   */
  private handleLeave(clientId: string, channelId: string): void {
    const channel = this.channels.get(channelId);
    
    if (channel) {
      channel.clients.delete(clientId);
      logger.info(`Client ${clientId} left channel ${channelId}`);
      
      // Clean up empty channels
      if (channel.clients.size === 0) {
        this.channels.delete(channelId);
        logger.info(`Channel ${channelId} deleted (empty)`);
      }
    }
  }

  /**
   * Handle message broadcast to channel
   * Routes REST API tools to service handlers, others to Figma plugin
   */
  private async handleChannelMessage(clientId: string, channelId: string, data: unknown): Promise<void> {
    const channel = this.channels.get(channelId);

    if (!channel) {
      logger.warn(`Channel ${channelId} not found`);
      return;
    }

    this.events.onMessageReceived?.(channelId, data);

    // Parse command from message
    const message = data as { id?: string; command?: string; params?: Record<string, unknown> };
    const { id: requestId, command, params } = message;

    // Debug logging for REST API tool routing
    logger.debug(`Processing command: ${command}, toolMap size: ${this.toolMap.size}, isRestApiTool: ${command ? isRestApiTool(command) : false}`);

    // Check if this is a REST API tool that should be handled locally
    if (command && requestId && isRestApiTool(command)) {
      const tool = this.toolMap.get(command);
      if (tool) {
        logger.info(`Handling REST API tool locally: ${command}`);
        try {
          const result = await tool.handler(params || {});
          this.sendCommandResponse(clientId, channelId, requestId, result);
        } catch (error) {
          logger.error(`REST API tool ${command} failed:`, { error });
          this.sendCommandError(clientId, channelId, requestId, error);
        }
        return;
      } else {
        logger.warn(`REST API tool ${command} not found in toolMap. Available tools: ${Array.from(this.toolMap.keys()).join(', ')}`);
      }
    }

    // Broadcast to all other clients in channel (Figma plugin)
    for (const targetClientId of channel.clients) {
      if (targetClientId !== clientId) {
        this.sendToClient(targetClientId, {
          type: 'message',
          channelId,
          data,
        });
      }
    }
  }

  /**
   * Handle progress update from Figma plugin
   */
  private handleProgressUpdate(update: ProgressUpdate): void {
    logger.debug('Progress update:', { requestId: update.requestId, progress: update.progress });
    this.events.onProgressUpdate?.(update);
  }

  /**
   * Remove client from all channels
   */
  private removeClientFromAllChannels(clientId: string): void {
    for (const [channelId, channel] of this.channels) {
      if (channel.clients.has(clientId)) {
        channel.clients.delete(clientId);
        
        if (channel.clients.size === 0) {
          this.channels.delete(channelId);
          logger.info(`Channel ${channelId} deleted (empty)`);
        }
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: Record<string, unknown>): boolean {
    const ws = this.clients.get(clientId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send to client ${clientId}: not connected`);
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Failed to send to client ${clientId}:`, { error });
      return false;
    }
  }

  /**
   * Broadcast message to all clients in a channel
   */
  broadcastToChannel(channelId: string, message: Record<string, unknown>): number {
    const channel = this.channels.get(channelId);
    
    if (!channel) {
      logger.warn(`Channel ${channelId} not found`);
      return 0;
    }

    let sentCount = 0;
    for (const clientId of channel.clients) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Send command to Figma plugin and wait for response
   */
  async sendCommandToFigma(channelId: string, command: Record<string, unknown>, timeoutMs = 30000): Promise<unknown> {
    const channel = this.channels.get(channelId);
    
    if (!channel || channel.clients.size === 0) {
      throw new Error(`No Figma plugin connected on channel ${channelId}`);
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store pending request handler
      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.requestId === requestId) {
            clearTimeout(timeout);
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.data);
            }
          }
        } catch {
          // Ignore parse errors for other messages
        }
      };

      // Get first client in channel (Figma plugin)
      const clientId = Array.from(channel.clients)[0];
      const ws = this.clients.get(clientId);
      
      if (!ws) {
        clearTimeout(timeout);
        reject(new Error('Figma plugin connection lost'));
        return;
      }

      ws.on('message', messageHandler);

      // Send command
      this.sendToClient(clientId, {
        type: 'command',
        requestId,
        channelId,
        ...command,
      });
    });
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Get connected client count
   */
  getConnectedClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if Figma plugin is connected to a channel
   */
  isChannelActive(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    return !!channel && channel.clients.size > 0;
  }

  /**
   * Send command to Figma using first available channel
   * This is the main entry point for MCP services
   */
  async sendCommand(command: string, params: Record<string, unknown>): Promise<unknown> {
    const channels = this.getActiveChannels();

    if (channels.length === 0) {
      throw new Error('No Figma plugin connected. Please open TalkToFigma plugin in Figma.');
    }

    // Use the first active channel
    const channelId = channels[0];

    return this.sendCommandToFigma(channelId, {
      command,
      params,
    });
  }

  /**
   * Initialize services for REST API tool handling
   * Sets up service handlers that can process REST API tools locally
   */
  private async initializeToolServices(): Promise<void> {
    if (this.servicesInitialized) return;

    try {
      // Dynamic import to avoid circular dependency
      const { initializeServices, getAllTools } = await import('./services');

      // figmaCommandSender to forward Figma plugin commands
      const figmaCommandSender = async (command: string, params: Record<string, unknown>) => {
        return this.sendCommand(command, params);
      };

      // Initialize services with this WebSocket server and command sender
      initializeServices(this, figmaCommandSender);

      // Build tool map for quick lookup
      const tools = getAllTools();
      for (const tool of tools) {
        this.toolMap.set(tool.name, tool);
      }

      this.servicesInitialized = true;
      logger.info(`Initialized ${this.toolMap.size} tool handlers for REST API routing`);
    } catch (error) {
      logger.error('Failed to initialize tool services:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Send command response back to requesting client
   * Converts MCP CallToolResult format to WebSocket response format
   */
  private sendCommandResponse(
    clientId: string,
    channelId: string,
    requestId: string,
    result: { content?: Array<{ type: string; text: string }>; isError?: boolean }
  ): void {
    // Extract result from MCP CallToolResult format
    let responseData: unknown;
    if (result.content && result.content[0]?.text) {
      try {
        responseData = JSON.parse(result.content[0].text);
      } catch {
        responseData = result.content[0].text;
      }
    } else {
      responseData = result;
    }

    this.sendToClient(clientId, {
      type: 'message',
      channelId,
      message: {
        id: requestId,
        result: responseData,
      },
    });
  }

  /**
   * Send command error back to requesting client
   */
  private sendCommandError(
    clientId: string,
    channelId: string,
    requestId: string,
    error: unknown
  ): void {
    this.sendToClient(clientId, {
      type: 'message',
      channelId,
      message: {
        id: requestId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
