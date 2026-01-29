/**
 * MCP Configuration Detector
 *
 * Detects configuration status for MCP clients
 */

import { promises as fs } from 'fs'
import { homedir } from 'os'
import type { McpClient } from './client-configs'
import type { ConfigStatus } from './config-utils'

export type { ConfigStatus } from './config-utils'
export { getStatusBadgeInfo } from './config-utils'

export interface ConfigDetectionResult {
  status: ConfigStatus
  configPath: string
  exists: boolean
  readable: boolean
  hasOurServer: boolean
  error?: string
}

/**
 * Expand ~ to home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir())
  }
  return path
}

/**
 * Detect configuration status for a client
 */
export async function detectConfig(client: McpClient): Promise<ConfigDetectionResult> {
  // Can't detect if no config path or coming soon
  if (!client.configPath || client.comingSoon) {
    return {
      status: 'unknown',
      configPath: '',
      exists: false,
      readable: false,
      hasOurServer: false
    }
  }

  const configPath = expandPath(client.configPath)

  try {
    // Try to read the config file
    const content = await fs.readFile(configPath, 'utf-8')

    // Parse JSON if it's a JSON config
    if (client.configFormat === 'json') {
      try {
        const config = JSON.parse(content)

        // Check if TalkToFigmaDesktop is configured
        const hasOurServer = Boolean(
          config.mcpServers?.[client.serverName]
        )

        return {
          status: hasOurServer ? 'configured' : 'exists-not-configured',
          configPath,
          exists: true,
          readable: true,
          hasOurServer
        }
      } catch (parseError) {
        // Invalid JSON
        return {
          status: 'exists-not-configured',
          configPath,
          exists: true,
          readable: true,
          hasOurServer: false,
          error: 'Invalid JSON format'
        }
      }
    }

    // Non-JSON formats - just check existence
    return {
      status: 'exists-not-configured',
      configPath,
      exists: true,
      readable: true,
      hasOurServer: false
    }

  } catch (error: any) {
    // File doesn't exist
    if (error.code === 'ENOENT') {
      return {
        status: 'not-found',
        configPath,
        exists: false,
        readable: false,
        hasOurServer: false
      }
    }

    // Permission denied
    if (error.code === 'EACCES') {
      return {
        status: 'no-permission',
        configPath,
        exists: true,
        readable: false,
        hasOurServer: false,
        error: 'Permission denied'
      }
    }

    // Other errors
    return {
      status: 'unknown',
      configPath,
      exists: false,
      readable: false,
      hasOurServer: false,
      error: error.message
    }
  }
}
