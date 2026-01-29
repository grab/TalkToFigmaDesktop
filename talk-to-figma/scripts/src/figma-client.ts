/**
 * Talk to Figma Skill - Figma Client
 *
 * WebSocket client for communicating with the Figma plugin.
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { FigmaMessage, ExecutionResult, ExecuteOptions } from './types.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;

/**
 * Client for communicating with Figma plugin via WebSocket
 */
export class FigmaClient {
  private ws: WebSocket | null = null;
  private currentChannel: string | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  private serverUrl: string;

  constructor(serverUrl = 'ws://localhost:3055') {
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        console.log('[FigmaClient] Connected to WebSocket server');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error: Error) => {
        console.error('[FigmaClient] WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[FigmaClient] WebSocket connection closed');
        this.ws = null;
        this.currentChannel = null;
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.currentChannel = null;
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(channel: string): Promise<void> {
    if (!this.ws) {
      throw new Error('Not connected to WebSocket server');
    }

    return new Promise((resolve, reject) => {
      const id = uuidv4();

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Join channel timeout'));
      }, 10000);

      this.pendingRequests.set(id, {
        resolve: () => {
          this.currentChannel = channel;
          resolve();
        },
        reject,
        timeout,
      });

      this.ws!.send(JSON.stringify({
        type: 'join',
        channel,
        id,
      }));
    });
  }

  /**
   * Execute code in Figma plugin
   */
  async executeCode(
    code: string,
    options: ExecuteOptions = {}
  ): Promise<ExecutionResult> {
    const { timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.sendCommand('execute_code', { code }, timeout);
        return result as ExecutionResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[FigmaClient] Attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < retries - 1) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Send a command to Figma plugin
   */
  async sendCommand(
    command: string,
    params: Record<string, unknown> = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<unknown> {
    if (!this.ws || !this.currentChannel) {
      throw new Error('Not connected to a channel');
    }

    return new Promise((resolve, reject) => {
      const id = uuidv4();

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Command timeout: ${command}`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      const message = {
        type: 'message',
        channel: this.currentChannel,
        id,
        message: {
          type: command,
          ...params,
        },
      };

      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: FigmaMessage = JSON.parse(data);

      // Handle response to pending request
      if (message.id && this.pendingRequests.has(message.id)) {
        const pending = this.pendingRequests.get(message.id)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result ?? message.message);
        }
        return;
      }

      // Handle system messages
      if (message.type === 'system') {
        console.log('[FigmaClient] System:', message.message);

        // Check for join confirmation
        if (typeof message.message === 'string' && message.message.includes('Joined channel')) {
          // Channel join confirmed via system message
        }
      }

      // Handle errors
      if (message.type === 'error') {
        console.error('[FigmaClient] Error:', message.message);
      }
    } catch (error) {
      console.error('[FigmaClient] Failed to parse message:', error);
    }
  }

  /**
   * Check if connected to a channel
   */
  isConnected(): boolean {
    return this.ws !== null && this.currentChannel !== null;
  }

  /**
   * Get current channel
   */
  getChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default FigmaClient;
