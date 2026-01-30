/**
 * Tutorial Dialog Component
 *
 * Shows onboarding tutorial on first launch or when explicitly requested.
 * Guides users through MCP setup, Figma plugin installation, and getting started.
 */

import { useState, useRef, useEffect } from 'react'
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
import { Youtube } from 'lucide-react'
import { Figma } from '@lobehub/icons'
import { McpMultiClientConfig } from '@/components/mcp'
import { Confetti, type ConfettiRef } from '@/components/ui/confetti'

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
}

export function TutorialDialog({ open, onOpenChange, onComplete }: TutorialDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const confettiRef = useRef<ConfettiRef>(null)

  // Trigger confetti when reaching Step 3
  useEffect(() => {
    if (currentStep === 2 && confettiRef.current) {
      confettiRef.current.fire()
    }
  }, [currentStep])

  const steps: TutorialStep[] = [
    {
      id: 'server-and-mcp',
      title: 'Step 1: Start Server & Configure MCP',
      description: 'Launch the WebSocket server and register MCP',
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Click <strong>"Start All"</strong> in the sidebar to launch the server.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Configure MCP Client</h4>
            <div className="border rounded-lg p-4 bg-muted/30">
              <McpMultiClientConfig />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'figma-plugin',
      title: 'Step 2: Connect Figma Plugin',
      description: 'Connect TalkToFigma plugin to the server',
      content: (
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => window.electron?.shell?.openExternal?.('https://www.figma.com/community/plugin/1434378778965458683/talktofigma')}
          >
            <Figma className="mr-2" size={16} />
            Install Plugin
          </Button>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <p className="text-sm text-muted-foreground flex-1">
                Open Figma and search for "TalkToFigma" plugin
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <p className="text-sm text-muted-foreground flex-1">
                Run the plugin and click "Connect"
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'get-started',
      title: 'Step 3: Join Channel & Start Using',
      description: 'Connect to channel and explore features',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-2xl text-center">🎉</p>
            <p className="text-base font-semibold text-center">
              You're ready to control Figma with AI!
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Connect to a channel in your AI client and start using TalkToFigma
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Video Tutorials</p>
            <div className="space-y-2">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.electron?.shell?.openExternal?.('https://www.youtube.com/playlist?list=PLLQlZaiiGlHOdfqGoErLQaMaDPZdHARVV')
                }}
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
              >
                <Youtube className="h-4 w-4" />
                Talk To Figma Usage Examples
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.electron?.shell?.openExternal?.('https://www.youtube.com/playlist?list=PLPM-mNLGkfO_n7KKIFD_2GfFTs9y90hnd')
                }}
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
              >
                <Youtube className="h-4 w-4" />
                Figma Tutor's Installation Guide
              </a>
            </div>
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
      <Confetti
        ref={confettiRef}
        manualstart
        options={{
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        }}
      />
      <DialogContent className="max-w-2xl flex flex-col h-[580px]">
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
        <DialogFooter className="flex-row justify-between items-center gap-2 pt-4 border-t shrink-0">
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
