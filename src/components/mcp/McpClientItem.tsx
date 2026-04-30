/**
 * Individual MCP Client Item Component
 *
 * Shows installation method for each MCP client
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExternalLink } from 'lucide-react'
import { ConfigCodeBlock } from './ConfigCodeBlock'
import type { McpClient } from '@/lib/mcp/client-configs'
import { formatClientConfig, getClientInstructions } from '@/lib/mcp/client-configs'
import { useToast } from '@/hooks/use-toast'
import { BRANDING } from '@/shared/branding'
import { useTranslation } from 'react-i18next'

interface McpClientItemProps {
  client: McpClient
}

function isWindowsPlatform(): boolean {
  return navigator.platform.toLowerCase().includes('win')
}

function quoteShellArg(value: string): string {
  if (isWindowsPlatform()) {
    return `"${value.replace(/"/g, '\\"')}"`
  }

  return `'${value.replace(/'/g, `'\\''`)}'`
}

function base64EncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

export function McpClientItem({ client }: McpClientItemProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [stdioPath, setStdioPath] = useState<string>('<STDIO_SERVER_PATH>')
  const instructions = getClientInstructions(client, t)

  useEffect(() => {
    // Load actual stdio server path
    if (window.electron?.mcp?.getStdioPath) {
      window.electron.mcp.getStdioPath().then(path => {
        setStdioPath(path)
      }).catch(() => {
        setStdioPath('<ERROR_LOADING_PATH>')
      })
    }
  }, [])

  const handleDeepLink = () => {
    // Cursor deeplink format: name parameter contains server name,
    // config contains only the server configuration (command/args)
    const config = {
      command: 'node',
      args: [stdioPath]
    }

    // Log for debugging
    console.log('Stdio Path:', stdioPath)
    console.log('Config Object:', config)

    const configJson = JSON.stringify(config)
    console.log('Config JSON:', configJson)

    const base64Config = base64EncodeUtf8(configJson)
    console.log('Base64 Config:', base64Config)

    const deepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(BRANDING.mcpServerName)}&config=${encodeURIComponent(base64Config)}`
    console.log('Full DeepLink:', deepLink)

    window.location.href = deepLink
    toast({
      title: t('mcp.openingCursorTitle'),
      description: t('mcp.openingCursorDescription'),
    })
  }

  // Generate config with actual path
  const getConfigWithPath = () => {
    if (client.id === 'cursor' || client.id === 'vscode' || client.id === 'antigravity') {
      const rootKey = client.id === 'vscode' ? 'servers' : 'mcpServers'
      const config = {
        [rootKey]: {
          [BRANDING.mcpServerName]: {
            ...(client.id === 'vscode' ? { type: 'stdio' } : {}),
            command: 'node',
            args: [stdioPath]
          }
        }
      }
      return JSON.stringify(config, null, 2)
    }
    return formatClientConfig(client)
  }

  const getCliCommand = () => {
    if (client.id === 'claude-code') {
      return `claude mcp add ${BRANDING.mcpServerName} node ${quoteShellArg(stdioPath)}`
    }
    if (client.id === 'codex') {
      // Codex requires `--` before the executable command.
      return `codex mcp add ${BRANDING.mcpServerName} -- node ${quoteShellArg(stdioPath)}`
    }
    return client.cliCommand || ''
  }

  return (
    <div className="space-y-4 px-1">
      {/* Cursor */}
      {client.id === 'cursor' && (
        <>
          <div className="space-y-3">
            <ConfigCodeBlock config={getConfigWithPath()} />
            <Separator />
            <h4 className="text-sm font-semibold mb-2">{t('mcp.deepLink')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('mcp.clickToOpenCursor', { serverName: BRANDING.mcpServerName })}
            </p>
            <Button
              onClick={handleDeepLink}
              size="default"
              disabled={stdioPath === '<STDIO_SERVER_PATH>' || stdioPath === '<ERROR_LOADING_PATH>'}
            >
              <ExternalLink className="mr-2 size-4" />
              {t('mcp.installInCursor')}
            </Button>
          </div>
        </>
      )}

      {/* CLI Clients */}
      {(client.id === 'claude-code' || client.id === 'codex') && (
        <>
          <div className="space-y-3">
            <ConfigCodeBlock config={getCliCommand()} />
          </div>
        </>
      )}

      {/* VS Code */}
      {client.id === 'vscode' && (
        <>
          <div className="space-y-3">
            <ConfigCodeBlock config={getConfigWithPath()} />
          </div>
        </>
      )}

      {/* Antigravity */}
      {client.id === 'antigravity' && (
        <>
          <div className="space-y-3">
            <ConfigCodeBlock config={getConfigWithPath()} />
          </div>
        </>
      )}

      <Separator />

      {/* Instructions */}
      <div>
        <h4 className="text-sm font-semibold mb-2">{t('mcp.instructions')}</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          {instructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
