/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { app } from 'electron';
import path from 'node:path';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import { createLogger } from './logger';

const logger = createLogger('stdio');

/**
 * Get platform-specific paths for MCP stdio server installation
 * Supports: macOS, Windows
 * Uses Application Support directories which are safe in all environments including App Store sandboxes
 */
export function getInstallPaths() {
  const homeDir = os.homedir();
  const platform = process.platform;

  // Application Support location (works in all environments including sandboxed)
  let appSupportDir: string;
  if (platform === 'darwin') {
    appSupportDir = path.join(homeDir, 'Library', 'Application Support', 'TalkToFigma');
  } else if (platform === 'win32') {
    appSupportDir = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'TalkToFigma');
  } else {
    throw new Error(`Unsupported platform: ${platform}. TalkToFigma Desktop supports macOS and Windows only.`);
  }

  const serverPath = path.join(appSupportDir, 'mcp-server.cjs');

  return {
    appSupportDir,
    serverPath,
  };
}

/**
 * Get the source path of the built MCP stdio server
 */
function getSourceServerPath(): string | null {
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

  for (const serverPath of possiblePaths) {
    if (existsSync(serverPath)) {
      logger.info(`[stdio-installer] Found source server at: ${serverPath}`);
      return serverPath;
    }
  }

  logger.error('[stdio-installer] ❌ Source server not found in any expected location');
  return null;
}

/**
 * Install MCP stdio server to Application Support
 *
 * This function copies mcp-stdio-server.cjs to the platform-specific Application Support directory.
 * This location is safe in all environments including Mac App Store and Windows Store sandboxes.
 *
 * @returns The installed server path
 */
export async function installStdioServer(): Promise<{ success: boolean; path: string | null; error?: string }> {
  try {
    logger.info('[stdio-installer] Starting stdio server installation...');

    // Get source and target paths
    const sourcePath = getSourceServerPath();
    if (!sourcePath) {
      return {
        success: false,
        path: null,
        error: 'Source server file not found',
      };
    }

    const { appSupportDir, serverPath } = getInstallPaths();

    // Create Application Support directory if it doesn't exist
    if (!existsSync(appSupportDir)) {
      logger.info(`[stdio-installer] Creating directory: ${appSupportDir}`);
      mkdirSync(appSupportDir, { recursive: true });
    }

    // Copy server file to Application Support
    logger.info(`[stdio-installer] Copying server file to: ${serverPath}`);
    copyFileSync(sourcePath, serverPath);
    logger.info('[stdio-installer] ✅ Server file copied successfully');

    logger.info(`[stdio-installer] ✅ Installation complete! Server available at: ${serverPath}`);
    return {
      success: true,
      path: serverPath,
    };

  } catch (error) {
    logger.error('[stdio-installer] ❌ Installation failed:', error);
    return {
      success: false,
      path: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if the stdio server is installed
 */
export function isStdioServerInstalled(): boolean {
  const { serverPath } = getInstallPaths();
  return existsSync(serverPath);
}

/**
 * Get the installed server path
 */
export function getInstalledServerPath(): string | null {
  const { serverPath } = getInstallPaths();
  return existsSync(serverPath) ? serverPath : null;
}
