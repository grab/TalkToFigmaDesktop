/**
 * MCP Configuration Writer
 *
 * Handles automatic configuration of MCP clients
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { McpClient } from './client-configs'
import { expandPath } from './config-detector'

export interface ConfigWriteResult {
  success: boolean
  message: string
  configPath?: string
  backupPath?: string
  error?: string
}

/**
 * Auto-configure a client by writing to its config file
 */
export async function autoConfigureClient(
  client: McpClient
): Promise<ConfigWriteResult> {
  // Can't auto-configure if no path or coming soon
  if (!client.configPath || client.comingSoon) {
    return {
      success: false,
      message: `${client.displayName} auto-configuration is not yet available`,
      error: 'Coming soon'
    }
  }

  // Only support JSON format for now
  if (client.configFormat !== 'json') {
    return {
      success: false,
      message: `${client.displayName} uses CLI configuration (not file-based)`,
      error: 'Unsupported format'
    }
  }

  const configPath = expandPath(client.configPath)

  try {
    // Ensure parent directory exists
    const configDir = path.dirname(configPath)
    await fs.mkdir(configDir, { recursive: true })

    // Read existing config or create new
    let existingConfig: any = {}
    let isExisting = false

    try {
      const content = await fs.readFile(configPath, 'utf-8')
      existingConfig = JSON.parse(content)
      isExisting = true
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        // Error other than file not found
        throw err
      }
      // File doesn't exist - will create new
      existingConfig = {}
    }

    // Create backup if file exists
    let backupPath: string | undefined
    if (isExisting) {
      backupPath = `${configPath}.backup`
      await fs.copyFile(configPath, backupPath)
    }

    // Ensure mcpServers object exists
    if (!existingConfig.mcpServers) {
      existingConfig.mcpServers = {}
    }

    // Add or update TalkToFigmaDesktop server
    existingConfig.mcpServers[client.serverName] = {
      url: 'http://127.0.0.1:3056/sse'
    }

    // Write updated config with pretty formatting
    await fs.writeFile(
      configPath,
      JSON.stringify(existingConfig, null, 2) + '\n',
      'utf-8'
    )

    return {
      success: true,
      message: `Successfully configured ${client.displayName}${
        isExisting ? ' (backup created)' : ''
      }`,
      configPath,
      backupPath
    }

  } catch (error: any) {
    // Permission denied
    if (error.code === 'EACCES') {
      return {
        success: false,
        message: `Permission denied when writing to ${client.displayName} config`,
        error: 'Permission denied',
        configPath
      }
    }

    // Other errors
    return {
      success: false,
      message: `Failed to configure ${client.displayName}`,
      error: error.message,
      configPath
    }
  }
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(
  configPath: string
): Promise<ConfigWriteResult> {
  const expandedPath = expandPath(configPath)
  const backupPath = `${expandedPath}.backup`

  try {
    // Check if backup exists
    await fs.access(backupPath)

    // Restore from backup
    await fs.copyFile(backupPath, expandedPath)

    return {
      success: true,
      message: 'Configuration restored from backup',
      configPath: expandedPath,
      backupPath
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        success: false,
        message: 'Backup file not found',
        error: 'No backup available'
      }
    }

    return {
      success: false,
      message: 'Failed to restore from backup',
      error: error.message
    }
  }
}

/**
 * Delete backup file
 */
export async function deleteBackup(configPath: string): Promise<void> {
  const expandedPath = expandPath(configPath)
  const backupPath = `${expandedPath}.backup`

  try {
    await fs.unlink(backupPath)
  } catch (error) {
    // Ignore errors (backup might not exist)
  }
}

/**
 * Verify configuration is valid
 */
export async function verifyConfig(
  configPath: string,
  serverName: string
): Promise<boolean> {
  try {
    const content = await fs.readFile(expandPath(configPath), 'utf-8')
    const config = JSON.parse(content)
    return Boolean(config.mcpServers?.[serverName])
  } catch {
    return false
  }
}
