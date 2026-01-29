# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TalkToFigma Desktop** is an Electron-based desktop application that bridges Figma with AI tools (Cursor, Claude Code, VS Code) using the Model Context Protocol (MCP). It enables AI assistants to read and manipulate Figma designs through a structured protocol.

**Current Version:** 2.0.0
**Bundle ID:** com.grabtaxi.klever
**Architecture:** Electron + React + TypeScript

### Migration History
This project was migrated from Kotlin Compose Desktop to Electron in January 2026 (v2.0.0). The Electron version maintains feature parity while adding cross-platform support (macOS, Windows, Linux) and better developer experience with modern JavaScript tooling.

## Development Commands

### Start Development Server
```bash
npm start
# Launches Electron app with hot reload
# Main process: src/main.ts
# Renderer process: src/renderer.tsx
```

### Build & Package
```bash
npm run package  # Package for current platform
npm run make     # Create distributable installers
```

### Linting
```bash
npm run lint     # Run ESLint on TypeScript files
```

### Building Individual Components
The project uses Vite with multiple entry points configured in `forge.config.ts`:
- Main process: `src/main.ts` → `vite.main.config.ts`
- Preload script: `src/preload.ts` → `vite.preload.config.ts`
- Renderer: React app → `vite.renderer.config.ts`
- MCP stdio server: `src/main/server/mcp-stdio-server.ts` → `vite.stdio.config.ts`

## Architecture

### High-Level Overview

```
MCP Clients (Cursor, Claude Code, etc.)
    │ spawn independent process per client
    ▼
stdio MCP Servers (one per client)
    │ WebSocket connection (ws://127.0.0.1:3055)
    ▼
WebSocket Server (Electron App - Port 3055)
    │ Channel-based routing
    ▼
Figma Plugin
```

### Core Architectural Concepts

#### 1. **Multi-Process Architecture**
- Each MCP client (Cursor, Claude Code) spawns its own independent stdio server process
- stdio servers are NOT managed by the Electron app - they're spawned by the MCP clients themselves
- All stdio servers connect to the same WebSocket server (port 3055) in the Electron app
- This allows multiple AI tools to work with Figma simultaneously

#### 2. **Stdio Server Installation**
The MCP stdio server is automatically installed to platform-specific locations:
- **macOS**: `~/Library/Application Support/TalkToFigma/mcp-server.cjs`
- **Windows**: `%APPDATA%\TalkToFigma\mcp-server.cjs`

Installation happens on first app launch via `src/main/utils/stdio-installer.ts`. These paths are sandbox-safe for App Store distribution.

#### 3. **Channel-Based Isolation**
- The WebSocket server uses a channel system to isolate different Figma files
- Each MCP client must call `join_channel` tool with a Figma file ID before sending commands
- Messages are routed only to clients and plugins in the same channel
- This prevents command collisions when multiple Figma files are open

#### 4. **Communication Flow**
1. User sends command in MCP client (e.g., Cursor)
2. MCP client → stdin → MCP stdio server process
3. stdio server → WebSocket (port 3055) → Electron app
4. Electron app → WebSocket → Figma plugin
5. Figma executes command and returns result
6. Result flows back through the same chain via message ID matching

### Electron Process Architecture

#### Main Process (`src/main.ts`)
- Creates BrowserWindow (900x650, sidebar layout)
- Initializes singleton services:
  - `TalkToFigmaService` - Unified service orchestrator
  - `TalkToFigmaServerManager` - WebSocket server lifecycle manager
  - `TalkToFigmaTray` - System tray with quick actions
- Handles OAuth authentication flow
- Installs stdio server on startup
- Manages IPC communication with renderer

#### Renderer Process
- React 19 application (`src/renderer.tsx` → `src/App.tsx`)
- Three-page sidebar interface:
  - **Terminal**: Real-time log viewer with log streaming
  - **Settings**: MCP client configuration manager (generates config snippets)
  - **Help**: Documentation and troubleshooting
- Real-time status updates via IPC events
- Dark/light theme support

#### Preload Script (`src/preload.ts`)
- Security bridge with context isolation
- Exposes typed API surface via `window.electron`:
  - `server.*` - Server control (start/stop/status)
  - `figma.*` - Figma operations
  - `auth.*` - OAuth authentication
  - `mcp.*` - MCP configuration utilities
  - `log.*` - Log streaming

### Key Services Architecture

#### Service Layer Pattern
All services in `src/main/server/services/` extend `BaseFigmaService`:
- `document-service.ts` - Document operations (get nodes, search)
- `creation-service.ts` - Node creation (frames, rectangles, text, etc.)
- `channel-service.ts` - Channel management (join/leave/list)
- `rest-api-service.ts` - Figma REST API operations (comments, reactions)

Services use adapter pattern to decouple from UI layer - see `main.ts` for adapter implementations.

#### WebSocket Server (`src/main/server/TalkToFigmaWebSocketServer.ts`)
- Listens on port 3055
- Tracks two types of connections:
  - **MCP clients** (stdio servers spawned by Cursor/Claude Code)
  - **Figma plugins** (running in Figma)
- Channel-based message routing
- Message types: `join`, `message`, `progress_update`
- Connection count displayed in UI

#### MCP Stdio Server (`src/main/server/TalkToFigmaMcpServerStdio.ts`)
- Standalone process (not part of Electron app)
- Communicates via stdin/stdout using JSON-RPC
- Contains embedded WebSocket client (`src/main/server/shared/websocket-client.ts`)
- Supports 50 MCP tools (defined in `src/main/server/tools.ts`)
- Tool and prompt registries shared across all instances

### Figma Integration

#### OAuth Flow (`src/main/figma/oauth/FigmaOAuthService.ts`)
- Full OAuth 2.0 PKCE flow
- Local callback server on port 8888
- Token storage in electron-store
- Automatic refresh with 5-minute buffer before expiration
- Tokens used for Figma REST API access

#### REST API Client (`src/main/figma/api/FigmaApiClient.ts`)
- Authenticated requests to Figma API
- Operations: comments, reactions, file metadata, user info
- Token refresh handling

#### Plugin Communication
- Real-time bidirectional communication via WebSocket
- Plugin runs in Figma and executes design operations
- Commands sent from MCP clients → Electron → Plugin
- Results returned via request/response matching with timeouts

### Directory Structure Purpose

- **`src/main/`** - Main process code
  - `server/` - MCP servers, WebSocket server, service layer
  - `figma/` - OAuth and REST API integration
  - `utils/` - Utilities (logger, store, installer)
- **`src/lib/`** - Shared libraries
  - `mcp/` - MCP client configuration detection and generation
- **`src/components/`** - React components
  - `ui/` - Reusable UI components (shadcn/ui)
  - `mcp/` - MCP-specific components
- **`src/pages/`** - Page components (Terminal, Settings, Help)
- **`src/shared/`** - Code shared between main and renderer
  - `types/` - TypeScript type definitions
  - `constants.ts` - Shared constants (ports, channels, store keys)

### Path Aliases

TypeScript path alias `@/*` maps to `./src/*` (configured in `tsconfig.json`).

Example:
```typescript
import { logger } from '@/main/utils/logger';
import { ServerStatus } from '@/shared/types/server';
```

## Important Implementation Notes

### SSE to Stdio Migration
The codebase recently migrated from SSE transport to stdio transport (Jan 2026). Key changes:
- ❌ Removed HTTP server (port 3056)
- ❌ Removed SSE session management
- ✅ Added stdio-based spawning by clients
- ✅ Multi-client support with independent processes
- ✅ Better isolation and resource management

**Legacy code**: SSE server code in `src/main/server/TalkToFigmaMcpServer.ts` is marked `@deprecated` but kept for backward compatibility.

### IPC Communication Pattern
All IPC handlers are centralized in `src/main/ipc-handlers.ts`. The pattern:
1. Renderer calls via `window.electron.server.startAll()`
2. Preload exposes via `contextBridge`
3. Main process handles via `ipcMain.handle(IPC_CHANNELS.SERVER_START_ALL)`
4. Service method called via adapter
5. Status emitted back to renderer via `ipcMain.emit(IPC_CHANNELS.SERVER_STATUS_CHANGED)`

### Singleton Pattern Usage
These services MUST be singletons (initialized once in `main.ts`):
- `TalkToFigmaService` - Orchestrator for all operations
- `TalkToFigmaServerManager` - WebSocket server manager
- `TalkToFigmaTray` - System tray manager

Access via static `getInstance()` method.

### OAuth Token Management
- Tokens stored in electron-store with key `STORE_KEYS.FIGMA_AUTH`
- Never log tokens or expose in UI
- Auto-refresh happens 5 minutes before expiration
- Check `FigmaOAuthService.isAuthenticated()` before REST API calls

### MCP Tool Development
When adding new MCP tools:
1. Define tool schema in `src/main/server/tools.ts` using Zod
2. Add handler logic in appropriate service (`src/main/server/services/`)
3. Register in tool registry (`src/main/server/shared/tool-registry.ts`)
4. Tool automatically available to all stdio server instances

Tool naming convention: `{category}_{action}` (e.g., `document_get_node`, `node_create_frame`)

### Channel Joining Requirement
Before any MCP client can send commands to Figma:
1. Client must call `join_channel` tool with Figma file ID
2. File ID format: `{file_key}:{page_id}:{view_id}`
3. All subsequent commands routed to that channel
4. Multiple clients can join same channel for collaboration

### Port Usage
- **3055**: WebSocket server (managed by Electron app, MUST be running)
- **8888**: OAuth callback server (temporary, only during auth flow)

### Build Configuration
The project uses multiple Vite configs:
- `vite.main.config.ts` - Main process bundling
- `vite.renderer.config.ts` - Renderer process (React)
- `vite.preload.config.ts` - Preload script
- `vite.stdio.config.ts` - MCP stdio server (standalone executable)

The stdio server is bundled separately and copied to Application Support directory on installation.

**Bundle ID Configuration:**
- Bundle ID is hardcoded in `forge.config.ts` as `com.grabtaxi.klever`
- **IMPORTANT**: Never modify bundle ID via scripts or build processes
- This differs from the previous Kotlin version which used temporary bundle ID swapping for Grab Taxi builds

### Type Safety
- TypeScript strict mode enabled
- Shared types in `src/shared/types/`
- IPC message types defined in `src/shared/types/ipc.ts`
- All IPC channels use constants from `src/shared/constants.ts`

## Troubleshooting Common Issues

### "WebSocket server not running"
- Electron app must be running for stdio servers to connect
- Check if port 3055 is available: `lsof -i :3055` (macOS) or `netstat -ano | findstr :3055` (Windows)
- Look for startup errors in app logs (Terminal page)

### "stdio server not found"
- Check installation path exists: `ls -la ~/Library/Application\ Support/TalkToFigma/mcp-server.cjs`
- Reinstall by deleting the file and restarting the app
- Installation logs in main process console

### MCP client can't connect to Figma
- Ensure `join_channel` was called with correct file ID
- Verify Figma plugin is running in the target file
- Check WebSocket connection count in UI (Settings page)
- Review connection logs in Terminal page

### Build failures
- Clear Vite cache: `rm -rf .vite`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npx tsc --noEmit`

## Key Technologies

- **Electron 39** - Desktop app framework
- **React 19** - UI framework
- **TypeScript 4.5** - Type safety
- **Vite 5** - Build tool and bundler
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **WebSocket (ws)** - Real-time communication
- **shadcn/ui + Radix UI** - Component library
- **Tailwind CSS 4** - Styling
- **electron-store** - Persistent storage
- **winston** - Structured logging
- **Aptabase** - Privacy-friendly analytics
