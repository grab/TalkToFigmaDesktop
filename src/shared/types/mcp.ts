/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

// MCP (Model Context Protocol) related types

export interface McpTool {
  name: string;
  description: string;
  inputSchema: McpInputSchema;
  handler: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

export interface McpInputSchema {
  type: 'object';
  properties: Record<string, McpPropertySchema>;
  required?: string[];
}

export interface McpPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: McpPropertySchema;
  default?: unknown;
}

export interface McpToolResult {
  content: McpContent[];
  isError?: boolean;
}

export interface McpContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string; // base64 for images
  mimeType?: string;
  uri?: string; // for resources
}

export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: McpError;
}

export interface McpError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Error codes
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// MCP method names
export const MCP_METHODS = {
  INITIALIZE: 'initialize',
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',
} as const;
