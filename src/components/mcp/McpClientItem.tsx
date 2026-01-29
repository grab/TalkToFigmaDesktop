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
import { formatClientConfig } from '@/lib/mcp/client-configs'
import { useToast } from '@/hooks/use-toast'

interface McpClientItemProps {
  client: McpClient
}

export function McpClientItem({ client }: McpClientItemProps) {
  const { toast } = useToast()
  const [stdioPath, setStdioPath] = useState<string>('<STDIO_SERVER_PATH>')

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

    // Use Base64 encoding
    const base64Config = btoa(configJson)
    console.log('Base64 Config:', base64Config)

    const deepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=TalkToFigmaDesktop&config=${base64Config}`
    console.log('Full DeepLink:', deepLink)

    window.location.href = deepLink
    toast({
      title: 'Opening Cursor...',
      description: 'Follow the prompts in Cursor to complete installation',
    })
  }

  // Generate config with actual path
  const getConfigWithPath = () => {
    if (client.id === 'cursor' || client.id === 'vscode') {
      const config = {
        mcpServers: {
          TalkToFigmaDesktop: {
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
      return `claude mcp add TalkToFigmaDesktop node ${stdioPath}`
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
            <h4 className="text-sm font-semibold mb-2">Deep Link</h4>
            <p className="text-sm text-muted-foreground">
              Click the button to open Cursor and install TalkToFigmaDesktop
            </p>
            <Button
              onClick={handleDeepLink}
              size="default"
              disabled={stdioPath === '<STDIO_SERVER_PATH>' || stdioPath === '<ERROR_LOADING_PATH>'}
            >
              <ExternalLink className="mr-2 size-4" />
              Install in Cursor
            </Button>
          </div>
        </>
      )}

      {/* Claude Code */}
      {client.id === 'claude-code' && (
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

      <Separator />

      {/* Instructions */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Instructions</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          {client.instructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
