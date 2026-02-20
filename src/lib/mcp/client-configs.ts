/**
 * MCP Client Configurations
 *
 * Defines all supported MCP clients and their configuration formats
 */

export type InstallMethod = 'deeplink' | 'cli' | 'auto-config' | 'manual' | 'coming-soon'

export interface McpClient {
  id: string
  displayName: string
  configPath?: string // Optional - some clients don't use config files
  configFormat: 'json' | 'cli' | 'deeplink' | 'unknown'
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
    serverName: 'TalkToFigmaDesktop',
    installMethod: 'deeplink',
    description: 'Use Cursor to install the MCP server',
    deepLink: 'cursor://anysphere.cursor-deeplink/mcp/install?name=TalkToFigmaDesktop&config=' +
      encodeURIComponent(JSON.stringify({
        command: 'node',
        args: ['<STDIO_SERVER_PATH>']  // Will be replaced with actual path
      })),
    config: {
      mcpServers: {
        TalkToFigmaDesktop: {
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
      'TalkToFigmaDesktop will be added to your MCP servers'
    ]
  },

  claudeCode: {
    id: 'claude-code',
    displayName: 'Claude Code',
    configFormat: 'cli',
    serverName: 'TalkToFigmaDesktop',
    installMethod: 'cli',
    description: 'Use Claude Code to install the MCP server',
    cliCommand: 'claude mcp add TalkToFigmaDesktop node <STDIO_SERVER_PATH>',
    instructions: [
      'Copy the command above (server path is pre-filled)',
      'Open your terminal',
      'Paste and run the command',
      'Claude Code will automatically configure the MCP server',
      'Use the /mcp command in Claude to manage servers'
    ]
  },

  vscode: {
    id: 'vscode',
    displayName: 'VS Code',
    configPath: '~/.vscode/mcp.json', // Approximate - may vary
    configFormat: 'json',
    serverName: 'TalkToFigmaDesktop',
    installMethod: 'manual',
    description: 'Use VS Code to install the MCP server',
    config: {
      mcpServers: {
        TalkToFigmaDesktop: {
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
    serverName: 'TalkToFigmaDesktop',
    installMethod: 'manual',
    description: 'Google Antigravity AI editor',
    config: {
      mcpServers: {
        TalkToFigmaDesktop: {
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
    serverName: 'TalkToFigmaDesktop',
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
  return Object.keys(MCP_CLIENTS).filter(id => id !== 'comingSoon')
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

  return `cursor://anysphere.cursor-deeplink/mcp/install?name=TalkToFigmaDesktop&config=${encodeURIComponent(JSON.stringify(config))}`
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
