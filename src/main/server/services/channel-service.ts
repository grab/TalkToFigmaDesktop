/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Channel Service - Manages Figma plugin connections
 */

import { BaseFigmaService, ToolDefinition } from './base-figma-service'

export class ChannelService extends BaseFigmaService {
  constructor() {
    super('ChannelService')
  }

  getTools(): ToolDefinition[] {
    return [
      this.getActiveChannelsTool(),
      this.getConnectionDiagnosticsTool(),
      this.joinChannelTool()
    ]
  }

  /**
   * Get all active channel names from WebSocket server
   */
  private getActiveChannelsTool(): ToolDefinition {
    return {
      name: 'get_active_channels',
      description: 'Get list of all currently active Figma channels. Use this to see which Figma files are connected.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        try {
          const channels = this.webSocketServer?.getActiveChannels() ?? new Set<string>()
          const channelList = Array.from(channels).sort().join(', ')
          
          const message = channels.size === 0
            ? 'No active channels found. Make sure Figma plugin is running and connected.'
            : `Active channels (${channels.size}): ${channelList}`
          
          return this.createSuccessResponse(message)
        } catch (error) {
          return this.createErrorResponse('getting active channels', error as Error)
        }
      }
    }
  }

  /**
   * Connection diagnostics for troubleshooting
   */
  private getConnectionDiagnosticsTool(): ToolDefinition {
    return {
      name: 'connection_diagnostics',
      description: 'Get diagnostic information about the MCP server and Figma connections for troubleshooting.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        try {
          const channels = this.webSocketServer?.getActiveChannels() ?? new Set<string>()
          const wsStatus = this.webSocketServer ? 'running' : 'not initialized'

          const diagnostics = {
            webSocketServer: {
              status: wsStatus,
              activeChannels: Array.from(channels),
              channelCount: channels.size
            },
            mcpServer: {
              status: 'running',
              transport: 'SSE',
              port: 3056
            },
            figmaPlugin: {
              connected: channels.size > 0,
              message: channels.size > 0
                ? 'Figma plugin is connected and ready'
                : 'No Figma plugin connected. Open TalkToFigma plugin in Figma.'
            }
          }

          return this.createJsonResponse(diagnostics)
        } catch (error) {
          return this.createErrorResponse('running diagnostics', error as Error)
        }
      }
    }
  }

  /**
   * Join a specific channel
   */
  private joinChannelTool(): ToolDefinition {
    return {
      name: 'join_channel',
      description: 'Join a specific Figma channel to work with that file. Required before using most Figma commands.',
      inputSchema: {
        type: 'object',
        properties: {
          channel: this.buildProperty('string', 'The channel/file name to join'),
          fileKey: this.buildProperty('string', 'Optional Figma file key for REST API access')
        },
        required: ['channel']
      },
      handler: async (args) => {
        const channel = this.safeString(args.channel)
        const fileKey = this.safeString(args.fileKey)

        if (!channel) {
          return this.createErrorResponse('joining channel', new Error('Channel name is required'))
        }

        try {
          return await this.executeFigmaCommand(
            'join_channel',
            { channel, fileKey },
            'joining channel'
          )
        } catch (error) {
          return this.createErrorResponse('joining channel', error as Error)
        }
      }
    }
  }
}

// Singleton instance
export const channelService = new ChannelService()
