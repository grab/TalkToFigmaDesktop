/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { isChannelNotRequired } from '../../../shared/constants';

// Simple logger for stdio server (logs to stderr)
const logger = {
  info: (msg: string, ...args: any[]) => console.error(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.error(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => console.error(`[DEBUG] ${msg}`, ...args),
};

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

export interface WebSocketClientOptions {
  wsPort: number;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  defaultTimeout?: number;
  clientType?: 'mcp' | 'figma'; // Client type for tracking
}

/**
 * WebSocket client for communicating with Figma via WebSocket server
 * Handles connection management, message routing, and request/response matching
 */
export class WebSocketClient {
  private wsClient: WebSocket | null = null;
  private currentChannel: string | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private isConnected = false;
  private isStopping = false;
  private options: Required<WebSocketClientOptions>;

  constructor(options: WebSocketClientOptions) {
    this.options = {
      wsPort: options.wsPort,
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 2000,
      defaultTimeout: options.defaultTimeout ?? 30000,
      clientType: options.clientType ?? 'mcp',
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `ws://127.0.0.1:${this.options.wsPort}`;

    return new Promise((resolve, reject) => {
      this.wsClient = new WebSocket(wsUrl);

      this.wsClient.on('open', () => {
        logger.info('🔌 WebSocket connected');
        this.isConnected = true;
        this.currentChannel = null;
        resolve();
      });

      this.wsClient.on('message', (data: Buffer) => {
        this.handleMessage(data);
      });

      this.wsClient.on('error', (error: Error) => {
        logger.error('WebSocket error:', error);
        reject(error);
      });

      this.wsClient.on('close', () => {
        logger.info('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.wsClient = null;

        // Reject all pending requests
        this.pendingRequests.forEach((request, id) => {
          clearTimeout(request.timeout);
          request.reject(new Error('Connection closed'));
          this.pendingRequests.delete(id);
        });

        // Auto-reconnect if enabled and not stopping
        if (this.options.autoReconnect && !this.isStopping) {
          setTimeout(() => {
            if (!this.isStopping) {
              this.connect().catch(() => {
                // Silent retry
              });
            }
          }, this.options.reconnectDelay);
        }
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isStopping = true;

    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(new Error('Client disconnecting'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Resume operations (reset stopping flag)
   */
  resume(): void {
    this.isStopping = false;
  }

  /**
   * Check if connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.wsClient?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current channel
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Join a Figma channel
   */
  async joinChannel(channelName: string): Promise<void> {
    if (!this.isWebSocketConnected()) {
      await this.connect();
    }

    await this.sendCommand('join', { channel: channelName });
    this.currentChannel = channelName;
    logger.info(`Channel joined: ${channelName}`);
  }

  /**
   * Send command to Figma via WebSocket
   */
  async sendCommand(
    command: string,
    params: Record<string, unknown> = {},
    timeoutMs?: number
  ): Promise<unknown> {
    // Check connection
    if (!this.isWebSocketConnected()) {
      await this.connect();
    }

    // Check channel requirement
    // Commands that don't require a channel: join, get_active_channels, connection_diagnostics, REST API tools
    const requiresChannel = !isChannelNotRequired(command);
    if (requiresChannel && !this.currentChannel) {
      throw new Error('Must join a channel before sending commands');
    }

    const id = uuidv4();
    const timeout = timeoutMs ?? this.options.defaultTimeout;

    // Transform parameters for specific commands to match Figma plugin expectations
    let transformedParams = { ...params };

    if (command === 'set_fill_color' && 'r' in params && 'g' in params && 'b' in params) {
      // Transform: { nodeId, r, g, b, a } → { nodeId, color: { r, g, b, a } }
      transformedParams = {
        nodeId: params.nodeId,
        color: {
          r: params.r,
          g: params.g,
          b: params.b,
          a: params.a ?? 1,
        },
      };
    } else if (command === 'set_stroke_color' && 'r' in params && 'g' in params && 'b' in params) {
      // Transform: { nodeId, r, g, b, a, weight } → { nodeId, color: { r, g, b, a }, weight }
      transformedParams = {
        nodeId: params.nodeId,
        color: {
          r: params.r,
          g: params.g,
          b: params.b,
          a: params.a ?? 1,
        },
        weight: params.weight ?? 1,
      };
    }

    return new Promise((resolve, reject) => {
      const request = {
        id,
        type: command === 'join' ? 'join' : 'message',
        ...(command === 'join' ? { channel: params.channel, clientType: this.options.clientType } : { channel: this.currentChannel }),
        message: {
          id,
          command,
          params: {
            ...transformedParams,
            ...Object.fromEntries(
              Object.entries(transformedParams).filter(([_key, value]) => value !== undefined)
            ),
          },
        },
      };

      // Create timeout
      const timeoutHandle = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request to Figma timed out after ${timeout / 1000} seconds`));
        }
      }, timeout);

      // Store pending request
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
        lastActivity: Date.now(),
      });

      // Send request
      logger.debug(`Sending command: ${command}`);
      this.wsClient!.send(JSON.stringify(request));
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: Buffer): void {
    try {
      const json = JSON.parse(data.toString());

      logger.debug(`Received message: ${JSON.stringify(json).substring(0, 200)}`);

      // Handle progress updates
      if (json.type === 'progress_update') {
        const progressData = json.message?.data;
        if (progressData) {
          const requestId = json.id;
          if (requestId && this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId)!;
            request.lastActivity = Date.now();

            // Extend timeout on progress update
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
      const response = json.message;
      if (response && response.id) {
        // Ignore request messages (those with 'command' field)
        if (response.command) {
          logger.debug(`Ignoring request message with command: ${response.command}`);
          return;
        }

        // Only process messages that have result or error (actual responses)
        if (response.result === undefined && response.error === undefined) {
          logger.debug(`Ignoring message without result or error: ${response.id}`);
          return;
        }

        if (this.pendingRequests.has(response.id)) {
          const request = this.pendingRequests.get(response.id)!;
          clearTimeout(request.timeout);

          if (response.error) {
            logger.error(`Figma error: ${response.error}`);
            request.reject(new Error(response.error));
          } else if (response.result !== undefined) {
            logger.debug(`Resolving request ${response.id}`);
            request.resolve(response.result);
          }

          this.pendingRequests.delete(response.id);
        } else {
          logger.debug(`Received response for unknown request: ${response.id}`);
        }
      } else {
        logger.debug(`Received message without valid response structure`);
      }
    } catch (error) {
      logger.error('Message parse error:', error);
    }
  }

  /**
   * Get pending request count (for debugging)
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}
