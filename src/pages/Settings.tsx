import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link2, Copy, AlertTriangle } from 'lucide-react'
import { Figma, MCP } from '@lobehub/icons'
import { McpMultiClientConfig } from '@/components/mcp'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'
import { SseMigrationDialog } from '@/components/SseMigrationDialog'

interface SettingsPageProps {
    onNavigateToSettings?: () => void
}

export function SettingsPage({ onNavigateToSettings }: SettingsPageProps) {
    const { toast } = useToast()
    const [stdioPath, setStdioPath] = useState<string>('Loading...')
    const [showMigrationDialog, setShowMigrationDialog] = useState(false)

    useEffect(() => {
        // Load stdio server path
        if (window.electron?.mcp?.getStdioPath) {
            window.electron.mcp.getStdioPath().then(path => {
                setStdioPath(path)
            }).catch(() => {
                setStdioPath('Error loading path')
            })
        } else {
            setStdioPath('Not available')
        }
    }, [])

    const copyStdioPath = () => {
        if (stdioPath && stdioPath !== 'Loading...' && stdioPath !== 'Error loading path') {
            navigator.clipboard.writeText(stdioPath)
            toast({
                title: 'Copied to clipboard',
                description: 'Stdio server path has been copied',
            })
        }
    }

    return (
        <div className="space-y-6 w-full pb-6">
            {/* Multi-Client MCP Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MCP size={20} className="shrink-0" />
                        MCP Client Configuration
                    </CardTitle>
                    <CardDescription>
                        Configure TalkToFigma Desktop with your preferred MCP client
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <McpMultiClientConfig />
                </CardContent>
            </Card>

            {/* Server Endpoints */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="size-5" />
                        Server Information
                    </CardTitle>
                    <CardDescription>MCP server connection details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                            <MCP size={16} className="shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium">MCP Server Path</p>
                                <p className="text-muted-foreground text-xs">stdio transport (spawned by clients)</p>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={copyStdioPath}
                                disabled={!stdioPath || stdioPath === 'Loading...' || stdioPath === 'Error loading path'}
                            >
                                <Copy className="size-4" />
                            </Button>
                        </div>
                        <code className="bg-background px-2 py-1 rounded text-xs break-all">
                            {stdioPath}
                        </code>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                            <Figma size={16} className="shrink-0 text-muted-foreground" />
                            <div>
                                <p className="font-medium">WebSocket Bridge</p>
                                <p className="text-muted-foreground text-xs">For Figma plugin communication</p>
                            </div>
                        </div>
                        <code className="bg-background px-2 py-1 rounded text-xs">ws://localhost:3055</code>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="shrink-0 text-muted-foreground" />
                            <div>
                                <p className="font-medium">SSE Migration</p>
                                <p className="text-muted-foreground text-xs">Legacy SSE connection guide</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowMigrationDialog(true)}>
                            Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <SseMigrationDialog
                open={showMigrationDialog}
                onClose={() => setShowMigrationDialog(false)}
                onGoToSettings={onNavigateToSettings}
            />
        </div>
    )
}
