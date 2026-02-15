/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  InitializedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

// Simple logger for stdio server
const logger = {
  info: (msg: string, ...args: any[]) => console.error(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.error(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => console.error(`[DEBUG] ${msg}`, ...args),
};

import { allPrompts, promptContents } from './shared/prompt-registry';
import { allTools } from './shared/tool-registry';
import { WebSocketClient } from './shared/websocket-client';

/**
 * MCP Server for stdio transport (spawned by MCP clients)
 * Provides Figma control tools via stdio (stdin/stdout) transport
 *
 * This server is designed to be spawned by MCP clients (Cursor, Claude Code, etc.)
 * Each client spawns its own independent stdio server process.
 */
export class TalkToFigmaMcpServerStdio {
  private server: Server | null = null;
  private wsClient: WebSocketClient | null = null;
  private transport: StdioServerTransport | null = null;
  private wsPort = 3055;
  private isClientReady = false;

  /**
   * Start the MCP server with stdio transport
   * @param wsPort - WebSocket port to connect to (default: 3055)
   */
  async start(wsPort = 3055): Promise<void> {
    if (this.server) {
      throw new Error('MCP stdio server is already running');
    }

    this.wsPort = wsPort;

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

    // Setup MCP handlers
    this.setupMcpServer();

    // Create WebSocket client
    this.wsClient = new WebSocketClient({
      wsPort: this.wsPort,
      autoReconnect: true,
      reconnectDelay: 2000,
      defaultTimeout: 30000,
    });

    // Connect to Figma WebSocket server
    try {
      await this.wsClient.connect();
      logger.info(`✅ Connected to WebSocket server at port ${wsPort}`);
    } catch (error) {
      logger.warn(`Could not connect to WebSocket initially: ${error}`);
      logger.warn('Will try to connect when the first command is sent');
    }

    // Create stdio transport
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);

    logger.info(`✅ MCP Stdio Server started: ${allTools.length} tools, ${allPrompts.length} prompts`);
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    this.isClientReady = false;

    // Disconnect WebSocket client
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }

    // Close server (transport will be closed automatically)
    await this.server.close();
    this.server = null;
    this.transport = null;

    logger.info('[TalkToFigma MCP Stdio] Server stopped');
  }

  /**
   * Setup MCP server with Figma tools and prompts
   */
  private setupMcpServer(): void {
    if (!this.server) {
      logger.error('Cannot setup MCP server - server instance is null');
      return;
    }

    // Initialize handler
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      logger.info(`🚀 Client connected: ${request.params.clientInfo?.name || 'unknown'}`);

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
      logger.info(`📋 ListTools request (${allTools.length} tools)`);
      return { tools: allTools };
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params as { name: string; arguments: Record<string, unknown> };

      try {
        logger.info(`🔧 Tool: ${name}`);

        // Special handler for join_channel
        if (name === 'join_channel') {
          const { channel } = args as { channel: string };
          await this.joinChannel(channel);
          return {
            content: [{ type: 'text', text: `Successfully joined channel: ${channel}` }],
          };
        }

        // All other tools (including get_active_channels and connection_diagnostics)
        // are passed to WebSocket server
        const result = await this.sendCommandToFigma(name, args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error(`❌ Tool failed: ${name}`, error);
        return {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    });

    // Prompts list handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.info(`📚 ListPrompts request (${allPrompts.length} prompts)`);
      return { prompts: allPrompts };
    });

    // Get specific prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;
      const prompt = promptContents[name];

      if (!prompt) {
        logger.warn(`Unknown prompt: ${name}`);
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
      logger.info('✅ Client ready - handshake completed');
    });
  }

  /**
   * Join a Figma channel
   */
  private async joinChannel(channelName: string): Promise<void> {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized');
    }

    await this.wsClient.joinChannel(channelName);
    logger.info(`Channel joined: ${channelName}`);
  }

  /**
   * Send command to Figma via WebSocket
   */
  private async sendCommandToFigma(
    command: string,
    params: Record<string, unknown> = {},
    timeoutMs?: number
  ): Promise<unknown> {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized');
    }

    return await this.wsClient.sendCommand(command, params, timeoutMs);
  }
}
