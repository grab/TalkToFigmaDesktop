/**
 * Configuration Code Block Component
 *
 * Syntax-highlighted JSON display with integrated copy button
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface ConfigCodeBlockProps {
  config: string
}

export function ConfigCodeBlock({ config }: ConfigCodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(config)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="relative">
      <pre className="p-4 pr-12 bg-muted rounded-lg text-sm font-mono whitespace-pre-wrap break-all max-w-full">
        {config}
      </pre>
      <Button
        onClick={handleCopy}
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-8"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  )
}
