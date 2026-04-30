import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar, PageId } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LocaleProvider } from '@/components/LocaleProvider'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { Button } from '@/components/ui/button'
import { Copy, Check, RotateCcw, ListTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Pages
import { TerminalPage } from '@/pages/Terminal'

const TutorialDialog = lazy(() => import('@/components/TutorialDialog').then((module) => ({ default: module.TutorialDialog })))
const SseMigrationDialog = lazy(() => import('@/components/SseMigrationDialog').then((module) => ({ default: module.SseMigrationDialog })))
const SettingsPage = lazy(() => import('@/pages/Settings').then((module) => ({ default: module.SettingsPage })))
const HelpPage = lazy(() => import('@/pages/Help').then((module) => ({ default: module.HelpPage })))
const AssistantPage = lazy(() => import('@/pages/Assistant').then((module) => ({ default: module.AssistantPage })))

function PageFallback() {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
      Loading...
    </div>
  )
}

// Track page view when page changes
function usePageViewTracking(currentPage: PageId, title: string) {
  const prevPage = useRef<PageId | null>(null)

  useEffect(() => {
    // Only track if page actually changed (not on initial mount)
    if (prevPage.current !== null && prevPage.current !== currentPage) {
      window.electron?.analytics?.track('pageView', {
        title,
        location: `talktofigma://${currentPage}`,
        path: `/${currentPage}`,
      })
    }
    prevPage.current = currentPage
  }, [currentPage, title])
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch (error) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', 'true')
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)

    let copied = false
    try {
      textArea.select()
      copied = document.execCommand('copy')
    } finally {
      document.body.removeChild(textArea)
    }

    if (!copied) {
      throw error
    }
  }
}

function AppContent() {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState<PageId>('terminal')
  const [serverStatus, setServerStatus] = useState({
    websocket: 'stopped' as 'running' | 'stopped',
    mcp: 'stopped' as 'running' | 'stopped',
    mcpClientCount: undefined as number | undefined,
    figmaClientCount: undefined as number | undefined,
    error: null as string | null,
  })
  const [figmaUser, setFigmaUser] = useState<{ name: string; email: string; avatar?: string } | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const pageLabels: Record<PageId, string> = {
    assistant: t('app.nav.assistant'),
    terminal: t('app.nav.terminal'),
    settings: t('app.nav.settings'),
    help: t('app.nav.help'),
  }

  // Track page view changes
  usePageViewTracking(currentPage, pageLabels[currentPage])

  // Set initial welcome message
  useEffect(() => {
    const welcomeArt = `  _____     _ _      _____        _____ _
 |_   _|   | | |    |_   _|      |  ___(_)
   | | __ _| | | __   | | ___    | |_   _  __ _ _ __ ___   __ _
   | |/ _\` | | |/ /   | |/ _ \\   |  _| | |/ _\` | '_ \` _ \\ / _\` |
   | | (_| | |   <    | | (_) |  | |   | | (_| | | | | | | (_| |
   \\_/\\__,_|_|_|\\_\\   \\_/\\___/   |_|   |_|\\__, |_| |_| |_|\\__,_|
                                           __/ |
                                          |___/`
    const welcomeMessage = `TalkToFigma Desktop v${__APP_VERSION__}
Ready to bridge Figma and AI tools via MCP
→ Start the server to see logs`

    setLogs([welcomeArt, '', welcomeMessage, ''])
  }, [])

  // Check if this is first launch and show tutorial
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeenTutorial = await window.electron.settings.get('hasSeenTutorial')
        if (!hasSeenTutorial) {
          // Delay tutorial opening by 1 second for better UX
          setTimeout(() => setTutorialOpen(true), 1000)
        }
      } catch (error) {
        console.error('Failed to check first launch status:', error)
      }
    }
    checkFirstLaunch()
  }, [])

  // Listen for legacy SSE client detection
  useEffect(() => {
    const unsubscribe = window.electron?.sse?.onClientDetected(() => {
      setMigrationDialogOpen(true)
    })
    return () => unsubscribe?.()
  }, [])

  const handleTutorialComplete = async () => {
    try {
      await window.electron.settings.set('hasSeenTutorial', true)
    } catch (error) {
      console.error('Failed to save tutorial completion:', error)
    }
  }

  // Fetch initial server status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await window.electron.server.getStatus()
        setServerStatus({
          websocket: status.websocket.status === 'running' ? 'running' : 'stopped',
          mcp: status.mcp.status === 'running' ? 'running' : 'stopped',
          mcpClientCount: status.websocket.mcpClientCount,
          figmaClientCount: status.websocket.figmaClientCount,
          error: status.lastError,
        })
      } catch (error) {
        console.error('Failed to fetch server status:', error)
      }
    }
    fetchStatus()

    // Subscribe to status changes
    const unsubscribe = window.electron.server.onStatusChanged((status) => {
      setServerStatus({
        websocket: status.websocket.status === 'running' ? 'running' : 'stopped',
        mcp: status.mcp.status === 'running' ? 'running' : 'stopped',
        mcpClientCount: status.websocket.mcpClientCount,
        figmaClientCount: status.websocket.figmaClientCount,
        error: status.lastError,
      })
    })

    return () => unsubscribe()
  }, [])

  // Fetch initial auth status and subscribe to changes
  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const authStatus = await window.electron.figma.getAuthStatus()
        if (authStatus.isAuthenticated && authStatus.user) {
          setFigmaUser({
            name: authStatus.user.handle || authStatus.user.email || 'Figma User',
            email: authStatus.user.email || '',
            avatar: authStatus.user.imgUrl,
          })
        }
      } catch (error) {
        console.error('Failed to fetch auth status:', error)
      }
    }
    fetchAuthStatus()

    // Subscribe to auth status changes
    const unsubscribe = window.electron.auth.onStatusChanged((data) => {
      if (data.isAuthenticated && data.user) {
        setFigmaUser({
          name: data.user.handle || data.user.email || 'Figma User',
          email: data.user.email || '',
          avatar: data.user.imgUrl,
        })
      } else {
        setFigmaUser(null)
      }
    })

    return () => unsubscribe()
  }, [])

  // Subscribe to log events
  useEffect(() => {
    const unsubscribe = window.electron.log.onEntry((entry) => {
      // Format: HH:mm:ss level [source] message (matching winston console format)
      const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      const source = entry.source ? `[${entry.source}]` : ''
      const logLine = `${time} ${entry.level} ${source} ${entry.message}`
      setLogs((prev) => [...prev.slice(-500), logLine]) // Keep last 500 logs
    })

    return () => unsubscribe()
  }, [])

  // Subscribe to tray navigation events
  useEffect(() => {
    const unsubscribe = window.electron.tray.onNavigateToPage((page) => {
      setCurrentPage(page)
    })

    return () => unsubscribe()
  }, [])

  const handleStartAll = async () => {
    try {
      await window.electron.server.start()
    } catch (error) {
      console.error('Failed to start servers:', error)
    }
  }

  const handleStopAll = async () => {
    try {
      await window.electron.server.stop()
    } catch (error) {
      console.error('Failed to stop servers:', error)
    }
  }

  const handleRestartAll = async () => {
    try {
      await window.electron.server.restart()
    } catch (error) {
      console.error('Failed to restart servers:', error)
    }
  }

  const handleFigmaLogin = async () => {
    try {
      await window.electron.figma.startOAuth()
    } catch (error) {
      console.error('Failed to start Figma OAuth:', error)
    }
  }

  const handleFigmaLogout = async () => {
    try {
      await window.electron.figma.logout()
      setFigmaUser(null)
    } catch (error) {
      console.error('Failed to logout from Figma:', error)
    }
  }

  const handleCopyLogs = async () => {
    try {
      // Get last 200 lines from logs
      const last200Lines = logs.slice(-200).join('\n')
      await copyTextToClipboard(last200Lines)
      setCopied(true)
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy logs:', error)
    }
  }

  const handleClearLogs = () => {
    // Set welcome message as first log entry
    const welcomeArt = `  _____     _ _      _____        _____ _
 |_   _|   | | |    |_   _|      |  ___(_)
   | | __ _| | | __   | | ___    | |_   _  __ _ _ __ ___   __ _
   | |/ _\` | | |/ /   | |/ _ \\   |  _| | |/ _\` | '_ \` _ \\ / _\` |
   | | (_| | |   <    | | (_) |  | |   | | (_| | | | | | | (_| |
   \\_/\\__,_|_|_|\\_\\   \\_/\\___/   |_|   |_|\\__, |_| |_| |_|\\__,_|
                                           __/ |
                                          |___/`
    const welcomeMessage = `TalkToFigma Desktop v${__APP_VERSION__}
Ready to bridge Figma and AI tools via MCP
→ Start the server to see logs`

    setLogs([welcomeArt, '', welcomeMessage, ''])
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'assistant':
        return <AssistantPage />
      case 'terminal':
        return <TerminalPage logs={logs} />
      case 'settings':
        return (
          <SettingsPage
            onNavigateToSettings={() => setCurrentPage('settings')}
          />
        )
      case 'help':
        return <HelpPage />
      default:
        return <TerminalPage logs={logs} />
    }
  }

  return (
    <ThemeProvider>
      {tutorialOpen && (
        <Suspense fallback={null}>
          <TutorialDialog
            open={tutorialOpen}
            onOpenChange={setTutorialOpen}
            onComplete={handleTutorialComplete}
          />
        </Suspense>
      )}
      {migrationDialogOpen && (
        <Suspense fallback={null}>
          <SseMigrationDialog
            open={migrationDialogOpen}
            onClose={() => setMigrationDialogOpen(false)}
            onGoToSettings={() => {
              setMigrationDialogOpen(false)
              setCurrentPage('settings')
            }}
          />
        </Suspense>
      )}
      <SidebarProvider>
        <AppSidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          serverStatus={serverStatus}
          figmaUser={figmaUser}
          onStartAll={handleStartAll}
          onStopAll={handleStopAll}
          onRestartAll={handleRestartAll}
          onFigmaLogin={handleFigmaLogin}
          onFigmaLogout={handleFigmaLogout}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageLabels[currentPage]}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              {currentPage === 'terminal' && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearLogs}
                    className="w-9 h-9"
                    title={t('app.header.clearLogs')}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="sr-only">{t('app.header.clearTerminalLogs')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyLogs}
                    className="w-9 h-9"
                    title={t('app.header.copyLast200Lines')}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">{t('app.header.copyTerminalLogs')}</span>
                  </Button>
                </>
              )}
              {currentPage === 'assistant' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9"
                  title={t('app.header.openThreads')}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('assistant:open-threads'))
                  }}
                >
                  <ListTree className="h-4 w-4" />
                  <span className="sr-only">{t('app.header.openAssistantThreads')}</span>
                </Button>
              )}
              <AnimatedThemeToggler
                className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors [&>svg]:size-4"
              />
            </div>
          </header>
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-4">
            <Suspense fallback={<PageFallback />}>
              {renderPage()}
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}

function App() {
  return (
    <LocaleProvider>
      <AppContent />
    </LocaleProvider>
  )
}

export default App
