/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Service Registry - Central registration of all MCP services
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { FigmaWebSocketServer } from '../websocket-server'
import { BaseFigmaService, FigmaCommandSender, ToolDefinition } from './base-figma-service'
import { channelService } from './channel-service'
import { documentService } from './document-service'
import { creationService } from './creation-service'
import { restApiService } from './rest-api-service'
import logger from '../../utils/logger'

// All services to register
const services: BaseFigmaService[] = [
  channelService,
  documentService,
  creationService,
  restApiService
]

/**
 * Initialize all services with dependencies
 */
export function initializeServices(
  webSocketServer: FigmaWebSocketServer | null,
  figmaCommandSender: FigmaCommandSender | null
): void {
  logger.info('[ServiceRegistry] Initializing all services...')
  
  for (const service of services) {
    service.initialize(webSocketServer, figmaCommandSender)
  }
  
  logger.info(`[ServiceRegistry] Initialized ${services.length} services`)
}

/**
 * Get all tool definitions from all services
 */
export function getAllTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = []
  
  for (const service of services) {
    tools.push(...service.getTools())
  }
  
  logger.info(`[ServiceRegistry] Collected ${tools.length} tools from ${services.length} services`)
  return tools
}

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: Server): void {
  const tools = getAllTools()
  
  // Create a tool lookup map
  const toolMap = new Map<string, ToolDefinition>()
  for (const tool of tools) {
    toolMap.set(tool.name, tool)
  }
  
  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    }
  })
  
  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name
    const tool = toolMap.get(toolName)
    
    if (!tool) {
      logger.error(`[ServiceRegistry] Unknown tool: ${toolName}`)
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true
      }
    }
    
    logger.debug(`[ServiceRegistry] Calling tool: ${toolName}`)
    const args = (request.params.arguments ?? {}) as Record<string, unknown>
    
    try {
      return await tool.handler(args)
    } catch (error) {
      logger.error(`[ServiceRegistry] Tool ${toolName} failed: ${error}`)
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${(error as Error).message}` }],
        isError: true
      }
    }
  })
  
  logger.info(`[ServiceRegistry] Registered ${tools.length} tools with MCP server`)
}

/**
 * Export services for external access
 */
export { channelService, documentService, creationService, restApiService }

/**
 * Export types
 */
export type { ToolDefinition, FigmaCommandSender } from './base-figma-service'
