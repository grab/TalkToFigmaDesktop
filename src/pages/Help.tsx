import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HelpCircle, ExternalLink, FileText, Github, BookOpen, MessageCircle } from 'lucide-react'

export function HelpPage() {
    const openExternal = (url: string) => {
        window.electron?.shell?.openExternal?.(url)
    }

    return (
        <div className="space-y-6 max-w-3xl pb-6">
            {/* Getting Started */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="size-5" />
                        Getting Started
                    </CardTitle>
                    <CardDescription>
                        Learn how to use TalkToFigma Desktop with our interactive tutorial
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Follow our step-by-step tutorial to get started with TalkToFigma Desktop.
                        Learn how to connect Figma, configure MCP, and control your designs with AI.
                    </p>
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={async () => {
                            // Reset the hasSeenTutorial flag and reload to show tutorial
                            await window.electron.settings.set('hasSeenTutorial', false)
                            window.location.reload()
                        }}
                    >
                        <BookOpen className="size-4 mr-2" />
                        Open Tutorial
                    </Button>
                </CardContent>
            </Card>

            {/* Get Help */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="size-5" />
                        Get Help
                    </CardTitle>
                    <CardDescription>
                        Need assistance? Report issues or ask questions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openExternal('https://github.com/grab/TalkToFigmaDesktop/issues')}
                    >
                        <HelpCircle className="size-4 mr-2" />
                        Report an Issue
                        <ExternalLink className="size-3 ml-auto" />
                    </Button>
                </CardContent>
            </Card>

            {/* Resources */}
            <Card>
                <CardHeader>
                    <CardTitle>Resources</CardTitle>
                    <CardDescription>Documentation and community links</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openExternal('https://github.com/grab/TalkToFigmaDesktop')}
                    >
                        <Github className="size-4 mr-2" />
                        GitHub Repository
                        <ExternalLink className="size-3 ml-auto" />
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openExternal('https://modelcontextprotocol.io')}
                    >
                        <FileText className="size-4 mr-2" />
                        MCP Protocol Documentation
                        <ExternalLink className="size-3 ml-auto" />
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openExternal('https://www.figma.com/plugin-docs/')}
                    >
                        <FileText className="size-4 mr-2" />
                        Figma Plugin API Docs
                        <ExternalLink className="size-3 ml-auto" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
