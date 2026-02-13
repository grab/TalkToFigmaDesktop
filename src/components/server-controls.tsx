"use client"

import { Play, Square, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { MCP, Figma } from '@lobehub/icons'
import { cn } from "@/lib/utils"

export interface ServerStatus {
    websocket: 'running' | 'stopped'
    mcp: 'running' | 'stopped'
    mcpClientCount?: number  // Number of connected MCP clients (stdio)
    figmaClientCount?: number // Number of connected Figma plugins
    error?: string | null  // Last error message
}

interface ServerControlsProps {
    status: ServerStatus
    onStart: () => void
    onStop: () => void
    onRestart?: () => void
    variant?: 'full' | 'mini'
    direction?: 'horizontal' | 'vertical'  // Only for mini variant
    className?: string
    disabled?: boolean
    error?: string | null  // Error message to display
}

/**
 * Reusable Server Controls component
 *
 * Variants:
 * - full: Full controls with status cards and labels
 * - mini: Minimal buttons only (icon-only, supports horizontal/vertical layout)
 */
export function ServerControls({
    status,
    onStart,
    onStop,
    onRestart,
    variant = 'full',
    direction = 'horizontal',
    className,
    disabled = false,
    error = null,
}: ServerControlsProps) {
    // In stdio mode, MCP is always available, so server control is WebSocket-based
    const wsRunning = status.websocket === 'running'

    // Toggle function - start if stopped, stop if running
    const handleToggle = () => {
        if (wsRunning) {
            onStop()
        } else {
            onStart()
        }
    }

    if (variant === 'mini') {
        return (
            <div className={cn(
                "flex gap-1",
                direction === 'vertical' ? "flex-col" : "items-center",
                className
            )}>
                <Button
                    size="icon"
                    variant={wsRunning ? "destructive" : "default"}
                    className="size-8"
                    onClick={handleToggle}
                    disabled={disabled}
                >
                    {wsRunning ? <Square className="size-4" /> : <Play className="size-4 ml-0.5" />}
                </Button>
                {onRestart && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={onRestart}
                        disabled={disabled || !wsRunning}
                    >
                        <RefreshCw className="size-4" />
                    </Button>
                )}
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className={cn(
                "rounded-lg border bg-card p-3",
                className
            )}>
                {/* Main Control - Rainbow Toggle Button + Restart */}
                <div className="flex items-center justify-center gap-2">
                    {/* Toggle Button - Rainbow when stopped, destructive when running */}
                    {wsRunning ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1 max-w-[180px]"
                                    onClick={handleToggle}
                                    disabled={disabled}
                                >
                                    <Square className="size-4 mr-2" />
                                    Stop Server
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Stop server</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <RainbowButton
                                    className="flex-1 max-w-[180px] h-8 text-sm"
                                    onClick={handleToggle}
                                    disabled={disabled}
                                >
                                    <Play className="size-4 mr-2" />
                                    Start Server
                                </RainbowButton>
                            </TooltipTrigger>
                            <TooltipContent>Start server</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Restart Button - Icon only */}
                    {onRestart && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-8 shrink-0"
                                    onClick={onRestart}
                                    disabled={disabled || !wsRunning}
                                >
                                    <RefreshCw className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restart server</TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* Server Status Cards */}
                <div className="flex flex-col gap-2 mt-3">
                    {/* WebSocket Server */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Figma size={16} className="shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium">Figma Bridge</span>
                                <span className="text-[10px] text-muted-foreground">WebSocket :3055</span>
                            </div>
                        </div>
                        <Badge
                            variant={status.websocket === 'running' ? 'default' : 'secondary'}
                            className={cn(
                                "text-[10px] px-1.5 py-0",
                                status.websocket === 'running' && "bg-green-500 hover:bg-green-500"
                            )}
                        >
                            {status.websocket === 'running' ? 'ON' : 'OFF'}
                        </Badge>
                    </div>

                    {/* MCP Server */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                            <MCP size={16} className="shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium">MCP Bridge</span>
                                <span className="text-[10px] text-muted-foreground">
                                    stdio {status.mcpClientCount !== undefined ? `(${status.mcpClientCount} ${status.mcpClientCount === 1 ? 'client' : 'clients'})` : ''}
                                </span>
                            </div>
                        </div>
                        <Badge
                            variant={status.mcp === 'running' ? 'default' : 'secondary'}
                            className={cn(
                                "text-[10px] px-1.5 py-0",
                                status.mcp === 'running' && "bg-green-500 hover:bg-green-500"
                            )}
                        >
                            {status.mcp === 'running' ? 'ON' : 'OFF'}
                        </Badge>
                    </div>
                </div>

                {/* Status Summary - Simple description only */}
                <div className="text-center mt-2">
                    <p className="text-xs text-muted-foreground">
                        {error ? error : (wsRunning ? 'Server running' : 'Server stopped')}
                    </p>
                </div>
            </div>
        </TooltipProvider>
    )
}
