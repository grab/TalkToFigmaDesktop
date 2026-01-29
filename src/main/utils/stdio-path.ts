/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { app } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from './logger';
import { getInstalledServerPath, getInstallPaths } from './stdio-installer';

const logger = createLogger('stdio');

/**
 * Get the absolute path to the MCP stdio server executable
 *
 * Priority order:
 * 1. Installed Application Support path - sandbox-safe location
 * 2. Development/bundled path (.vite/build/mcp-stdio-server.cjs)
 *
 * Note: This implementation only uses Application Support paths which are safe
 * in all environments including Mac App Store and Windows Store sandboxes.
 */
export function getStdioServerPath(): string {
  const isDev = !app.isPackaged;

  // First, check for installed path in Application Support
  const installedPath = getInstalledServerPath();
  if (installedPath) {
    logger.info(`[stdio-path] ✅ Using installed server at: ${installedPath}`);
    return installedPath;
  }

  // If not installed, fall back to bundled server (development or production)
  const appPath = app.getAppPath();
  const possiblePaths = [
    // Development
    path.join(appPath, '.vite', 'build', 'mcp-stdio-server.cjs'),
    // Production (inside asar)
    path.join(appPath, '.vite', 'build', 'mcp-stdio-server.cjs'),
    // Production (unpacked resources)
    path.join(process.resourcesPath, '.vite', 'build', 'mcp-stdio-server.cjs'),
    path.join(process.resourcesPath, 'app', '.vite', 'build', 'mcp-stdio-server.cjs'),
  ];

  logger.info('[stdio-path] Searching for bundled stdio server...');
  logger.info(`[stdio-path] isDev: ${isDev}`);
  logger.info(`[stdio-path] appPath: ${appPath}`);
  logger.info(`[stdio-path] resourcesPath: ${process.resourcesPath}`);

  for (const serverPath of possiblePaths) {
    logger.debug(`[stdio-path] Checking: ${serverPath}`);
    if (existsSync(serverPath)) {
      logger.info(`[stdio-path] ✅ Found bundled server at: ${serverPath}`);
      return serverPath;
    }
  }

  // Last resort: return the expected install path even if it doesn't exist yet
  const { serverPath } = getInstallPaths();
  logger.warn(`[stdio-path] ⚠️ No server found, returning expected install path: ${serverPath}`);
  return serverPath;
}

/**
 * Get the path that should be displayed to users for MCP client configuration
 *
 * This ALWAYS returns the Application Support path, regardless of whether
 * the server is currently installed or running from the bundled location.
 * This ensures users configure their MCP clients with the correct path.
 */
export function getStdioServerDisplayPath(): string {
  const { serverPath } = getInstallPaths();
  return serverPath;
}

/**
 * Get the MCP client configuration with the actual stdio server path
 */
export function getStdioServerConfig(): object {
  const stdioServerPath = getStdioServerDisplayPath(); // Use display path for user configuration

  return {
    mcpServers: {
      TalkToFigmaDesktop: {
        command: 'node',
        args: [stdioServerPath]
      },
    },
  };
}

/**
 * Get the command string for MCP clients
 * Format: node <path-to-server>
 */
export function getStdioServerCommand(): string {
  const stdioServerPath = getStdioServerDisplayPath(); // Use display path for user configuration
  return `node ${stdioServerPath}`;
}
