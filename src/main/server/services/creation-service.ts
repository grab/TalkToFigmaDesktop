/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Creation Service - Node creation operations
 */

import { BaseFigmaService, ToolDefinition } from './base-figma-service'

export class CreationService extends BaseFigmaService {
  constructor() {
    super('CreationService')
  }

  getTools(): ToolDefinition[] {
    return [
      this.createRectangleTool(),
      this.createFrameTool(),
      this.createTextTool()
    ]
  }

  private createRectangleTool(): ToolDefinition {
    return {
      name: 'create_rectangle',
      description: 'Create a new rectangle in Figma.',
      inputSchema: {
        type: 'object',
        properties: {
          x: this.buildProperty('number', 'X position'),
          y: this.buildProperty('number', 'Y position'),
          width: this.buildProperty('number', 'Width of the rectangle'),
          height: this.buildProperty('number', 'Height of the rectangle'),
          name: this.buildProperty('string', 'Optional name for the rectangle'),
          parentId: this.buildProperty('string', 'Optional parent node ID to append to')
        },
        required: ['x', 'y', 'width', 'height']
      },
      handler: async (args) => {
        const params = {
          x: this.safeNumber(args.x),
          y: this.safeNumber(args.y),
          width: this.safeNumber(args.width),
          height: this.safeNumber(args.height),
          name: this.safeString(args.name, 'Rectangle'),
          ...(args.parentId && { parentId: this.safeString(args.parentId) })
        }
        return this.executeFigmaCommand('create_rectangle', params, 'creating rectangle')
      }
    }
  }

  private createFrameTool(): ToolDefinition {
    return {
      name: 'create_frame',
      description: 'Create a new frame in Figma. Frames are containers that can hold other elements.',
      inputSchema: {
        type: 'object',
        properties: {
          x: this.buildProperty('number', 'X position'),
          y: this.buildProperty('number', 'Y position'),
          width: this.buildProperty('number', 'Width of the frame'),
          height: this.buildProperty('number', 'Height of the frame'),
          name: this.buildProperty('string', 'Optional name for the frame'),
          parentId: this.buildProperty('string', 'Optional parent node ID'),
          layoutMode: this.buildProperty('string', 'Layout mode: NONE, HORIZONTAL, VERTICAL', { enum: ['NONE', 'HORIZONTAL', 'VERTICAL'] }),
          primaryAxisSizingMode: this.buildProperty('string', 'Primary axis sizing: FIXED, AUTO', { enum: ['FIXED', 'AUTO'] }),
          counterAxisSizingMode: this.buildProperty('string', 'Counter axis sizing: FIXED, AUTO', { enum: ['FIXED', 'AUTO'] }),
          paddingLeft: this.buildProperty('number', 'Left padding'),
          paddingRight: this.buildProperty('number', 'Right padding'),
          paddingTop: this.buildProperty('number', 'Top padding'),
          paddingBottom: this.buildProperty('number', 'Bottom padding'),
          itemSpacing: this.buildProperty('number', 'Spacing between items in auto-layout')
        },
        required: ['x', 'y', 'width', 'height']
      },
      handler: async (args) => {
        const params: Record<string, unknown> = {
          x: this.safeNumber(args.x),
          y: this.safeNumber(args.y),
          width: this.safeNumber(args.width),
          height: this.safeNumber(args.height),
          name: this.safeString(args.name, 'Frame')
        }

        // Optional properties
        if (args.parentId) params.parentId = this.safeString(args.parentId)
        if (args.layoutMode) params.layoutMode = this.safeString(args.layoutMode)
        if (args.primaryAxisSizingMode) params.primaryAxisSizingMode = this.safeString(args.primaryAxisSizingMode)
        if (args.counterAxisSizingMode) params.counterAxisSizingMode = this.safeString(args.counterAxisSizingMode)
        if (args.paddingLeft !== undefined) params.paddingLeft = this.safeNumber(args.paddingLeft)
        if (args.paddingRight !== undefined) params.paddingRight = this.safeNumber(args.paddingRight)
        if (args.paddingTop !== undefined) params.paddingTop = this.safeNumber(args.paddingTop)
        if (args.paddingBottom !== undefined) params.paddingBottom = this.safeNumber(args.paddingBottom)
        if (args.itemSpacing !== undefined) params.itemSpacing = this.safeNumber(args.itemSpacing)

        return this.executeFigmaCommand('create_frame', params, 'creating frame')
      }
    }
  }

  private createTextTool(): ToolDefinition {
    return {
      name: 'create_text',
      description: 'Create a new text element in Figma.',
      inputSchema: {
        type: 'object',
        properties: {
          x: this.buildProperty('number', 'X position'),
          y: this.buildProperty('number', 'Y position'),
          content: this.buildProperty('string', 'Text content'),
          name: this.buildProperty('string', 'Optional name for the text node'),
          parentId: this.buildProperty('string', 'Optional parent node ID'),
          fontSize: this.buildProperty('number', 'Font size in pixels'),
          fontWeight: this.buildProperty('number', 'Font weight (100-900)'),
          textAlignHorizontal: this.buildProperty('string', 'Horizontal alignment: LEFT, CENTER, RIGHT, JUSTIFIED', { enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] }),
          textAlignVertical: this.buildProperty('string', 'Vertical alignment: TOP, CENTER, BOTTOM', { enum: ['TOP', 'CENTER', 'BOTTOM'] }),
          width: this.buildProperty('number', 'Fixed width for text box'),
          height: this.buildProperty('number', 'Fixed height for text box')
        },
        required: ['x', 'y', 'content']
      },
      handler: async (args) => {
        const params: Record<string, unknown> = {
          x: this.safeNumber(args.x),
          y: this.safeNumber(args.y),
          content: this.safeString(args.content),
          name: this.safeString(args.name, 'Text')
        }

        if (args.parentId) params.parentId = this.safeString(args.parentId)
        if (args.fontSize !== undefined) params.fontSize = this.safeNumber(args.fontSize)
        if (args.fontWeight !== undefined) params.fontWeight = this.safeNumber(args.fontWeight)
        if (args.textAlignHorizontal) params.textAlignHorizontal = this.safeString(args.textAlignHorizontal)
        if (args.textAlignVertical) params.textAlignVertical = this.safeString(args.textAlignVertical)
        if (args.width !== undefined) params.width = this.safeNumber(args.width)
        if (args.height !== undefined) params.height = this.safeNumber(args.height)

        return this.executeFigmaCommand('create_text', params, 'creating text')
      }
    }
  }
}

// Singleton instance
export const creationService = new CreationService()
