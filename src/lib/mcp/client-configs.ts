/**
 * MCP Client Configurations
 *
 * Defines all supported MCP clients and their configuration formats
 */

import { BRANDING } from '@/shared/branding'

export type InstallMethod = 'deeplink' | 'cli' | 'auto-config' | 'manual' | 'coming-soon'

export interface McpClient {
  id: string
  displayName: string
  configPath?: string // Optional - some clients don't use config files
  configFormat: 'json' | 'cli' | 'deeplink' | 'unknown'
  configRootKey?: 'mcpServers' | 'servers'
  serverName: string // Always "TalkToFigmaDesktop"
  installMethod: InstallMethod
  config?: object // Optional - for JSON configs
  cliCommand?: string // Optional - for CLI-based installation
  deepLink?: string // Optional - for deep link installation
  instructions: string[]
  comingSoon?: boolean
  description?: string
}

export const MCP_CLIENTS: Record<string, McpClient> = {
  cursor: {
    id: 'cursor',
    displayName: 'Cursor',
    configFormat: 'deeplink',
    serverName: BRANDING.mcpServerName,
    installMethod: 'deeplink',
    description: 'Use Cursor to install the MCP server',
    deepLink: `cursor://anysphere.cursor-deeplink/mcp/install?name=${BRANDING.mcpServerName}&config=` +
      encodeURIComponent(JSON.stringify({
        command: 'node',
        args: ['<STDIO_SERVER_PATH>']  // Will be replaced with actual path
      })),
    config: {
      mcpServers: {
        [BRANDING.mcpServerName]: {
          command: 'node',
          args: ['<STDIO_SERVER_PATH>']  // Replace with actual path to mcp-stdio-server.js
        }
      }
    },
    instructions: [
      'Click "Install in Cursor" button above',
      'The server path (~/.talktofigma/server) is automatically configured',
      'Cursor will open and show the MCP configuration dialog',
      'Click "Connect" to complete the installation',
      `${BRANDING.mcpServerName} will be added to your MCP servers`
    ]
  },

  claudeCode: {
    id: 'claude-code',
    displayName: 'Claude Code',
    configFormat: 'cli',
    serverName: BRANDING.mcpServerName,
    installMethod: 'cli',
    description: 'Use Claude Code to install the MCP server',
    cliCommand: `claude mcp add ${BRANDING.mcpServerName} node <STDIO_SERVER_PATH>`,
    instructions: [
      'Copy the command above (server path is pre-filled)',
      'Open your terminal',
      'Paste and run the command',
      'Claude Code will automatically configure the MCP server',
      'Use the /mcp command in Claude to manage servers'
    ]
  },

  codex: {
    id: 'codex',
    displayName: 'Codex CLI',
    configFormat: 'cli',
    serverName: BRANDING.mcpServerName,
    installMethod: 'cli',
    description: 'Use Codex CLI to install the MCP server',
    cliCommand: `codex mcp add ${BRANDING.mcpServerName} -- node <STDIO_SERVER_PATH>`,
    instructions: [
      'Copy the command above (server path is pre-filled)',
      'Open your terminal',
      'Paste and run the command',
      `Use codex mcp list to verify ${BRANDING.mcpServerName} is enabled`,
      `If a malformed entry exists, run codex mcp remove ${BRANDING.mcpServerName} and add it again`
    ]
  },

  vscode: {
    id: 'vscode',
    displayName: 'VS Code',
    configPath: '~/.vscode/mcp.json', // Workspace settings may also use .vscode/mcp.json
    configFormat: 'json',
    configRootKey: 'servers',
    serverName: BRANDING.mcpServerName,
    installMethod: 'manual',
    description: 'Use VS Code to install the MCP server',
    config: {
      servers: {
        [BRANDING.mcpServerName]: {
          type: 'stdio',
          command: 'node',
          args: ['<STDIO_SERVER_PATH>']  // Replace with actual path to mcp-stdio-server.js
        }
      }
    },
    instructions: [
      'Press ⌘+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)',
      'Type "MCP: Configure Servers"',
      'Copy the configuration JSON above (server path is pre-filled)',
      'Paste the configuration',
      'Save and restart VS Code'
    ]
  },

  antigravity: {
    id: 'antigravity',
    displayName: 'Antigravity',
    configPath: '~/Library/Application Support/Antigravity/mcp_config.json', // macOS
    configFormat: 'json',
    serverName: BRANDING.mcpServerName,
    installMethod: 'manual',
    description: 'Google Antigravity AI editor',
    config: {
      mcpServers: {
        [BRANDING.mcpServerName]: {
          command: 'node',
          args: ['<STDIO_SERVER_PATH>']  // Replace with actual path to mcp-stdio-server.js
        }
      }
    },
    instructions: [
      'Click "..." in the top right of the Antigravity side panel',
      'Select "MCP Server" → "Manage MCP Servers"',
      'Click "View raw config"',
      'Copy the configuration JSON above (server path is pre-filled)',
      'Paste into the config editor and save'
    ]
  },

  comingSoon: {
    id: 'coming-soon',
    displayName: 'Other Clients',
    configFormat: 'unknown',
    serverName: BRANDING.mcpServerName,
    installMethod: 'coming-soon',
    description: 'Support for additional MCP clients coming soon',
    instructions: [
      'We are working on support for more MCP clients',
      'Check back for updates or request support for your client'
    ],
    comingSoon: true
  }
}

/**
 * Get client configuration by ID
 */
export function getClientConfig(clientId: string): McpClient | undefined {
  return MCP_CLIENTS[clientId]
}

/**
 * Get all client IDs (excluding coming soon)
 */
export function getAllClientIds(): string[] {
  return Object.keys(MCP_CLIENTS)
    .filter(id => id !== 'comingSoon')
    .sort((a, b) => {
      const nameA = MCP_CLIENTS[a]?.displayName ?? a
      const nameB = MCP_CLIENTS[b]?.displayName ?? b
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' })
    })
}

/**
 * Get all active (non-coming-soon) clients
 */
export function getActiveClients(): McpClient[] {
  return Object.values(MCP_CLIENTS).filter(client => !client.comingSoon)
}

/**
 * Get coming-soon client
 */
export function getComingSoonClient(): McpClient | undefined {
  return MCP_CLIENTS.comingSoon
}

type Translator = (key: string, options?: Record<string, unknown>) => string

export function getClientDescription(client: McpClient, t: Translator): string {
  switch (client.id) {
    case 'cursor':
      return t('mcp.clients.cursor.description')
    case 'claude-code':
      return t('mcp.clients.claudeCode.description')
    case 'codex':
      return t('mcp.clients.codex.description')
    case 'vscode':
      return t('mcp.clients.vscode.description')
    case 'antigravity':
      return t('mcp.clients.antigravity.description')
    case 'coming-soon':
      return t('mcp.clients.comingSoon.description')
    default:
      return client.description ?? ''
  }
}

export function getClientInstructions(client: McpClient, t: Translator): string[] {
  switch (client.id) {
    case 'cursor':
      return [
        t('mcp.clients.cursor.instructions.0'),
        t('mcp.clients.cursor.instructions.1'),
        t('mcp.clients.cursor.instructions.2'),
        t('mcp.clients.cursor.instructions.3'),
        t('mcp.clients.cursor.instructions.4', { serverName: BRANDING.mcpServerName }),
      ]
    case 'claude-code':
      return [
        t('mcp.clients.claudeCode.instructions.0'),
        t('mcp.clients.claudeCode.instructions.1'),
        t('mcp.clients.claudeCode.instructions.2'),
        t('mcp.clients.claudeCode.instructions.3'),
        t('mcp.clients.claudeCode.instructions.4'),
      ]
    case 'codex':
      return [
        t('mcp.clients.codex.instructions.0'),
        t('mcp.clients.codex.instructions.1'),
        t('mcp.clients.codex.instructions.2'),
        t('mcp.clients.codex.instructions.3', { serverName: BRANDING.mcpServerName }),
        t('mcp.clients.codex.instructions.4', { serverName: BRANDING.mcpServerName }),
      ]
    case 'vscode':
      return [
        t('mcp.clients.vscode.instructions.0'),
        t('mcp.clients.vscode.instructions.1'),
        t('mcp.clients.vscode.instructions.2'),
        t('mcp.clients.vscode.instructions.3'),
        t('mcp.clients.vscode.instructions.4'),
      ]
    case 'antigravity':
      return [
        t('mcp.clients.antigravity.instructions.0'),
        t('mcp.clients.antigravity.instructions.1'),
        t('mcp.clients.antigravity.instructions.2'),
        t('mcp.clients.antigravity.instructions.3'),
        t('mcp.clients.antigravity.instructions.4'),
      ]
    case 'coming-soon':
      return [
        t('mcp.clients.comingSoon.instructions.0'),
        t('mcp.clients.comingSoon.instructions.1'),
      ]
    default:
      return client.instructions
  }
}

/**
 * Format configuration as JSON string
 */
export function formatClientConfig(client: McpClient): string {
  if (!client.config) return ''
  return JSON.stringify(client.config, null, 2)
}

/**
 * Generate Cursor deep link
 */
export function getCursorDeepLink(): string {
  const config = {
    command: 'node',
    args: ['<STDIO_SERVER_PATH>']
  }

  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${BRANDING.mcpServerName}&config=${encodeURIComponent(JSON.stringify(config))}`
}

/**
 * Get stdio server path
 * This should be replaced with the actual path when the app is packaged
 * For development: path to src/main/server/mcp-stdio-server.ts (compiled to .js)
 * For production: path within app.asar or resources folder
 */
export function getStdioServerPath(): string {
  // This will be implemented with IPC call to get the actual path from main process
  return '<STDIO_SERVER_PATH>'
}
