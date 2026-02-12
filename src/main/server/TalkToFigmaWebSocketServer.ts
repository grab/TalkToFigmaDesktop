/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { createLogger } from '../utils/logger';
import WebSocket, { WebSocketServer } from 'ws';
import { trackMCPToolCall, trackFigmaConnection } from '../analytics';
import { isRestApiTool } from '../../shared/constants';

const logger = createLogger('WebSocket');

interface ClientInfo {
  type: 'mcp' | 'figma' | 'unknown';
  connectedAt: number;
  channels: Set<string>;
}

export interface ServerStatus {
  running: boolean;
  port: number;
  uptime?: number;
  error?: string;
  channelCount?: number;
  clientCount?: number;
  mcpClientCount?: number; // Number of MCP clients (stdio servers)
  figmaClientCount?: number; // Number of Figma plugin clients
  // MCP Server specific fields (for SSE server compatibility)
  clientReady?: boolean;
  clientReadyDuration?: number;
  activeConnections?: number;
}

/**
 * WebSocket Server for Figma Plugin Communication
 * Manages channel-based communication between MCP server and Figma plugin
 */
export class TalkToFigmaWebSocketServer {
  private wss: WebSocketServer | null = null;
  private channels: Map<string, Set<WebSocket>> = new Map();
  private clients: Map<WebSocket, ClientInfo> = new Map(); // Track client information
  private logs: string[] = [];
  private startTime = 0;
  private port = 3055;
  private onStatusChangeCallback: (() => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toolMap: Map<string, any> = new Map();
  private servicesInitialized = false;
  // Track pending requests for analytics (request ID -> command name)
  private pendingRequests: Map<string, { command: string; timestamp: number }> = new Map();

  /**
   * Set callback to be called when client count changes
   */
  setOnStatusChange(callback: () => void): void {
    this.onStatusChangeCallback = callback;
  }

  /**
   * Notify status change
   */
  private notifyStatusChange(): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback();
    }
  }

  /**
   * Start the WebSocket server
   * @param port - Port number to listen on (default: 3055)
   */
  async start(port = 3055): Promise<void> {
    if (this.wss) {
      throw new Error('WebSocket server is already running');
    }

    this.port = port;
    this.startTime = Date.now();

    // Initialize tool services first
    await this.initializeToolServices();

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port,
          host: '127.0.0.1'
        });

        this.wss.on('listening', () => {
          this.addLog('INFO', `WebSocket server started on ws://127.0.0.1:${port}`);
          resolve();
        });

        this.wss.on('error', (error: Error & { code?: string }) => {
          this.addLog('ERROR', `Server error: ${error.message}`);
          logger.error('[TalkToFigma WS] ❌ Server error:', error);
          
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use`));
          } else {
            reject(error);
          }
        });

        this.wss.on('connection', (ws: WebSocket) => {
          this.handleConnection(ws);
        });
      } catch (error) {
        this.addLog('ERROR', `Failed to start server: ${error}`);
        logger.error('[TalkToFigma WS] Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.wss) {
      logger.warn('[TalkToFigma WS] Server is not running');
      return;
    }

    return new Promise((resolve) => {
      this.addLog('INFO', 'Stopping WebSocket server...');
      
      // Set a timeout to force resolve if server doesn't close gracefully
      const forceCloseTimeout = setTimeout(() => {
        logger.warn('[TalkToFigma WS] Server close timeout, forcing shutdown');
        this.wss = null;
        this.addLog('WARN', 'WebSocket server force stopped after timeout');
        resolve();
      }, 3000); // 3 second timeout
      
      // Close all client connections
      this.channels.forEach((clients) => {
        clients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Server shutting down');
          }
        });
      });

      // Clear channels
      this.channels.clear();

      // Close the server
      this.wss!.close(() => {
        clearTimeout(forceCloseTimeout);
        this.wss = null;
        this.addLog('INFO', 'WebSocket server stopped');
        resolve();
      });
    });
  }

  /**
   * Get server status
   */
  getStatus(): ServerStatus {
    if (!this.wss) {
      return {
        running: false,
        port: this.port,
      };
    }

    const uptime = Date.now() - this.startTime;

    // Count clients by type
    let mcpClientCount = 0;
    let figmaClientCount = 0;
    let unknownCount = 0;

    this.clients.forEach((info) => {
      if (info.type === 'mcp') {
        mcpClientCount++;
      } else if (info.type === 'figma') {
        figmaClientCount++;
      } else {
        unknownCount++;
      }
    });

    const totalClientCount = mcpClientCount + figmaClientCount + unknownCount;

    return {
      running: true,
      port: this.port,
      uptime,
      channelCount: this.channels.size,
      clientCount: totalClientCount,
      mcpClientCount,
      figmaClientCount,
    };
  }

  /**
   * Get server logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get all active channel names
   */
  getActiveChannels(): Set<string> {
    return new Set(this.channels.keys());
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    this.addLog('INFO', 'New client connected');

    // Initialize client info (type will be determined when joining)
    this.clients.set(ws, {
      type: 'unknown',
      connectedAt: Date.now(),
      channels: new Set(),
    });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'system',
      message: 'Please join a channel to start chatting',
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      this.addLog('ERROR', `Client error: ${error.message}`);
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message = data.toString();
      this.addLog('DEBUG', `Received message: ${message.substring(0, 100)}`);

      const parsed = JSON.parse(message);

      if (parsed.type === 'join') {
        this.handleJoin(ws, parsed);
      } else if (parsed.type === 'message') {
        this.handleBroadcast(ws, parsed);
      } else if (parsed.type === 'progress_update') {
        this.handleProgressUpdate(ws, parsed);
      } else {
        this.addLog('WARN', `Unknown message type: ${parsed.type}`);
      }
    } catch (error) {
      this.addLog('ERROR', `Error handling message: ${error}`);

      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  /**
   * Handle channel join request
   */
  private handleJoin(ws: WebSocket, data: any): void {
    const channelName = data.channel;
    const id = data.id;
    const clientType = data.clientType || 'mcp'; // Default to 'mcp' if not specified

    if (!channelName || typeof channelName !== 'string') {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Channel name is required',
      });
      return;
    }

    // Update client info with type and channel
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      clientInfo.type = clientType;
      clientInfo.channels.add(channelName);
    }

    // Create channel if it doesn't exist
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
      this.addLog('INFO', `Created channel: ${channelName}`);
    }

    // Add client to channel
    const channelClients = this.channels.get(channelName)!;
    channelClients.add(ws);

    this.addLog('INFO', `Client (${clientType}) joined channel: ${channelName} (${channelClients.size} clients)`);

    // Track Figma plugin connection
    if (clientType === 'figma') {
      trackFigmaConnection(true, channelName);
    }

    // Notify status change (client count changed)
    this.notifyStatusChange();

    // Notify client they joined successfully
    this.sendToClient(ws, {
      type: 'system',
      message: `Joined channel: ${channelName}`,
      channel: channelName,
    });

    // Send connection confirmation (always, even without ID for compatibility)
    const responsePayload: any = {
      result: `Connected to channel: ${channelName}`,
    };
    if (id) {
      responsePayload.id = id;
    }

    this.sendToClient(ws, {
      type: 'system',
      message: responsePayload,
      channel: channelName,
    });

    // Notify other clients in channel
    this.broadcastToChannel(channelName, {
      type: 'system',
      message: 'A new user has joined the channel',
      channel: channelName,
    }, ws);
  }

  /**
   * Handle message broadcast to channel
   */
  private handleBroadcast(ws: WebSocket, data: any): void {
    const channelName = data.channel;
    const messageContent = data.message;
    const command = messageContent?.command;
    const requestId = data.id || messageContent?.id;

    // Store pending request for analytics tracking (when command is present)
    if (command && typeof command === 'string' && requestId) {
      this.pendingRequests.set(requestId, { command, timestamp: Date.now() });
      // Clean up old pending requests (older than 5 minutes)
      this.cleanupPendingRequests();
    }

    // Handle server-side commands (don't forward to Figma)
    if (command === 'get_active_channels') {
      this.handleGetActiveChannels(ws, data);
      return;
    }

    if (command === 'connection_diagnostics') {
      this.handleConnectionDiagnostics(ws, data);
      return;
    }

    // Handle REST API tools locally (require Electron APIs)
    if (command && isRestApiTool(command)) {
      this.handleRestApiTool(ws, data, command, messageContent?.params || {});
      return;
    }

    // Regular message handling (forward to Figma)
    if (!channelName || typeof channelName !== 'string') {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Channel name is required',
      });
      return;
    }

    const channelClients = this.channels.get(channelName);
    if (!channelClients || !channelClients.has(ws)) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'You must join the channel first',
      });
      return;
    }

    this.addLog('DEBUG', `Broadcasting message to channel: ${channelName}`);

    // Check if this is a response message (has id in message)
    // If so, preserve the original structure for MCP server compatibility
    const isResponseMessage = messageContent && (
      messageContent.id !== undefined ||
      messageContent.result !== undefined ||
      messageContent.error !== undefined
    );

    if (isResponseMessage) {
      // Track MCP tool call result based on response content
      const responseId = messageContent.id || data.id;
      if (responseId) {
        const pendingRequest = this.pendingRequests.get(responseId);
        if (pendingRequest) {
          const hasError = messageContent.error !== undefined;
          const resultType = this.getResultType(messageContent.result);
          trackMCPToolCall(
            pendingRequest.command,
            !hasError,
            hasError ? String(messageContent.error) : undefined,
            hasError ? undefined : resultType
          );
          this.pendingRequests.delete(responseId);
        }
      }

      // Preserve original message structure for MCP server
      // MCP server expects: { type: 'message', message: { id, result/error }, channel, id }
      this.broadcastToChannel(channelName, {
        type: 'message',
        id: data.id,
        channel: channelName,
        message: messageContent,
      });
    } else {
      // Regular broadcast message
      this.broadcastToChannel(channelName, {
        type: 'broadcast',
        message: messageContent,
        sender: 'User',
        channel: channelName,
      });
    }
  }

  /**
   * Handle get_active_channels command (server-side)
   */
  private handleGetActiveChannels(ws: WebSocket, data: any): void {
    try {
      const channels = this.getActiveChannels();
      const channelList = Array.from(channels).sort().join(', ');
      const result = channels.size === 0
        ? 'No active channels found. Make sure Figma plugin is running and connected.'
        : `Active channels (${channels.size}): ${channelList}`;

      // Track successful command
      trackMCPToolCall('get_active_channels', true, undefined, 'string');

      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          result: result,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      trackMCPToolCall('get_active_channels', false, errorMessage);

      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          error: `Failed to get active channels: ${error}`,
        },
      });
    }
  }

  /**
   * Handle connection_diagnostics command (server-side)
   */
  private handleConnectionDiagnostics(ws: WebSocket, data: any): void {
    try {
      const channels = this.getActiveChannels();
      const status = this.getStatus();

      const diagnostics = {
        webSocketServer: {
          status: 'running',
          port: this.port,
          uptime: status.uptime,
          activeChannels: Array.from(channels).sort(),
          channelCount: channels.size,
          clientCount: status.clientCount,
          mcpClientCount: status.mcpClientCount,
          figmaClientCount: status.figmaClientCount,
        },
        figmaPlugin: {
          connected: channels.size > 0,
          message: channels.size > 0
            ? 'Figma plugin is connected and ready'
            : 'No Figma plugin connected. Open TalkToFigma plugin in Figma.',
        },
      };

      // Track successful command
      trackMCPToolCall('connection_diagnostics', true, undefined, 'object');

      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          result: diagnostics,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      trackMCPToolCall('connection_diagnostics', false, errorMessage);

      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          error: `Failed to run diagnostics: ${error}`,
        },
      });
    }
  }

  /**
   * Handle progress update message
   */
  private handleProgressUpdate(ws: WebSocket, data: any): void {
    const channelName = data.channel;

    if (!channelName) {
      return;
    }

    const channelClients = this.channels.get(channelName);
    if (!channelClients || !channelClients.has(ws)) {
      return;
    }

    this.addLog('DEBUG', `Progress update in channel: ${channelName}`);

    // Broadcast progress update to all clients in the channel
    this.broadcastToChannel(channelName, {
      type: 'progress_update',
      progress: data.progress,
      message: data.message,
      channel: channelName,
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    const clientInfo = this.clients.get(ws);
    const clientType = clientInfo?.type || 'unknown';

    this.addLog('INFO', `Client (${clientType}) disconnected`);

    // Track Figma plugin disconnection
    if (clientType === 'figma') {
      trackFigmaConnection(false);
    }

    // Remove client from tracking
    this.clients.delete(ws);

    // Notify status change (client count changed)
    this.notifyStatusChange();

    // Remove client from all channels
    this.channels.forEach((clients, channelName) => {
      if (clients.has(ws)) {
        clients.delete(ws);

        this.addLog('INFO', `Client removed from channel: ${channelName}`);

        // Notify other clients in channel
        this.broadcastToChannel(channelName, {
          type: 'system',
          message: 'A user has left the channel',
          channel: channelName,
        });

        // Clean up empty channels
        if (clients.size === 0) {
          this.channels.delete(channelName);
          this.addLog('INFO', `Channel deleted: ${channelName}`);
        }
      }
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients in a channel
   */
  private broadcastToChannel(channelName: string, message: any, exclude?: WebSocket): void {
    const clients = this.channels.get(channelName);
    if (!clients) return;

    clients.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Add log entry
   */
  private addLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    this.logs.push(logEntry);

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // Log to console logger (single source of truth for logging)
    // Note: logger already has [WebSocket] source prefix, so we don't add extra prefix
    const logLevel = level.toLowerCase();
    if (logLevel === 'info') {
      logger.info(message);
    } else if (logLevel === 'warn') {
      logger.warn(message);
    } else if (logLevel === 'error') {
      logger.error(message);
    } else if (logLevel === 'debug') {
      logger.debug(message);
    }
  }

  /**
   * Initialize services for REST API tool handling
   * Sets up service handlers that can process REST API tools locally
   */
  private async initializeToolServices(): Promise<void> {
    if (this.servicesInitialized) return;

    try {
      // Dynamic import to avoid circular dependency
      const { restApiService } = await import('./services/rest-api-service');

      // Initialize service (no dependencies needed for REST API service)
      restApiService.initialize(null, null);

      // Build tool map for quick lookup
      const tools = restApiService.getTools();
      for (const tool of tools) {
        this.toolMap.set(tool.name, tool);
      }

      this.servicesInitialized = true;
      this.addLog('INFO', `Initialized ${this.toolMap.size} REST API tool handlers`);
    } catch (error) {
      this.addLog('ERROR', `Failed to initialize tool services: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle REST API tool call
   */
  private async handleRestApiTool(ws: WebSocket, data: any, command: string, params: Record<string, unknown>): Promise<void> {
    const tool = this.toolMap.get(command);
    if (!tool) {
      trackMCPToolCall(command, false, 'Tool not found');
      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          error: `REST API tool ${command} not found`,
        },
      });
      return;
    }

    try {
      this.addLog('INFO', `Handling REST API tool locally: ${command}`);
      const result = await tool.handler(params || {});

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

      // Track successful REST API tool call
      trackMCPToolCall(command, true, undefined, this.getResultType(responseData));

      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          result: responseData,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `REST API tool ${command} failed: ${errorMessage}`);

      // Track failed REST API tool call
      trackMCPToolCall(command, false, errorMessage);

      this.sendToClient(ws, {
        type: 'message',
        id: data.id,
        message: {
          id: data.message?.id,
          error: errorMessage,
        },
      });
    }
  }

  /**
   * Clean up old pending requests (older than 5 minutes)
   */
  private cleanupPendingRequests(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, request] of this.pendingRequests) {
      if (request.timestamp < fiveMinutesAgo) {
        this.pendingRequests.delete(id);
      }
    }
  }

  /**
   * Get the result type for analytics tracking
   */
  private getResultType(result: unknown): string {
    if (result === null || result === undefined) {
      return 'null';
    }
    if (Array.isArray(result)) {
      return 'array';
    }
    if (typeof result === 'object') {
      // Check for common Figma node types
      const obj = result as Record<string, unknown>;
      if (obj.type && typeof obj.type === 'string') {
        return obj.type;
      }
      if (obj.id && typeof obj.id === 'string') {
        return 'node';
      }
      return 'object';
    }
    return typeof result;
  }
}

