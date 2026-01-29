/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Document Service - Document and selection operations
 */

import { BaseFigmaService, ToolDefinition } from './base-figma-service'

export class DocumentService extends BaseFigmaService {
  constructor() {
    super('DocumentService')
  }

  getTools(): ToolDefinition[] {
    return [
      this.getDocumentInfoTool(),
      this.getSelectionTool(),
      this.readMyDesignTool(),
      this.getNodeInfoTool(),
      this.getNodesInfoTool(),
      this.setFocusTool(),
      this.setSelectionsTool()
    ]
  }

  private getDocumentInfoTool(): ToolDefinition {
    return {
      name: 'get_document_info',
      description: 'Get detailed information about the current Figma document including name, pages, and metadata.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        return this.executeFigmaCommand('get_document_info', {}, 'getting document info')
      }
    }
  }

  private getSelectionTool(): ToolDefinition {
    return {
      name: 'get_selection',
      description: 'Get information about the currently selected nodes in Figma.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        return this.executeFigmaCommand('get_selection', {}, 'getting selection')
      }
    }
  }

  private readMyDesignTool(): ToolDefinition {
    return {
      name: 'read_my_design',
      description: 'Get detailed information about the current selection including all node properties, styles, and hierarchy.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        return this.executeFigmaCommand('read_my_design', {}, 'reading design')
      }
    }
  }

  private getNodeInfoTool(): ToolDefinition {
    return {
      name: 'get_node_info',
      description: 'Get detailed information about a specific node by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          nodeId: this.buildProperty('string', 'The ID of the node to get info for')
        },
        required: ['nodeId']
      },
      handler: async (args) => {
        const nodeId = this.safeString(args.nodeId)
        return this.executeFigmaCommand('get_node_info', { nodeId }, 'getting node info')
      }
    }
  }

  private getNodesInfoTool(): ToolDefinition {
    return {
      name: 'get_nodes_info',
      description: 'Get detailed information about multiple nodes by their IDs.',
      inputSchema: {
        type: 'object',
        properties: {
          nodeIds: this.buildProperty('array', 'Array of node IDs to get info for', { items: { type: 'string' } })
        },
        required: ['nodeIds']
      },
      handler: async (args) => {
        const nodeIds = this.safeArray<string>(args.nodeIds)
        return this.executeFigmaCommand('get_nodes_info', { nodeIds }, 'getting nodes info')
      }
    }
  }

  private setFocusTool(): ToolDefinition {
    return {
      name: 'set_focus',
      description: 'Set focus on a specific node by selecting it and scrolling the viewport to show it.',
      inputSchema: {
        type: 'object',
        properties: {
          nodeId: this.buildProperty('string', 'The ID of the node to focus on')
        },
        required: ['nodeId']
      },
      handler: async (args) => {
        const nodeId = this.safeString(args.nodeId)
        return this.executeFigmaCommand('set_focus', { nodeId }, 'setting focus')
      }
    }
  }

  private setSelectionsTool(): ToolDefinition {
    return {
      name: 'set_selections',
      description: 'Set selection to multiple nodes and scroll viewport to show them.',
      inputSchema: {
        type: 'object',
        properties: {
          nodeIds: this.buildProperty('array', 'Array of node IDs to select', { items: { type: 'string' } })
        },
        required: ['nodeIds']
      },
      handler: async (args) => {
        const nodeIds = this.safeArray<string>(args.nodeIds)
        return this.executeFigmaCommand('set_selections', { nodeIds }, 'setting selections')
      }
    }
  }
}

// Singleton instance
export const documentService = new DocumentService()
