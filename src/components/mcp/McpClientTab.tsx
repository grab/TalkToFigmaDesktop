/**
 * Individual MCP Client Tab Component
 *
 * Shows configuration, status, buttons, and instructions for a specific client
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Copy, Check, Zap, FolderOpen, RotateCcw, AlertCircle } from 'lucide-react'
import { ConfigStatusBadge } from './ConfigStatusBadge'
import { ConfigCodeBlock } from './ConfigCodeBlock'
import type { McpClient } from '@/lib/mcp/client-configs'
import type { ConfigDetectionResult } from '@/shared/types/ipc'
import { formatClientConfig } from '@/lib/mcp/client-configs'
import { useToast } from '@/hooks/use-toast'

interface McpClientTabProps {
  client: McpClient
  configState?: ConfigDetectionResult
  onConfigChange: () => void
}

export function McpClientTab({ client, configState, onConfigChange }: McpClientTabProps) {
  const [copied, setCopied] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const { toast } = useToast()

  const configJson = formatClientConfig(client)
  const canAutoConfigure = !client.comingSoon && client.configFormat === 'json'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: 'Copied!',
        description: 'Configuration copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleAutoConfig = async () => {
    setIsConfiguring(true)
    try {
      const result = await window.electron.mcp.autoConfig(client.id)

      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        })
        onConfigChange()
      } else {
        toast({
          title: 'Configuration Failed',
          description: result.error || result.message,
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to auto-configure',
        variant: 'destructive',
      })
    } finally {
      setIsConfiguring(false)
    }
  }

  const handleOpenFolder = async () => {
    try {
      const result = await window.electron.mcp.openConfigFolder(client.id)
      if (!result.success) {
        toast({
          title: 'Failed to open folder',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleRestoreBackup = async () => {
    try {
      const result = await window.electron.mcp.restoreBackup(client.id)
      if (result.success) {
        toast({
          title: 'Backup Restored',
          description: result.message,
        })
        onConfigChange()
      } else {
        toast({
          title: 'Restore Failed',
          description: result.error || result.message,
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {client.displayName}
            </CardTitle>
            <CardDescription className="mt-2">
              {client.comingSoon
                ? 'Configuration format is currently being researched'
                : `Configure ${client.displayName} to use TalkToFigma Desktop`}
            </CardDescription>
          </div>
          {configState && (
            <ConfigStatusBadge status={configState.status} />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {client.comingSoon ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <div className="flex gap-2">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-amber-600 dark:text-amber-400">
                  Coming Soon
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Support for {client.displayName} is under development. Check back for updates.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Configuration Display */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Configuration</h4>
              <ConfigCodeBlock config={configJson} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" />
                    Copy
                  </>
                )}
              </Button>

              {canAutoConfigure && (
                <Button
                  onClick={handleAutoConfig}
                  disabled={isConfiguring}
                  size="sm"
                >
                  <Zap className="mr-2 size-4" />
                  {isConfiguring ? 'Configuring...' : 'Auto-Configure'}
                </Button>
              )}

              {client.configPath && (
                <Button
                  onClick={handleOpenFolder}
                  variant="outline"
                  size="sm"
                >
                  <FolderOpen className="mr-2 size-4" />
                  Open Folder
                </Button>
              )}

              {configState?.status === 'configured' && (
                <Button
                  onClick={handleRestoreBackup}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="mr-2 size-4" />
                  Restore Backup
                </Button>
              )}
            </div>

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

            {/* Config Path */}
            {client.configPath && (
              <div className="text-xs text-muted-foreground">
                <strong>Config Location:</strong> {client.configPath}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
