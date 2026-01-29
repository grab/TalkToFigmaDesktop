#!/usr/bin/env node

/**
 * MCP Stdio Server Entry Point
 *
 * This is the entry point for the stdio-based MCP server.
 * It is designed to be spawned by MCP clients (Cursor, Claude Code, etc.)
 *
 * Usage:
 *   node mcp-stdio-server.js [wsPort]
 *
 * Arguments:
 *   wsPort - WebSocket port to connect to (default: 3055)
 *
 * The server will:
 * 1. Connect to the WebSocket server at the specified port
 * 2. Communicate with the MCP client via stdin/stdout
 * 3. Forward commands to Figma via the WebSocket connection
 * 4. Exit when the client closes the connection
 */

import { TalkToFigmaMcpServerStdio } from './TalkToFigmaMcpServerStdio';

// Simple logger for stdio server (logs to stderr to not interfere with stdio transport)
const logger = {
  info: (msg: string, ...args: any[]) => console.error(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.error(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
};

// Parse command line arguments
const wsPort = parseInt(process.argv[2] || '3055', 10);

// Create and start server
const server = new TalkToFigmaMcpServerStdio();

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down stdio server...');
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle stdin close (client disconnected)
process.stdin.on('end', () => {
  logger.info('stdin closed, shutting down...');
  shutdown();
});

// Start server
(async () => {
  try {
    await server.start(wsPort);
    logger.info(`✅ MCP stdio server started (WebSocket port: ${wsPort})`);
  } catch (error) {
    logger.error('Failed to start stdio server:', error);
    process.exit(1);
  }
})();
