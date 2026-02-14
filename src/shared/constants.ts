/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

// Shared constants across main and renderer processes

// Server ports
export const PORTS = {
  WEBSOCKET: 3055,      // Figma plugin WebSocket
  MCP_SSE: 3056,        // MCP client SSE (deprecated - use stdio instead)
  OAUTH_CALLBACK: 8888, // OAuth callback server
} as const;

// Transport types
export const TRANSPORT_TYPES = {
  STDIO: 'stdio',   // MCP stdio transport (recommended)
  SSE: 'sse',       // MCP SSE transport (deprecated)
} as const;

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  HTTP_CONNECTION: 10_000,  // 10 seconds
  HTTP_REQUEST: 30_000,     // 30 seconds
  MCP_COMMAND: 30_000,      // 30 seconds
  OAUTH: 300_000,           // 5 minutes
  ACTIVITY_CHECK: 60_000,   // 60 seconds
  INACTIVITY_WARNING: 120_000, // 2 minutes
} as const;

// IPC Channel names
export const IPC_CHANNELS = {
  // Server control
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_RESTART: 'server:restart',
  SERVER_GET_STATUS: 'server:get-status',
  SERVER_STATUS_CHANGED: 'server:status-changed',

  // Figma connection
  FIGMA_CONNECT: 'figma:connect',
  FIGMA_DISCONNECT: 'figma:disconnect',
  FIGMA_CONNECTION_CHANGED: 'figma:connection-changed',
  FIGMA_PROGRESS_UPDATE: 'figma:progress-update',

  // Authentication
  AUTH_START_OAUTH: 'auth:start-oauth',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_STATUS: 'auth:get-status',
  AUTH_STATUS_CHANGED: 'auth:status-changed',
  AUTH_SET_FILE_KEY: 'auth:set-file-key',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Window control
  WINDOW_RESIZE: 'window:resize',
  WINDOW_HIDE: 'window:hide',
  WINDOW_SHOW: 'window:show',

  // Shell
  SHELL_OPEN_EXTERNAL: 'shell:open-external',

  // Logging
  LOG_ENTRY: 'log:entry',

  // Analytics (Renderer → Main)
  ANALYTICS_TRACK: 'analytics:track',

  // MCP Configuration
  MCP_DETECT_CONFIG: 'mcp:detect-config',
  MCP_AUTO_CONFIGURE: 'mcp:auto-configure',
  MCP_OPEN_CONFIG_FOLDER: 'mcp:open-config-folder',
  MCP_RESTORE_BACKUP: 'mcp:restore-backup',
  MCP_GET_STDIO_PATH: 'mcp:get-stdio-path',
  MCP_GET_STDIO_CONFIG: 'mcp:get-stdio-config',

  // Updates
  UPDATE_CHECK: 'update:check',
} as const;

// Store keys for electron-store
export const STORE_KEYS = {
  // Figma auth
  FIGMA_ACCESS_TOKEN: 'figma.accessToken',
  FIGMA_REFRESH_TOKEN: 'figma.refreshToken',
  FIGMA_TOKEN_EXPIRES_AT: 'figma.tokenExpiresAt',
  FIGMA_USER_ID: 'figma.userId',
  FIGMA_USER_HANDLE: 'figma.userHandle',
  FIGMA_USER_EMAIL: 'figma.userEmail',
  FIGMA_USER_IMG_URL: 'figma.userImgUrl',
  FIGMA_FILE_KEY: 'figma.fileKey',
  FIGMA_FILE_URL: 'figma.fileUrl',

  // App settings
  APP_THEME: 'app.theme',
  APP_FIRST_LAUNCH: 'app.firstLaunch',
  APP_SHOW_TUTORIAL: 'app.showTutorial',

  // Analytics
  ANALYTICS_CLIENT_ID: 'analytics.clientId',
  ANALYTICS_FIRST_OPEN_SENT: 'analytics.firstOpenSent',
} as const;

// App metadata
export const APP_INFO = {
  NAME: 'TalkToFigmaDesktop',
  VERSION: '1.0.0',
  DESCRIPTION: 'Figma plugin to MCP server bridge',
} as const;

// REST API tools that should be handled locally by Electron app
// These tools require Electron APIs (electron-store, Notification, etc.)
// and don't require joining a channel before use
export const REST_API_TOOLS = [
  'figma_get_comments',
  'figma_post_reply',
  'figma_post_reaction',
  'figma_get_reactions',
  'figma_delete_reaction',
  'figma_get_config',
  'figma_set_config',
  'send_notification',
] as const;

// Commands that don't require joining a channel
// Includes REST API tools plus channel management commands
export const CHANNEL_NOT_REQUIRED_COMMANDS = [
  'join',
  'get_active_channels',
  'connection_diagnostics',
  ...REST_API_TOOLS,
] as const;

// Type helper for REST API tool names
export type RestApiToolName = typeof REST_API_TOOLS[number];

// Type helper for commands that don't require channels
export type ChannelNotRequiredCommand = typeof CHANNEL_NOT_REQUIRED_COMMANDS[number];

// Helper function to check if a command is a REST API tool
export function isRestApiTool(command: string): command is RestApiToolName {
  return (REST_API_TOOLS as readonly string[]).includes(command);
}

// Helper function to check if a command doesn't require a channel
export function isChannelNotRequired(command: string): boolean {
  return (CHANNEL_NOT_REQUIRED_COMMANDS as readonly string[]).includes(command);
}
