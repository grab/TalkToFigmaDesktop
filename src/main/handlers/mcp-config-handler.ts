/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * MCP Configuration IPC Handlers
 *
 * Handles MCP configuration operations from renderer process
 */

import { ipcMain, shell } from 'electron'
import path from 'path'
import { IPC_CHANNELS } from '@/shared/constants'
import {
  getClientConfig,
  detectConfig,
  autoConfigureClient,
  restoreFromBackup,
  expandPath,
  type ConfigDetectionResult,
  type ConfigWriteResult
} from '@/lib/mcp'
import { getStdioServerDisplayPath, getStdioServerConfig, getStdioServerCommand } from '../utils/stdio-path'

/**
 * Register all MCP configuration IPC handlers
 */
export function registerMcpConfigHandlers() {
  // Detect configuration status for a client
  ipcMain.handle(
    IPC_CHANNELS.MCP_DETECT_CONFIG,
    async (_, clientId: string): Promise<ConfigDetectionResult> => {
      const client = getClientConfig(clientId)

      if (!client) {
        return {
          status: 'unknown',
          configPath: '',
          exists: false,
          readable: false,
          hasOurServer: false,
          error: 'Client not found'
        }
      }

      return await detectConfig(client)
    }
  )

  // Auto-configure a client
  ipcMain.handle(
    IPC_CHANNELS.MCP_AUTO_CONFIGURE,
    async (_, clientId: string): Promise<ConfigWriteResult> => {
      const client = getClientConfig(clientId)

      if (!client) {
        return {
          success: false,
          message: 'Client not found',
          error: 'Invalid client ID'
        }
      }

      return await autoConfigureClient(client)
    }
  )

  // Open config folder in file explorer
  ipcMain.handle(
    IPC_CHANNELS.MCP_OPEN_CONFIG_FOLDER,
    async (_, clientId: string): Promise<{ success: boolean; error?: string }> => {
      const client = getClientConfig(clientId)

      if (!client || !client.configPath) {
        return {
          success: false,
          error: 'No config path available'
        }
      }

      try {
        const configPath = expandPath(client.configPath)
        const folderPath = path.dirname(configPath)

        await shell.openPath(folderPath)

        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        }
      }
    }
  )

  // Restore configuration from backup
  ipcMain.handle(
    IPC_CHANNELS.MCP_RESTORE_BACKUP,
    async (_, clientId: string): Promise<ConfigWriteResult> => {
      const client = getClientConfig(clientId)

      if (!client || !client.configPath) {
        return {
          success: false,
          message: 'Client not found or no config path',
          error: 'Invalid client'
        }
      }

      return await restoreFromBackup(client.configPath)
    }
  )

  // Get stdio server path (for display to users)
  ipcMain.handle(
    IPC_CHANNELS.MCP_GET_STDIO_PATH,
    async (): Promise<string> => {
      return getStdioServerDisplayPath() // Always return Application Support path
    }
  )

  // Get stdio server configuration
  ipcMain.handle(
    IPC_CHANNELS.MCP_GET_STDIO_CONFIG,
    async (): Promise<{ config: object; command: string; path: string }> => {
      return {
        config: getStdioServerConfig(),
        command: getStdioServerCommand(),
        path: getStdioServerDisplayPath() // Use display path for user configuration
      }
    }
  )
}
