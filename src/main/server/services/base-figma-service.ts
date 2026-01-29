/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Base service class for all Figma MCP services
 * Provides common functionality including validation, error handling, and command execution
 */

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { FigmaWebSocketServer } from '../websocket-server'
import logger from '../../utils/logger'

export interface FigmaCommandSender {
  (command: string, params: Record<string, unknown>): Promise<unknown>
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, PropertyDefinition>
    required?: string[]
  }
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>
}

export interface PropertyDefinition {
  type: string
  description: string
  default?: unknown
  enum?: string[]
  items?: { type: string }
}

/**
 * Base class for all Figma MCP services
 */
export abstract class BaseFigmaService {
  protected webSocketServer: FigmaWebSocketServer | null = null
  protected figmaCommandSender: FigmaCommandSender | null = null
  protected serviceName: string

  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  /**
   * Initialize the service with dependencies
   */
  initialize(webSocketServer: FigmaWebSocketServer | null, figmaCommandSender: FigmaCommandSender | null): void {
    this.webSocketServer = webSocketServer
    this.figmaCommandSender = figmaCommandSender
    logger.info(`[${this.serviceName}] Service initialized`)
  }

  /**
   * Get all tool definitions for this service
   */
  abstract getTools(): ToolDefinition[]

  /**
   * Create a standardized success response
   */
  protected createSuccessResponse(message: string): CallToolResult {
    return {
      content: [{ type: 'text', text: message } as TextContent]
    }
  }

  /**
   * Create a standardized error response
   */
  protected createErrorResponse(operation: string, error: Error): CallToolResult {
    const errorMessage = `Error during ${operation}: ${error.message}`
    logger.error(`[${this.serviceName}] ${errorMessage}`)
    return {
      content: [{ type: 'text', text: errorMessage } as TextContent],
      isError: true
    }
  }

  /**
   * Create a JSON response
   */
  protected createJsonResponse(data: unknown): CallToolResult {
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) } as TextContent]
    }
  }

  /**
   * Execute a Figma command via WebSocket with error handling
   */
  protected async executeFigmaCommand(
    command: string,
    params: Record<string, unknown> = {},
    operation: string
  ): Promise<CallToolResult> {
    const startTime = Date.now()

    try {
      if (!this.figmaCommandSender) {
        throw new Error('Figma command sender not initialized')
      }

      const result = await this.figmaCommandSender(command, params)
      const duration = Date.now() - startTime

      logger.debug(`[${this.serviceName}] Command ${command} completed in ${duration}ms`)

      return this.createJsonResponse(result)
    } catch (error) {
      return this.createErrorResponse(operation, error as Error)
    }
  }

  /**
   * Build a property definition for tool input schema
   */
  protected buildProperty(
    type: string,
    description: string,
    options?: {
      default?: unknown
      enum?: string[]
      items?: { type: string }
    }
  ): PropertyDefinition {
    return {
      type,
      description,
      ...options
    }
  }

  /**
   * Helper to safely get string value
   */
  protected safeString(value: unknown, defaultValue = ''): string {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return defaultValue
    return String(value)
  }

  /**
   * Helper to safely get number value
   */
  protected safeNumber(value: unknown, defaultValue = 0): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? defaultValue : parsed
    }
    return defaultValue
  }

  /**
   * Helper to safely get boolean value
   */
  protected safeBoolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return defaultValue
  }

  /**
   * Helper to safely get array value
   */
  protected safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
    if (Array.isArray(value)) return value as T[]
    return defaultValue
  }
}
