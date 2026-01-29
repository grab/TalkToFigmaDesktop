/**
 * Tutorial Dialog Component
 *
 * Shows onboarding tutorial on first launch or when explicitly requested.
 * Guides users through Figma plugin installation, MCP configuration, and first steps.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExternalLink } from 'lucide-react'

interface TutorialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

interface TutorialStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
  completed?: boolean
}

export function TutorialDialog({ open, onOpenChange, onComplete }: TutorialDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to TalkToFigma Desktop',
      description: 'Your AI-powered Figma automation assistant',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            TalkToFigma Desktop bridges Figma with AI assistants like Claude Code and Cursor,
            enabling powerful automation and interactive design workflows.
          </p>
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <h4 className="font-semibold text-sm">What you can do:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✨ Control Figma elements via AI commands</li>
              <li>💬 Respond to Figma comments with AI</li>
              <li>🎨 Automate design system tasks</li>
              <li>🔄 Sync design changes programmatically</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'figma-plugin',
      title: 'Install Figma Plugin',
      description: 'Connect your Figma workspace',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Install the TalkToFigma plugin in Figma to enable WebSocket communication
            between this desktop app and your Figma files.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Open Figma Desktop App</p>
                <p className="text-sm text-muted-foreground">Launch Figma on your computer</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Access Plugins Menu</p>
                <p className="text-sm text-muted-foreground">
                  Go to Menu → Plugins → Development → Import plugin from manifest
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Select Plugin Manifest</p>
                <p className="text-sm text-muted-foreground">
                  Choose the <code className="text-xs bg-muted px-1 py-0.5 rounded">manifest.json</code> file from TalkToFigma plugin folder
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.electron?.openExternal?.('https://github.com/your-repo/talktofigma-plugin')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Download Plugin Files
          </Button>
        </div>
      ),
    },
    {
      id: 'mcp-setup',
      title: 'Configure MCP Server',
      description: 'Connect with Claude Code or Cursor',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Configure your AI assistant to use TalkToFigma via stdio transport.
            The MCP server will be spawned automatically by your AI client.
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">For Claude Code:</h4>
              <div className="rounded-md bg-muted p-3 text-xs font-mono">
                claude mcp add TalkToFigmaDesktop \<br />
                &nbsp;&nbsp;node &lt;PATH_TO_MCP_STDIO_SERVER&gt;
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">For Cursor:</h4>
              <p className="text-sm text-muted-foreground">
                Add to your <code className="text-xs bg-muted px-1 py-0.5 rounded">mcp_config.json</code>:
              </p>
              <div className="rounded-md bg-muted p-3 text-xs font-mono mt-2">
                &#123;<br />
                &nbsp;&nbsp;"TalkToFigmaDesktop": &#123;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"command": "node",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"args": ["&lt;PATH_TO_MCP_STDIO_SERVER&gt;"]<br />
                &nbsp;&nbsp;&#125;<br />
                &#125;
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ℹ️ Find the exact command in Settings → MCP Client Configuration
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Make sure WebSocket server (port 3055) is running before using MCP tools
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'start-servers',
      title: 'Start TalkToFigma Server',
      description: 'Launch WebSocket server for Figma communication',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            TalkToFigma Desktop runs a WebSocket server to communicate with Figma:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="rounded-full bg-primary/10 p-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">WebSocket Server (Port 3055)</p>
                <p className="text-xs text-muted-foreground">
                  Communicates with Figma plugin for real-time design operations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="rounded-full bg-blue-500/10 p-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">MCP Server (stdio)</p>
                <p className="text-xs text-muted-foreground">
                  Spawned automatically by your AI client when needed
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">How to start:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click the "Start All" button in the sidebar</li>
              <li>Wait for WebSocket server to show green status</li>
              <li>Check the Terminal page for connection logs</li>
            </ol>
          </div>
          <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              ℹ️ The MCP server will start automatically when you use AI tools
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'first-command',
      title: 'Try Your First Command',
      description: 'Test the complete workflow',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Let's verify everything is working with a simple test:
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Step 1: Connect Figma Plugin</h4>
              <p className="text-sm text-muted-foreground">
                Open any Figma file, run the TalkToFigma plugin, and click "Connect to Server"
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Step 2: Test from AI Assistant</h4>
              <p className="text-sm text-muted-foreground">
                In Claude Code or Cursor, try a simple command:
              </p>
              <div className="rounded-md bg-muted p-3 text-sm">
                "Use TalkToFigma to get the current document info"
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Step 3: Verify Connection</h4>
              <p className="text-sm text-muted-foreground">
                Check the Terminal page for successful command execution logs
              </p>
            </div>
          </div>
          <div className="rounded-lg border-2 border-green-500/50 bg-green-500/10 p-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              🎉 You're all set! Explore more commands in the Help page.
            </p>
          </div>
        </div>
      ),
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
      onOpenChange(false)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
    onOpenChange(false)
  }

  const currentStepData = steps[currentStep]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{currentStepData.title}</span>
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} / {steps.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicators */}
        <div className="flex gap-2 pb-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className="flex-1 h-2 rounded-full bg-muted overflow-hidden transition-all hover:opacity-80"
            >
              <div
                className={`h-full transition-all ${
                  index <= currentStep ? 'bg-primary' : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row justify-between items-center gap-2 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
          >
            Skip Tutorial
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
