/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import http from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  InitializedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

import { allPrompts, promptContents } from './prompts';
import { allTools } from './tools';
import { ServerStatus } from './TalkToFigmaWebSocketServer';
import { isChannelNotRequired } from '../../shared/constants';

const logger = createLogger('MCP');

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  lastActivity: number;
}

export interface FigmaCommand {
  id: string;
  command: string;
  params: Record<string, unknown>;
}

export interface FigmaResponse {
  id: string;
  result?: unknown;
  error?: string;
}

/**
 * MCP Server for Cursor AI Integration
 * Provides Figma control tools via SSE (Server-Sent Events) transport
 *
 * @deprecated This SSE-based MCP server is deprecated in favor of stdio transport.
 * Use TalkToFigmaMcpServerStdio instead, which is spawned directly by MCP clients.
 * This SSE version is kept for backward compatibility but will be removed in a future version.
 */
export class TalkToFigmaMcpServer {
  private server: Server | null = null;
  private httpServer: http.Server | null = null;
  private wsClient: WebSocket | null = null;
  private currentChannel: string | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private logs: string[] = [];
  private startTime = 0;
  private port = 3056;
  private wsPort = 3055;
  private isConnected = false;
  private activeTransports: Map<string, SSEServerTransport> = new Map();
  private transportResponses: Map<string, http.ServerResponse> = new Map();
  private isClientReady = false;
  private clientReadyTime = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private isStopping = false;

  /**
   * Start the MCP server with SSE transport
   * @param port - HTTP port for SSE (default: 3056)
   * @param wsPort - WebSocket port to connect to (default: 3055)
   */
  async start(port = 3056, wsPort = 3055): Promise<void> {
    if (this.httpServer) {
      throw new Error('MCP server is already running');
    }

    this.port = port;
    this.wsPort = wsPort;
    this.startTime = Date.now();
    this.isStopping = false; // Reset stopping flag when starting

    // Create MCP server instance
    this.server = new Server(
      {
        name: 'TalkToFigmaDesktop',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    // Setup MCP tools
    this.setupMcpServer();

    // Connect to Figma WebSocket server
    try {
      await this.connectToFigma();
    } catch (error) {
      this.addLog('WARN', `Could not connect to Figma initially: ${error}`);
      this.addLog('WARN', 'Will try to connect when the first command is sent');
    }

    // Start HTTP server with SSE endpoint
    await this.startHttpServer(port);
    
    // Start heartbeat mechanism
    this.startHeartbeat();
    
    this.addLog('INFO', `✅ MCP Server started on port ${port}`);
    logger.info(`[TalkToFigma MCP] ✅ Server ready: ${allTools.length} tools, ${allPrompts.length} prompts`);
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    // Set stopping flag to prevent reconnection attempts
    this.isStopping = true;

    this.isClientReady = false;
    this.clientReadyTime = 0;

    // Stop heartbeat mechanism
    this.stopHeartbeat();

    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutting down'));
    });
    this.pendingRequests.clear();

    return new Promise((resolve) => {
      // Set a timeout to force resolve if server doesn't close gracefully
      const forceCloseTimeout = setTimeout(() => {
        logger.warn('[TalkToFigma MCP] Server close timeout, forcing shutdown');
        this.httpServer = null;
        this.server = null;
        // Note: isStopping flag is NOT reset here to prevent reconnection attempts
        resolve();
      }, 3000); // 3 second timeout

      // Try to close all connections first (Node.js 18+)
      if (typeof this.httpServer!.closeAllConnections === 'function') {
        this.httpServer!.closeAllConnections();
      }

      this.httpServer!.close(() => {
        clearTimeout(forceCloseTimeout);
        this.httpServer = null;
        this.server = null;
        // Note: isStopping flag is NOT reset here to prevent reconnection attempts
        // It will be reset when start() is called again (line 76)
        logger.info('[TalkToFigma MCP] Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get server status
   */
  getStatus(): ServerStatus {
    if (!this.httpServer) {
      return {
        running: false,
        port: this.port,
        clientReady: false,
      };
    }

    const uptime = Date.now() - this.startTime;
    const clientReadyDuration = this.isClientReady && this.clientReadyTime > 0
      ? Date.now() - this.clientReadyTime
      : 0;

    return {
      running: true,
      port: this.port,
      uptime,
      clientReady: this.isClientReady,
      clientReadyDuration,
      activeConnections: this.activeTransports.size,
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
   * Start HTTP server for SSE transport
   * Following official MCP TypeScript SDK guide:
   * https://github.com/modelcontextprotocol/typescript-sdk
   */
  private async startHttpServer(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        // Enable CORS for all requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        // GET /sse - Create SSE stream (official SDK pattern)
        if (req.url === '/sse' && req.method === 'GET') {
          try {
            const transport = new SSEServerTransport('/message', res);
            const transportWithSession = transport as SSEServerTransport & { sessionId?: string };
            const sessionId = transportWithSession.sessionId || 'unknown';
            
            this.activeTransports.set(sessionId, transport);
            this.transportResponses.set(sessionId, res);
            logger.info(`[TalkToFigma MCP] 📡 SSE connected (${this.activeTransports.size} active)`);
            
            res.on('close', () => {
              this.activeTransports.delete(sessionId);
              this.transportResponses.delete(sessionId);
              logger.info(`[TalkToFigma MCP] SSE disconnected (${this.activeTransports.size} active)`);
              
              if (this.activeTransports.size === 0) {
                this.isClientReady = false;
                this.clientReadyTime = 0;
                logger.info('[TalkToFigma MCP] ⚠️ All clients disconnected');
              }
            });
            
            await this.server!.connect(transport);
          } catch (error) {
            logger.error('[TalkToFigma MCP] ❌ SSE connection failed:', error);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end('Error creating SSE transport');
            }
          }
        }
        // POST /message - Handle MCP requests (official SDK pattern)
        else if (req.url?.startsWith('/message') && req.method === 'POST') {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const sessionId = url.searchParams.get('sessionId');
          
          if (!sessionId) {
            res.writeHead(400);
            res.end('Missing sessionId parameter');
            return;
          }
          
          const transport = this.activeTransports.get(sessionId);
          if (!transport) {
            logger.error(`[TalkToFigma MCP] ❌ Invalid session: ${sessionId}`);
            res.writeHead(404);
            res.end('Session not found');
            return;
          }
          
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const parsedBody = JSON.parse(body) as { method?: string; id?: string; params?: unknown };
              
              const transportWithHandler = transport as SSEServerTransport & { 
                handlePostMessage: (req: http.IncomingMessage, res: http.ServerResponse, body: unknown) => Promise<void> 
              };
              await transportWithHandler.handlePostMessage(req, res, parsedBody);
            } catch (error) {
              logger.error('[TalkToFigma MCP] ❌ Message processing error:', error);
              if (!res.headersSent) {
                res.writeHead(500);
                res.end('Error processing message');
              }
            }
          });
        }
        // POST /sse - Non-standard
        else if (req.url === '/sse' && req.method === 'POST') {
          logger.warn('[TalkToFigma MCP] ⚠️ Invalid POST /sse request');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Invalid request',
            message: 'Use GET /sse to establish SSE connection, then POST /message?sessionId=xxx for requests'
          }));
        }
        // Default response
        else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('MCP Server running. Use GET /sse to establish connection, then POST /message?sessionId=xxx for requests.');
        }
      });

      this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
        logger.error('[TalkToFigma MCP] HTTP server error:', error);
        
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(error);
        }
      });

      this.httpServer.listen(port, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  /**
   * Setup MCP server with Figma tools and prompts
   *
   * Manually synced from: https://github.com/grab/cursor-talk-to-figma-mcp
   * Total tools: 40
   * Total prompts: 5
   */
  private setupMcpServer(): void {
    if (!this.server) {
      logger.error('[TalkToFigma MCP] Cannot setup MCP server - server instance is null');
      return;
    }

    // Initialize handler
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      logger.info(`[TalkToFigma MCP] 🚀 Client connected: ${request.params.clientInfo?.name || 'unknown'}`);
      
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          prompts: {},
        },
        serverInfo: {
          name: 'TalkToFigmaDesktop',
          version: '1.0.0',
        },
      };
    });

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info(`[TalkToFigma MCP] 📋 ListTools request (${allTools.length} tools)`);
      return { tools: allTools };
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params as { name: string; arguments: Record<string, unknown> };

        try {
          logger.info(`[TalkToFigma MCP] 🔧 Tool: ${name}`);

          // Special handler for join_channel
          if (name === 'join_channel') {
            const { channel } = args as { channel: string };
            await this.joinChannel(channel);
            return {
              content: [{ type: 'text', text: `Successfully joined channel: ${channel}` }],
            };
          }

          // All other tools are passed directly to Figma
          const result = await this.sendCommandToFigma(name, args);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logger.error(`[TalkToFigma MCP] ❌ Tool failed: ${name}`, error);
          return {
            content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }
    );

    // Prompts list handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.info(`[TalkToFigma MCP] 📚 ListPrompts request (${allPrompts.length} prompts)`);
      return { prompts: allPrompts };
    });

    // Get specific prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;
      const prompt = promptContents[name];
      
      if (!prompt) {
        logger.warn(`[TalkToFigma MCP] Unknown prompt: ${name}`);
        return {
          messages: [],
          description: `Unknown prompt: ${name}`,
        };
      }

      return prompt;
    });

    // Initialized notification handler
    this.server.setNotificationHandler(InitializedNotificationSchema, async () => {
      this.isClientReady = true;
      this.clientReadyTime = Date.now();
      logger.info('[TalkToFigma MCP] ✅ Client ready - handshake completed');
    });
  }

  /**
   * Connect to Figma WebSocket server
   */
  private async connectToFigma(): Promise<void> {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `ws://127.0.0.1:${this.wsPort}`;

    return new Promise((resolve, reject) => {
      this.wsClient = new WebSocket(wsUrl);

      this.wsClient.on('open', () => {
        logger.info('[TalkToFigma MCP] 🔌 Figma connected');
        this.isConnected = true;
        this.currentChannel = null;
        resolve();
      });

      this.wsClient.on('message', (data: Buffer) => {
        this.handleWebSocketMessage(data);
      });

      this.wsClient.on('error', (error: Error) => {
        logger.error('[TalkToFigma MCP] WebSocket error:', error);
        reject(error);
      });

      this.wsClient.on('close', () => {
        logger.info('[TalkToFigma MCP] 🔌 Figma disconnected');
        this.isConnected = false;
        this.wsClient = null;

        this.pendingRequests.forEach((request, id) => {
          clearTimeout(request.timeout);
          request.reject(new Error('Connection closed'));
          this.pendingRequests.delete(id);
        });

        // Only attempt reconnection if server is not stopping
        if (!this.isStopping) {
          setTimeout(() => {
            // Double-check stopping flag before attempting reconnection
            if (!this.isStopping) {
              this.connectToFigma().catch(() => {
                // Silent retry - connection will be attempted again on next close if not stopping
              });
            }
          }, 2000);
        }
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleWebSocketMessage(data: Buffer): void {
    try {
      const json = JSON.parse(data.toString());
      
      logger.debug(`[TalkToFigma MCP] Received WebSocket message: ${JSON.stringify(json).substring(0, 200)}`);

      // Handle progress updates
      if (json.type === 'progress_update') {
        const progressData = json.message?.data;
        if (progressData) {
          const requestId = json.id;
          if (requestId && this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId)!;
            request.lastActivity = Date.now();

            clearTimeout(request.timeout);
            request.timeout = setTimeout(() => {
              if (this.pendingRequests.has(requestId)) {
                this.pendingRequests.delete(requestId);
                request.reject(new Error('Request to Figma timed out'));
              }
            }, 60000);
          }
        }
        return;
      }

      // Handle regular responses
      // Expected format: { type: 'message', message: { id, result/error }, channel, id }
      const response = json.message;
      if (response && response.id) {
        // Ignore request messages (those with 'command' field) - we only process responses
        if (response.command) {
          logger.debug(`[TalkToFigma MCP] Ignoring request message with command: ${response.command}`);
          return;
        }

        // Only process messages that have result or error (actual responses)
        if (response.result === undefined && response.error === undefined) {
          logger.debug(`[TalkToFigma MCP] Ignoring message without result or error: ${response.id}`);
          return;
        }

        if (this.pendingRequests.has(response.id)) {
          const request = this.pendingRequests.get(response.id)!;
          clearTimeout(request.timeout);

          if (response.error) {
            logger.error(`[TalkToFigma MCP] Figma error: ${response.error}`);
            request.reject(new Error(response.error));
          } else if (response.result !== undefined) {
            logger.debug(`[TalkToFigma MCP] Resolving request ${response.id} with result`);
            request.resolve(response.result);
          }

          this.pendingRequests.delete(response.id);
        } else {
          logger.debug(`[TalkToFigma MCP] Received response for unknown request: ${response.id}`);
        }
      } else {
        logger.debug(`[TalkToFigma MCP] Received message without valid response structure: ${JSON.stringify(json).substring(0, 200)}`);
      }
    } catch (error) {
      logger.error('[TalkToFigma MCP] Message parse error:', error);
    }
  }

  /**
   * Join a Figma channel
   */
  private async joinChannel(channelName: string): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      await this.connectToFigma();
    }

    await this.sendCommandToFigma('join', { channel: channelName });
    this.currentChannel = channelName;
    logger.info(`[TalkToFigma MCP] Channel joined: ${channelName}`);
  }

  /**
   * Send command to Figma via WebSocket
   */
  private async sendCommandToFigma(
    command: string,
    params: Record<string, unknown> = {},
    timeoutMs = 30000
  ): Promise<unknown> {
    // Check connection
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      await this.connectToFigma();
    }

    // Check channel requirement
    // REST API tools and channel management commands don't require a channel
    const requiresChannel = !isChannelNotRequired(command);
    if (requiresChannel && !this.currentChannel) {
      throw new Error('Must join a channel before sending commands');
    }

    const id = uuidv4();

    return new Promise((resolve, reject) => {
      const request = {
        id,
        type: command === 'join' ? 'join' : 'message',
        ...(command === 'join' ? { channel: params.channel } : { channel: this.currentChannel }),
        message: {
          id,
          command,
          params: {
            ...params,
            ...Object.fromEntries(
              Object.entries(params).filter(([_key, value]) => value !== undefined)
            ),
          },
        },
      };

      // Create timeout
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          this.addLog('ERROR', `Request ${id} timed out after ${timeoutMs / 1000} seconds`);
          reject(new Error('Request to Figma timed out'));
        }
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout,
        lastActivity: Date.now(),
      });

      // Send request
      this.addLog('INFO', `Sending command to Figma: ${command}`);
      this.wsClient!.send(JSON.stringify(request));
    });
  }

  /**
   * Start heartbeat mechanism to prevent SSE connection timeout
   * Sends periodic heartbeat signals to maintain the connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return; // Already started
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.activeTransports.size === 0) {
        return; // No active transports
      }

      // Send heartbeat to all active transports
      this.transportResponses.forEach((response, sessionId) => {
        try {
          if (response && !response.destroyed && !response.closed) {
            // Send SSE comment line for heartbeat (SSE spec: lines starting with ':' are comments)
            // This prevents the connection from timing out due to inactivity
            response.write(': heartbeat\n\n');
            logger.debug(`[TalkToFigma MCP] Heartbeat sent to session ${sessionId}`);
          } else {
            // Clean up invalid response
            this.transportResponses.delete(sessionId);
            this.activeTransports.delete(sessionId);
          }
        } catch (error) {
          logger.debug(`[TalkToFigma MCP] Failed to send heartbeat to session ${sessionId}:`, error);
          // Clean up on error
          this.transportResponses.delete(sessionId);
          this.activeTransports.delete(sessionId);
        }
      });
    }, this.HEARTBEAT_INTERVAL_MS);

    logger.info(`[TalkToFigma MCP] Heartbeat mechanism started (interval: ${this.HEARTBEAT_INTERVAL_MS}ms)`);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('[TalkToFigma MCP] Heartbeat mechanism stopped');
    }
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

    // Also log to console logger
    const logLevel = level.toLowerCase();
    if (logLevel === 'info') {
      logger.info(`[TalkToFigma MCP] ${message}`);
    } else if (logLevel === 'warn') {
      logger.warn(`[TalkToFigma MCP] ${message}`);
    } else if (logLevel === 'error') {
      logger.error(`[TalkToFigma MCP] ${message}`);
    } else if (logLevel === 'debug') {
      logger.debug(`[TalkToFigma MCP] ${message}`);
    }
  }

  /**
   * Helper: Filter Figma node data
   * Removes verbose properties and converts colors to hex
   */
  private filterFigmaNode(node: Record<string, unknown>): Record<string, unknown> | null {
    // Skip VECTOR type nodes
    if (node.type === "VECTOR") {
      return null;
    }

    const filtered: Record<string, unknown> = {
      id: node.id,
      name: node.name,
      type: node.type,
    };

    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      filtered.fills = (node.fills as Array<Record<string, unknown>>).map((fill) => {
        const processedFill = { ...fill };

        // Remove boundVariables and imageRef
        delete processedFill.boundVariables;
        delete processedFill.imageRef;

        // Process gradientStops if present
        if (processedFill.gradientStops && Array.isArray(processedFill.gradientStops)) {
          processedFill.gradientStops = (processedFill.gradientStops as Array<Record<string, unknown>>).map((stop) => {
            const processedStop: Record<string, unknown> = { ...stop };
            // Convert color to hex if present
            if (processedStop.color && typeof processedStop.color === 'object') {
              processedStop.color = this.rgbaToHex(processedStop.color as Record<string, unknown>);
            }
            // Remove boundVariables
            delete processedStop.boundVariables;
            return processedStop;
          });
        }

        // Convert solid fill colors to hex
        if (processedFill.color && typeof processedFill.color === 'object') {
          processedFill.color = this.rgbaToHex(processedFill.color as Record<string, unknown>);
        }

        return processedFill;
      });
    }

    if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
      filtered.strokes = (node.strokes as Array<Record<string, unknown>>).map((stroke) => {
        const processedStroke: Record<string, unknown> = { ...stroke };
        // Remove boundVariables
        delete processedStroke.boundVariables;
        // Convert color to hex if present
        if (processedStroke.color && typeof processedStroke.color === 'object') {
          processedStroke.color = this.rgbaToHex(processedStroke.color as Record<string, unknown>);
        }
        return processedStroke;
      });
    }

    if (node.cornerRadius !== undefined) {
      filtered.cornerRadius = node.cornerRadius;
    }

    if (node.absoluteBoundingBox) {
      filtered.absoluteBoundingBox = node.absoluteBoundingBox;
    }

    if (node.characters) {
      filtered.characters = node.characters;
    }

    if (node.style && typeof node.style === 'object') {
      const style = node.style as Record<string, unknown>;
      filtered.style = {
        fontFamily: style.fontFamily,
        fontStyle: style.fontStyle,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
        textAlignHorizontal: style.textAlignHorizontal,
        letterSpacing: style.letterSpacing,
        lineHeightPx: style.lineHeightPx
      };
    }

    if (node.children && Array.isArray(node.children)) {
      filtered.children = (node.children as Array<Record<string, unknown>>)
        .map((child) => this.filterFigmaNode(child))
        .filter((child) => child !== null); // Remove null children (VECTOR nodes)
    }

    return filtered;
  }

  /**
   * Helper: Convert RGBA color object to hex string
   */
  private rgbaToHex(color: Record<string, unknown> | string): string {
    // skip if color is already hex
    if (typeof color === 'string' && color.startsWith('#')) {
      return color;
    }

    if (typeof color === 'string') {
      return color; // Fallback for non-hex strings
    }

    const r = Math.round((color.r as number) * 255);
    const g = Math.round((color.g as number) * 255);
    const b = Math.round((color.b as number) * 255);
    const a = color.a !== undefined ? Math.round((color.a as number) * 255) : 255;

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a === 255 ? '' : a.toString(16).padStart(2, '0')}`;
  }
}

