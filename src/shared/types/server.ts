/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

// Server-related types

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ServerState {
  websocket: {
    status: ServerStatus;
    port: number;
    connectedClients: number;
    mcpClientCount?: number;  // Number of connected MCP stdio clients
    figmaClientCount?: number; // Number of connected Figma plugins
  };
  mcp: {
    status: ServerStatus;
    port?: number; // Optional: SSE port (deprecated, kept for backward compatibility)
    transport: 'stdio' | 'sse'; // Transport type
  };
  operationInProgress: boolean;
  lastError: string | null;
}

export interface WebSocketMessage {
  type: 'join' | 'message' | 'progress_update' | 'leave';
  channelId?: string;
  requestId?: string;
  data?: unknown;
}

export interface Channel {
  id: string;
  clients: Set<string>;
  createdAt: Date;
}

export interface ProgressUpdate {
  requestId: string;
  progress: number;
  message: string;
  completed: boolean;
}
