<p align="center">
  <img src="./icon.png" width="128" height="128" alt="TalkToFigma Desktop">
</p>

<h1 align="center">TalkToFigma Desktop</h1>

<p align="center">
  <b>A powerful desktop application bridging Figma and AI tools via Model Context Protocol</b>
  <br>
  <i>Seamless integration between Figma designs and AI assistants</i>
</p>

<p align="center">
  <a href="https://github.com/grab/TalkToFigmaDesktop/releases">
    <img src="https://img.shields.io/github/v/release/grab/TalkToFigmaDesktop?style=flat-square" alt="Latest Release">
  </a>
  <a href="https://github.com/grab/TalkToFigmaDesktop/actions/workflows/build.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/grab/TalkToFigmaDesktop/build.yml?style=flat-square&label=build" alt="Build Status">
  </a>
  <a href="https://github.com/grab/TalkToFigmaDesktop/actions/workflows/test.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/grab/TalkToFigmaDesktop/test.yml?style=flat-square&label=test" alt="Test Status">
  </a>
  <a href="https://github.com/grab/TalkToFigmaDesktop/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/node-18%2B-green?style=flat-square&logo=node.js" alt="Node.js">
  </a>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#features">Features</a> •
  <a href="#building-from-source">Building from Source</a> •
  <a href="#troubleshooting">Troubleshooting</a>
</p>

---

## ⚠️ Disclaimer

> [!IMPORTANT]
> **This project is not affiliated with, sponsored by, or endorsed by Figma, Inc.** This is an independent, community-developed open source project that provides interoperability with Figma's platform. "Figma" is a trademark of Figma, Inc. The use of the Figma name in this project is purely descriptive, indicating the software's functionality to interact with Figma files and the Figma API.

## Features

- 🚀 **Multi-Client Support**: Connect multiple AI tools simultaneously (Cursor, Claude Code, VS Code)
- 📡 **WebSocket Server**: Real-time bidirectional communication on port 3055
- 🔧 **50+ MCP Tools**: Comprehensive Figma operations via Model Context Protocol
- 🖥️ **System Tray**: Clean interface with status indicators
- 📊 **Real-Time Logs**: Built-in terminal with log streaming
- ⚙️ **Easy Configuration**: Copy-paste MCP configuration for any client
- 🔄 **stdio Transport**: Independent server processes per AI tool
- 🌐 **Cross-Platform**: macOS (universal), Windows

## Installation

### Download Pre-built Releases

1. Go to [Releases](https://github.com/grab/TalkToFigmaDesktop/releases)
2. Download the appropriate version for your platform:
   - **macOS**: `TalkToFigma-v*.*.*.zip` (Universal: Apple Silicon + Intel)
   - **Windows**: `TalkToFigma-v*.*.*.exe`

### Security Notes (First Run)

**macOS:**
1. Right-click the app → **"Open"** → **"Open"** in confirmation dialog
2. Or: System Settings → Privacy & Security → Click **"Open Anyway"**

**Windows:**
- For `exe`: SmartScreen warning: Click **"More info"** → **"Run anyway"**
- For `msix`: To install unsigned MSIX packages, enable Windows Developer Mode
   - Settings → Privacy & Security → For developers → Enable Developer Mode

## Getting Started

### 1. Launch TalkToFigma Desktop

- **macOS**: Applications folder or Spotlight
- **Windows**: Start menu

The app will appear in your system tray.

### 2. Start the WebSocket Server

Right-click the tray icon and select **"Start Server"**.

> [!NOTE]
> The WebSocket server runs on **port 3055** and must be running for AI tools to communicate with Figma.

Status indicators:
- 🔴 **Inactive**: Server stopped
- 🟢 **Active**: Server running

### 3. Configure Your MCP Client

1. Click tray icon → **"Settings"** page
2. Copy the MCP configuration displayed
3. Add to your MCP client configuration:

**For Cursor, Claude Code, or other stdio-based clients:**
```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "/Users/yourname/Library/Application Support/TalkToFigma/mcp-server.cjs",
      "args": []
    }
  }
}
```

> [!TIP]
> The stdio server is automatically installed to:
> - **macOS**: `~/Library/Application Support/TalkToFigma/mcp-server.cjs`
> - **Windows**: `%APPDATA%\TalkToFigma\mcp-server.cjs`

### 4. Install Figma Plugin

Install the plugin: [**Cursor Talk to Figma MCP Plugin**](https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin)

> [!IMPORTANT]
> When using TalkToFigma Desktop, you do **NOT** need to install bun.sh or run any terminal commands mentioned in the plugin description. The desktop app handles all server components.

### 5. Connect and Use

1. **In Figma**: Run the plugin (it will connect to WebSocket server on port 3055)
2. **In your AI tool**: Use MCP commands to interact with Figma
3. **Start designing**: Ask your AI assistant to read or modify Figma designs!

## Architecture

```
MCP Clients (Cursor, Claude Code, etc.)
    │ spawn independent processes
    ▼
stdio MCP Servers (one per client)
    │ WebSocket (port 3055)
    ▼
Desktop App (WebSocket Server)
    │ channel-based routing
    ▼
Figma Plugin
```

### Key Components

- **Desktop App**: Manages WebSocket server and system tray interface
- **stdio Servers**: Independent processes spawned by each MCP client
- **WebSocket Server**: Central communication hub on port 3055
- **Figma Plugin**: Executes design operations in Figma

## Building from Source

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Git

### Build Commands

```bash
# Clone repository
git clone https://github.com/grab/TalkToFigmaDesktop.git
cd TalkToFigmaDesktop

# Install dependencies
npm install

# Start development server
npm start

# Create production package
npm run package

# Create distributable installers
npm run make
```

### Development

The project is built with modern web technologies:
- **Main process**: `src/main.ts` (Node.js backend)
- **Renderer**: `src/renderer.tsx` (React UI)
- **Preload script**: `src/preload.ts` (Security bridge)
- **stdio Server**: `src/main/server/mcp-stdio-server.ts` (MCP protocol)

## Troubleshooting

> [!NOTE]
> **Quick Diagnosis**: Right-click tray icon → **"Terminal"** to view logs.

### Connection Problems
**Symptoms**: Figma plugin shows "Disconnected" or MCP commands timeout

**Solutions**:
1. Right-click tray icon → **"Stop Server"**
2. Wait a few seconds → **"Start Server"**
3. Check **Terminal** page for errors
4. Verify port 3055 is not blocked by firewall

### Server Won't Start
**Symptoms**: Tray icon stays inactive, error in Terminal logs

**Solutions**:
- **Port conflict**: Ensure port 3055 is not in use
  ```bash
  # macOS: Check port usage
  lsof -i :3055
  # Windows: Check port usage
  netstat -ano | findstr :3055
  ```
- Check logs in Terminal page for specific error messages
- Try restarting the app completely

### Plugin Can't Connect
**Symptoms**: Figma plugin shows "Waiting for connection..."

**Solutions**:
1. Verify WebSocket server is running (green tray icon ✅)
2. Check Figma plugin shows "Connected" status
3. Ensure both plugin and desktop app are on same machine
4. Check if firewall is blocking port 3055

### MCP Client Issues
**Symptoms**: AI tool can't find TalkToFigma MCP server

**Solutions**:
1. Verify stdio server path in client configuration:
   - **macOS**: `~/Library/Application Support/TalkToFigma/mcp-server.cjs`
   - **Windows**: `%APPDATA%\TalkToFigma\mcp-server.cjs`
2. Check if file exists:
   ```bash
   # macOS
   ls -la ~/Library/Application\ Support/TalkToFigma/mcp-server.cjs
   # Windows
   dir %APPDATA%\TalkToFigma\mcp-server.cjs
   ```
3. Ensure desktop app is running before starting MCP client
4. Restart MCP client after updating configuration

### Common Error Messages

**"EADDRINUSE: address already in use ::3055"**
- Another process is using port 3055
- Find and stop the conflicting process or restart your computer

**"stdio server not found"**
- Desktop app hasn't installed the stdio server yet
- Try restarting the desktop app
- Check Application Support directory exists

**"Channel not joined"**
- MCP client needs to call `join_channel` tool first
- Provide Figma file ID in format: `{file_key}:{page_id}:{view_id}`

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report Issues](https://github.com/grab/TalkToFigmaDesktop/issues)
- 💡 [Request Features](https://github.com/grab/TalkToFigmaDesktop/issues/new)
- 💬 [Discussions](https://github.com/grab/TalkToFigmaDesktop/discussions)

---

## Acknowledgments

This project originated from [@sonnylazuardi](https://github.com/sonnylazuardi)'s [**cursor-talk-to-figma-mcp**](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp). We deeply appreciate the innovative ideas and implementation of the original project.

### Version History
- **v2.0.0+** (January 2026): Cross-platform desktop application
- **v1.x** (2025): macOS-only version

## Technology Stack

- **Electron** - Cross-platform desktop application framework
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and bundler
- **Model Context Protocol** - AI tool integration standard
- **WebSocket** - Real-time bidirectional communication
- **shadcn/ui** - Beautiful component library
- **Tailwind CSS** - Utility-first styling

---

<p align="center">
  <sub>Built with modern web technologies for desktop</sub>
  <br>
  <sub>Automatically synced from GitLab</sub>
</p>
