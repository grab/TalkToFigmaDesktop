/**
 * SSE Migration Dialog
 *
 * Shown when a legacy MCP client attempts to connect via the deprecated SSE transport
 * (GET http://127.0.0.1:3056/sse). Guides the user to update their configuration
 * to the new stdio-based transport.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight, Settings } from 'lucide-react'

interface SseMigrationDialogProps {
  open: boolean
  onClose: () => void
  onGoToSettings?: () => void
}

export function SseMigrationDialog({ open, onClose, onGoToSettings }: SseMigrationDialogProps) {
  const handleGoToSettings = () => {
    onClose()
    onGoToSettings?.()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500 shrink-0" />
            Legacy Configuration Detected
          </DialogTitle>
          <DialogDescription>
            An MCP client is trying to connect using the old SSE method, which is no longer supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* What happened */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">What happened?</p>
            <p className="text-muted-foreground">
              A connection was attempted to{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                http://127.0.0.1:3056/sse
              </code>
              . This SSE transport has been replaced by stdio.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <p className="text-sm font-medium">How to fix</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Open <strong>Settings</strong> and find the MCP Client Configuration section
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Remove any existing SSE-based configuration from your MCP client
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Follow the new stdio setup instructions for your client (Cursor, Claude Code, etc.)
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Dismiss
          </Button>
          <Button onClick={handleGoToSettings} className="gap-2">
            <Settings className="size-4" />
            Go to Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
