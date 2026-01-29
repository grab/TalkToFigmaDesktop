import express, { Express, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'node:http';
import { createLogger } from '../utils/logger';
import { PORTS, TIMEOUTS } from '../../shared/constants';
import { getAllTools, initializeServices, ToolDefinition } from './services';
import { FigmaWebSocketServer } from './websocket-server';

const logger = createLogger('MCP');

/**
 * MCP Server implementing SSE transport with heartbeat support.
 *
 * This is the key reason for migrating to Electron/TypeScript:
 * - TypeScript MCP SDK has resolved heartbeat/keep-alive issues
 * - Supports Streamable HTTP transport (future-proof)
 *
 * @deprecated This SSE-based MCP server is deprecated in favor of stdio transport.
 * Use TalkToFigmaMcpServerStdio instead (src/main/server/TalkToFigmaMcpServerStdio.ts).
 * This SSE version is kept for backward compatibility but will be removed in a future version.
 */
export class McpSseServer {
  private app: Express | null = null;
  private server: HttpServer | null = null;
  private sseClients: Map<string, Response> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastActivityTime: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  
  // Tool registry
  private tools: ToolDefinition[] = [];
  private toolMap: Map<string, ToolDefinition> = new Map();

  // Dependencies
  private webSocketServer: FigmaWebSocketServer | null = null;

  /**
   * Set the WebSocket server for Figma command forwarding
   */
  setWebSocketServer(wsServer: FigmaWebSocketServer): void {
    this.webSocketServer = wsServer;
    this.initializeToolServices();
  }

  /**
   * Initialize tool services with dependencies
   */
  private initializeToolServices(): void {
    // Create Figma command sender that forwards to WebSocket
    const figmaCommandSender = async (command: string, params: Record<string, unknown>): Promise<unknown> => {
      if (!this.webSocketServer) {
        throw new Error('WebSocket server not available');
      }
      return this.webSocketServer.sendCommand(command, params);
    };

    // Initialize all services
    initializeServices(this.webSocketServer, figmaCommandSender);

    // Get all tools from services
    this.tools = getAllTools();
    this.toolMap.clear();
    for (const tool of this.tools) {
      this.toolMap.set(tool.name, tool);
    }

    logger.info(`MCP server initialized with ${this.tools.length} tools`);
  }

  /**
   * Start the MCP SSE server
   */
  async start(): Promise<void> {
    if (this.server) {
      logger.warn('MCP server is already running');
      return;
    }

    this.app = express();
    this.app.use(express.json());

    // CORS headers for MCP clients
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // SSE endpoint for MCP clients
    this.app.get('/sse', (req, res) => {
      this.handleSseConnection(req, res);
    });

    // POST endpoint for MCP messages
    this.app.post('/message', async (req, res) => {
      await this.handleMessage(req, res);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connectedClients: this.sseClients.size,
        toolCount: this.tools.length,
        uptime: Date.now() - this.lastActivityTime,
      });
    });

    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app!);
        
        this.server.listen(PORTS.MCP_SSE, '127.0.0.1', () => {
          logger.info(`MCP SSE server started on port ${PORTS.MCP_SSE}`);
          this.startActivityMonitor();
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('MCP server error:', { error: (error as Error).message });
          reject(error);
        });

      } catch (error) {
        logger.error('Failed to start MCP server:', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the MCP SSE server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      logger.warn('MCP server is not running');
      return;
    }

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    for (const [clientId, res] of this.sseClients) {
      this.closeClient(clientId, res);
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        logger.info('MCP SSE server stopped');
        this.server = null;
        this.app = null;
        resolve();
      });
    });
  }

  /**
   * Handle new SSE connection
   */
  private handleSseConnection(req: Request, res: Response): void {
    const clientId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    res.setTimeout(0);
    req.setTimeout(0);

    this.sseClients.set(clientId, res);
    logger.info(`MCP client connected: ${clientId}`);

    this.sendSseEvent(res, 'connected', { clientId });
    this.startHeartbeat(clientId, res);

    req.on('close', () => {
      this.closeClient(clientId, res);
    });

    req.on('error', (error) => {
      logger.error(`MCP client ${clientId} error:`, { error: error.message });
      this.closeClient(clientId, res);
    });

    this.lastActivityTime = Date.now();
  }

  private startHeartbeat(clientId: string, res: Response): void {
    const interval = setInterval(() => {
      if (res.writableEnded) {
        this.closeClient(clientId, res);
        return;
      }
      this.sendSseEvent(res, 'heartbeat', { timestamp: Date.now() });
      logger.debug(`Heartbeat sent to ${clientId}`);
    }, 15000);

    this.heartbeatIntervals.set(clientId, interval);
  }

  private closeClient(clientId: string, res: Response): void {
    const interval = this.heartbeatIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(clientId);
    }

    this.sseClients.delete(clientId);
    
    if (!res.writableEnded) {
      res.end();
    }
    
    logger.info(`MCP client disconnected: ${clientId}`);
  }

  private sendSseEvent(res: Response, event: string, data: unknown): boolean {
    if (res.writableEnded) {
      return false;
    }

    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      logger.error('Failed to send SSE event:', { error });
      return false;
    }
  }

  /**
   * Handle incoming MCP message (POST)
   */
  private async handleMessage(req: Request, res: Response): Promise<void> {
    this.lastActivityTime = Date.now();
    
    try {
      const { jsonrpc, id, method, params } = req.body;

      if (jsonrpc !== '2.0') {
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' },
        });
        return;
      }

      logger.debug(`MCP request: ${method}`, { id, params });

      let result: unknown;

      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params);
          break;
        
        case 'tools/list':
          result = this.handleToolsList();
          break;
        
        case 'tools/call':
          result = await this.handleToolsCall(params);
          break;
        
        case 'resources/list':
          result = { resources: [] };
          break;
        
        case 'prompts/list':
          result = { prompts: [] };
          break;
        
        default:
          throw { code: -32601, message: `Method not found: ${method}` };
      }

      res.json({
        jsonrpc: '2.0',
        id,
        result,
      });

    } catch (error) {
      const err = error as { code?: number; message?: string };
      logger.error('MCP message error:', { error });
      
      res.json({
        jsonrpc: '2.0',
        id: req.body?.id,
        error: {
          code: err.code || -32603,
          message: err.message || 'Internal error',
        },
      });
    }
  }

  private async handleInitialize(params: Record<string, unknown>): Promise<unknown> {
    logger.info('MCP initialize:', { clientInfo: params?.clientInfo });
    
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'TalkToFigmaDesktop',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    };
  }

  /**
   * Handle MCP tools/list - now uses service registry
   */
  private handleToolsList(): unknown {
    return {
      tools: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  }

  /**
   * Handle MCP tools/call - now uses service registry
   */
  private async handleToolsCall(params: { name: string; arguments?: Record<string, unknown> }): Promise<unknown> {
    const { name, arguments: args = {} } = params;
    
    logger.info(`Tool call: ${name}`, { args });

    const tool = this.toolMap.get(name);
    if (!tool) {
      throw { code: -32602, message: `Unknown tool: ${name}` };
    }

    try {
      return await tool.handler(args);
    } catch (error) {
      const err = error as Error;
      logger.error(`Tool ${name} failed:`, { error: err.message });
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }

  private startActivityMonitor(): void {
    this.activityCheckInterval = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivityTime;
      
      if (inactiveTime > TIMEOUTS.INACTIVITY_WARNING) {
        logger.warn(`MCP server inactive for ${Math.floor(inactiveTime / 1000)}s`);
      }
    }, TIMEOUTS.ACTIVITY_CHECK);
  }

  broadcast(event: string, data: unknown): number {
    let sentCount = 0;
    
    for (const [clientId, res] of this.sseClients) {
      if (this.sendSseEvent(res, event, data)) {
        sentCount++;
      } else {
        this.closeClient(clientId, res);
      }
    }
    
    return sentCount;
  }

  getConnectedClientCount(): number {
    return this.sseClients.size;
  }
}
