/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Figma REST API Service
 *
 * Handles all Figma REST API operations that require OAuth authentication.
 * Includes comment management, reactions, user info, and configuration.
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseFigmaService, ToolDefinition } from './base-figma-service';
import { FigmaApiClient } from '../../figma/api/FigmaApiClient';
import { getStore } from '../../utils/store';
import { STORE_KEYS } from '../../../shared/constants';
import logger from '../../utils/logger';

/**
 * REST API Service for OAuth-authenticated operations
 */
class RestApiService extends BaseFigmaService {
  constructor() {
    super('RestApiService');
  }

  /**
   * Get all REST API tools
   */
  getTools(): ToolDefinition[] {
    return [
      // Comments
      {
        name: 'figma_get_comments',
        description: 'Get all comments from a Figma file using REST API. Requires OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: this.buildProperty('string', 'Figma file key (optional if set in config)'),
          },
          required: [],
        },
        handler: this.handleGetComments.bind(this),
      },

      // Post Comment or Reply
      {
        name: 'figma_post_reply',
        description: 'Post a new comment or reply to an existing comment using Figma REST API. Requires OAuth authentication. If commentId is provided, it will be a reply. Otherwise, it will be a new comment.',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: this.buildProperty('string', 'Optional ID of the comment to reply to. If omitted, creates a new comment.'),
            message: this.buildProperty('string', 'Comment or reply message text'),
            nodeId: this.buildProperty('string', 'Optional node ID to attach comment to'),
            x: this.buildProperty('number', 'Optional X coordinate for comment position'),
            y: this.buildProperty('number', 'Optional Y coordinate for comment position'),
          },
          required: ['message'],
        },
        handler: this.handlePostReply.bind(this),
      },

      // Reactions
      {
        name: 'figma_post_reaction',
        description: 'Post an emoji reaction to a comment using Figma REST API. Requires OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: this.buildProperty('string', 'ID of the comment to react to'),
            emoji: this.buildProperty('string', 'Emoji character to react with'),
          },
          required: ['commentId', 'emoji'],
        },
        handler: this.handlePostReaction.bind(this),
      },

      {
        name: 'figma_get_reactions',
        description: 'Get all reactions for a comment using Figma REST API. Requires OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: this.buildProperty('string', 'ID of the comment to get reactions for'),
          },
          required: ['commentId'],
        },
        handler: this.handleGetReactions.bind(this),
      },

      {
        name: 'figma_delete_reaction',
        description: 'Delete a reaction from a comment using Figma REST API. Requires OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: this.buildProperty('string', 'ID of the comment'),
            emoji: this.buildProperty('string', 'Emoji character to remove'),
          },
          required: ['commentId', 'emoji'],
        },
        handler: this.handleDeleteReaction.bind(this),
      },

      // Configuration
      {
        name: 'figma_get_config',
        description: 'Get OAuth configuration status (access token, file key, user info)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
        handler: this.handleGetConfig.bind(this),
      },

      {
        name: 'figma_set_config',
        description: 'Set OAuth configuration (access token, file key, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            accessToken: this.buildProperty('string', 'Figma OAuth access token'),
            refreshToken: this.buildProperty('string', 'Figma OAuth refresh token'),
            fileKey: this.buildProperty('string', 'Default Figma file key'),
          },
          required: [],
        },
        handler: this.handleSetConfig.bind(this),
      },

      // Notification
      {
        name: 'send_notification',
        description: 'Send a desktop notification to the user',
        inputSchema: {
          type: 'object',
          properties: {
            title: this.buildProperty('string', 'Notification title'),
            body: this.buildProperty('string', 'Notification body text'),
          },
          required: ['title', 'body'],
        },
        handler: this.handleSendNotification.bind(this),
      },
    ];
  }

  /**
   * Get file key from args or store
   */
  private getFileKey(args: Record<string, unknown>): string | null {
    const fileKey = this.safeString(args.fileKey);
    if (fileKey) return fileKey;

    const store = getStore();
    return store.get(STORE_KEYS.FIGMA_FILE_KEY) as string | null;
  }

  /**
   * Handle: Get all comments from a file
   */
  private async handleGetComments(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const fileKey = this.getFileKey(args);
      if (!fileKey) {
        return this.createErrorResponse(
          'figma_get_comments',
          new Error('fileKey is required (provide in args or set in config)')
        );
      }

      const client = await FigmaApiClient.create();
      if (!client) {
        return this.createErrorResponse(
          'figma_get_comments',
          new Error('Not authenticated. Please run OAuth authentication first.')
        );
      }

      const result = await client.getFileComments(fileKey);
      if (!result.success) {
        return this.createErrorResponse('figma_get_comments', new Error(result.error));
      }

      return this.createJsonResponse(result.data);
    } catch (error) {
      return this.createErrorResponse('figma_get_comments', error as Error);
    }
  }

  /**
   * Handle: Post a new comment or reply to a comment
   */
  private async handlePostReply(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const fileKey = this.getFileKey(args);
      if (!fileKey) {
        return this.createErrorResponse(
          'figma_post_reply',
          new Error('fileKey is required (set in config)')
        );
      }

      const commentId = this.safeString(args.commentId);
      const message = this.safeString(args.message);

      if (!message) {
        return this.createErrorResponse(
          'figma_post_reply',
          new Error('message is required')
        );
      }

      const nodeId = this.safeString(args.nodeId);
      const x = this.safeNumber(args.x);
      const y = this.safeNumber(args.y);

      const client = await FigmaApiClient.create();
      if (!client) {
        return this.createErrorResponse(
          'figma_post_reply',
          new Error('Not authenticated. Please run OAuth authentication first.')
        );
      }

      // Build client_meta if nodeId or coordinates are provided (only for new comments, not replies)
      let clientMeta: Record<string, unknown> | undefined;
      if (!commentId && (nodeId || (x !== 0 && y !== 0))) {
        clientMeta = {};
        if (nodeId) {
          clientMeta.node_id = nodeId;
        }
        if (x !== 0 && y !== 0) {
          clientMeta.x = x;
          clientMeta.y = y;
        }
      }

      const result = await client.postComment(fileKey, message, commentId, clientMeta);
      if (!result.success) {
        return this.createErrorResponse('figma_post_reply', new Error(result.error));
      }

      const successMessage = commentId
        ? `Successfully posted reply to comment ${commentId}`
        : `Successfully posted comment with ID: ${result.data.id}`;

      return this.createSuccessResponse(successMessage);
    } catch (error) {
      return this.createErrorResponse('figma_post_reply', error as Error);
    }
  }

  /**
   * Handle: Post a reaction to a comment
   */
  private async handlePostReaction(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const fileKey = this.getFileKey(args);
      if (!fileKey) {
        return this.createErrorResponse(
          'figma_post_reaction',
          new Error('fileKey is required (set in config)')
        );
      }

      const commentId = this.safeString(args.commentId);
      const emoji = this.safeString(args.emoji);

      if (!commentId || !emoji) {
        return this.createErrorResponse(
          'figma_post_reaction',
          new Error('commentId and emoji are required')
        );
      }

      const client = await FigmaApiClient.create();
      if (!client) {
        return this.createErrorResponse(
          'figma_post_reaction',
          new Error('Not authenticated. Please run OAuth authentication first.')
        );
      }

      const result = await client.postReaction(fileKey, commentId, emoji);
      if (!result.success) {
        return this.createErrorResponse('figma_post_reaction', new Error(result.error));
      }

      return this.createSuccessResponse(
        `Successfully posted reaction ${emoji} to comment ${commentId}`
      );
    } catch (error) {
      return this.createErrorResponse('figma_post_reaction', error as Error);
    }
  }

  /**
   * Handle: Get reactions for a comment
   */
  private async handleGetReactions(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const fileKey = this.getFileKey(args);
      if (!fileKey) {
        return this.createErrorResponse(
          'figma_get_reactions',
          new Error('fileKey is required (set in config)')
        );
      }

      const commentId = this.safeString(args.commentId);
      if (!commentId) {
        return this.createErrorResponse(
          'figma_get_reactions',
          new Error('commentId is required')
        );
      }

      const client = await FigmaApiClient.create();
      if (!client) {
        return this.createErrorResponse(
          'figma_get_reactions',
          new Error('Not authenticated. Please run OAuth authentication first.')
        );
      }

      const result = await client.getReactions(fileKey, commentId);
      if (!result.success) {
        return this.createErrorResponse('figma_get_reactions', new Error(result.error));
      }

      return this.createJsonResponse(result.data);
    } catch (error) {
      return this.createErrorResponse('figma_get_reactions', error as Error);
    }
  }

  /**
   * Handle: Delete a reaction from a comment
   */
  private async handleDeleteReaction(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const fileKey = this.getFileKey(args);
      if (!fileKey) {
        return this.createErrorResponse(
          'figma_delete_reaction',
          new Error('fileKey is required (set in config)')
        );
      }

      const commentId = this.safeString(args.commentId);
      const emoji = this.safeString(args.emoji);

      if (!commentId || !emoji) {
        return this.createErrorResponse(
          'figma_delete_reaction',
          new Error('commentId and emoji are required')
        );
      }

      const client = await FigmaApiClient.create();
      if (!client) {
        return this.createErrorResponse(
          'figma_delete_reaction',
          new Error('Not authenticated. Please run OAuth authentication first.')
        );
      }

      const result = await client.deleteReaction(fileKey, commentId, emoji);
      if (!result.success) {
        return this.createErrorResponse('figma_delete_reaction', new Error(result.error));
      }

      return this.createSuccessResponse(
        `Successfully deleted reaction ${emoji} from comment ${commentId}`
      );
    } catch (error) {
      return this.createErrorResponse('figma_delete_reaction', error as Error);
    }
  }

  /**
   * Handle: Get OAuth configuration status
   */
  private async handleGetConfig(_args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const store = getStore();
      const accessToken = store.get(STORE_KEYS.FIGMA_ACCESS_TOKEN);
      const fileKey = store.get(STORE_KEYS.FIGMA_FILE_KEY);
      const userId = store.get(STORE_KEYS.FIGMA_USER_ID);
      const userHandle = store.get(STORE_KEYS.FIGMA_USER_HANDLE);
      const userEmail = store.get(STORE_KEYS.FIGMA_USER_EMAIL);

      const config = {
        authenticated: !!accessToken,
        fileKey: fileKey || null,
        user: userId
          ? {
              id: userId,
              handle: userHandle || null,
              email: userEmail || null,
            }
          : null,
      };

      return this.createJsonResponse(config);
    } catch (error) {
      return this.createErrorResponse('figma_get_config', error as Error);
    }
  }

  /**
   * Handle: Set OAuth configuration
   */
  private async handleSetConfig(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const store = getStore();
      const accessToken = this.safeString(args.accessToken);
      const refreshToken = this.safeString(args.refreshToken);
      const fileKey = this.safeString(args.fileKey);

      if (accessToken) {
        store.set(STORE_KEYS.FIGMA_ACCESS_TOKEN, accessToken);
        logger.info('Access token updated');
      }

      if (refreshToken) {
        store.set(STORE_KEYS.FIGMA_REFRESH_TOKEN, refreshToken);
        logger.info('Refresh token updated');
      }

      if (fileKey) {
        store.set(STORE_KEYS.FIGMA_FILE_KEY, fileKey);
        logger.info(`File key updated: ${fileKey}`);
      }

      return this.createSuccessResponse('Configuration updated successfully');
    } catch (error) {
      return this.createErrorResponse('figma_set_config', error as Error);
    }
  }

  /**
   * Handle: Send desktop notification
   */
  private async handleSendNotification(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const title = this.safeString(args.title);
      const body = this.safeString(args.body);

      if (!title || !body) {
        return this.createErrorResponse(
          'send_notification',
          new Error('title and body are required')
        );
      }

      // Send notification via Electron
      const { Notification } = await import('electron');
      const notification = new Notification({
        title,
        body,
      });

      notification.show();
      logger.info(`Notification sent: ${title}`);

      return this.createSuccessResponse(`Notification sent: ${title}`);
    } catch (error) {
      return this.createErrorResponse('send_notification', error as Error);
    }
  }
}

// Export singleton instance
export const restApiService = new RestApiService();
