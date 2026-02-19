import { Terminal } from '@/components/ui/terminal'
import { useEffect, useRef } from 'react'

interface TerminalPageProps {
    logs: string[]
}

export function TerminalPage({ logs }: TerminalPageProps) {
    const bottomRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    // Parse and style log line with colored level only
    const renderLogLine = (log: string) => {
        // Match pattern: HH:mm:ss level [source] message
        const logPattern = /^(\d{2}:\d{2}:\d{2})\s+(error|warn|info|debug)\s+(.*)$/i
        const match = log.match(logPattern)

        if (!match) {
            // No match, return as-is with default color
            return <span className="text-foreground/80">{log}</span>
        }

        const [, time, level, rest] = match
        const levelLower = level.toLowerCase()

        // Color map for log levels
        const levelColors: Record<string, string> = {
            error: 'text-red-500',
            warn: 'text-yellow-500',
            info: 'text-green-400',
            debug: 'text-blue-400',
        }

        const levelColor = levelColors[levelLower] || 'text-foreground/80'

        return (
            <>
                <span className="text-foreground/60">{time} </span>
                <span className={levelColor}>{level}</span>
                <span className="text-foreground/80"> {rest}</span>
            </>
        )
    }

    return (
        <div className="h-full w-full flex flex-col">
            <Terminal className="flex-1 w-full overflow-auto">
                {logs.map((log, index) => (
                    <div key={index} className="font-mono text-xs whitespace-pre-wrap break-all">
                        {renderLogLine(log)}
                    </div>
                ))}
                <div ref={bottomRef} />
            </Terminal>
        </div>
    )
}
