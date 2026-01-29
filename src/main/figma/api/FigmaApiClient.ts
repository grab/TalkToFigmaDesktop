/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Figma REST API Client
 *
 * Provides methods for interacting with Figma's REST API.
 * Handles authentication, comments, reactions, and file metadata.
 */

import { createLogger } from '../../utils/logger';
import { FigmaOAuthService } from '../oauth/FigmaOAuthService';

const logger = createLogger('API');

/**
 * Base URL for Figma API
 */
const BASE_URL = 'https://api.figma.com';

/**
 * Figma User (GET /v1/me)
 */
export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Comment User
 */
export interface CommentUser {
  id: string;
  handle: string;
  img_url?: string;
}

/**
 * Node Offset Coordinates
 */
export interface NodeOffset {
  x: number;
  y: number;
}

/**
 * Client Metadata for Comment Positioning
 */
export interface ClientMeta {
  node_id?: string;
  node_offset?: NodeOffset;
  stable_path?: string[];
  // Backward compatibility
  x?: number;
  y?: number;
}

/**
 * Reaction on a Figma Comment
 */
export interface Reaction {
  emoji: string;
  created_at: string;
  user: CommentUser;
}

/**
 * File Comment
 */
export interface FileComment {
  id: string;
  uuid?: string;
  message: string;
  file_key: string;
  parent_id: string | null;
  user: CommentUser;
  created_at: string;
  resolved_at?: string | null;
  client_meta?: ClientMeta;
  order_id?: string;
  reactions?: Reaction[];
}

/**
 * Comments Response (GET /v1/files/{file_key}/comments)
 */
export interface CommentsResponse {
  comments: FileComment[];
}

/**
 * Comment Post Response
 */
export interface CommentPostResponse {
  id: string;
  message: string;
  file_key: string;
  parent_id: string | null;
  user: CommentUser;
  created_at: string;
  resolved_at?: string | null;
  client_meta?: ClientMeta;
}

/**
 * API Result Type
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Figma API Client
 */
export class FigmaApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Create API client with valid access token (auto-refresh if needed)
   */
  static async create(): Promise<FigmaApiClient | null> {
    const token = await FigmaOAuthService.getValidAccessToken();
    if (!token) {
      logger.error('No valid access token available');
      return null;
    }
    return new FigmaApiClient(token);
  }

  /**
   * Make authenticated HTTP request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResult<T>> {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const headers = {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        ...options.headers,
      };

      logger.debug(`API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const responseText = await response.text();

      if (!response.ok) {
        logger.error(
          `API request failed: ${response.status} - ${responseText}`
        );
        return {
          success: false,
          error: `API request failed: ${response.status} - ${responseText}`,
        };
      }

      // Parse JSON if response has content
      const data = responseText ? JSON.parse(responseText) : null;
      return { success: true, data: data as T };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`API request error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get current user info (GET /v1/me)
   */
  async getCurrentUser(): Promise<ApiResult<FigmaUser>> {
    logger.info('Fetching current user info from Figma API');
    const result = await this.makeRequest<FigmaUser>('/v1/me');

    if (result.success) {
      logger.info(
        `Current user: ${result.data.handle} (${result.data.email})`
      );
    }

    return result;
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    const result = await this.getCurrentUser();
    return result.success;
  }

  /**
   * Get file comments (GET /v1/files/{file_key}/comments)
   */
  async getFileComments(fileKey: string): Promise<ApiResult<CommentsResponse>> {
    logger.debug(`Fetching comments for file: ${fileKey}`);
    const result = await this.makeRequest<CommentsResponse>(
      `/v1/files/${fileKey}/comments`
    );

    if (result.success) {
      logger.info(
        `Retrieved ${result.data.comments.length} comments for file ${fileKey}`
      );

      // Log parsed comments details
      result.data.comments.forEach((comment, index) => {
        logger.info(`Comment #${index + 1}:`);
        logger.info(`   - ID: ${comment.id}`);
        logger.info(
          `   - Parent ID: ${comment.parent_id || 'NULL (root comment)'}`
        );
        logger.info(
          `   - User: ${comment.user.handle} (ID: ${comment.user.id})`
        );
        logger.info(
          `   - Message: ${comment.message.substring(0, 100)}${comment.message.length > 100 ? '...' : ''}`
        );
        logger.info(`   - Created: ${comment.created_at}`);
        logger.info(
          `   - Client Meta: ${comment.client_meta ? `x=${comment.client_meta.x}, y=${comment.client_meta.y}, node_id=${comment.client_meta.node_id}` : 'NULL'}`
        );
      });
    }

    return result;
  }

  /**
   * Get file metadata (GET /v1/files/{file_key})
   */
  async getFileMetadata(fileKey: string): Promise<ApiResult<string>> {
    logger.debug(`Fetching metadata for file: ${fileKey}`);
    const result = await this.makeRequest<string>(
      `/v1/files/${fileKey}?geometry=paths`
    );

    if (result.success) {
      logger.debug(`File metadata retrieved for ${fileKey}`);
    }

    return result;
  }

  /**
   * Post a comment or reply to Figma file (POST /v1/files/{file_key}/comments)
   * @param fileKey The file key
   * @param message The comment message
   * @param parentId Optional parent comment ID for replies (use comment_id field)
   * @param clientMeta Optional positioning metadata
   */
  async postComment(
    fileKey: string,
    message: string,
    parentId?: string,
    clientMeta?: Record<string, unknown>
  ): Promise<ApiResult<CommentPostResponse>> {
    logger.info(
      `Posting comment to file ${fileKey}${parentId ? ` (reply to ${parentId})` : ''}`
    );
    logger.info(
      `Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`
    );
    logger.info(`Comment ID for reply: ${parentId || 'NULL (new comment)'}`);

    const requestBody: Record<string, unknown> = {
      message,
    };

    // Add comment_id for replies (NOT parent_id)
    if (parentId) {
      requestBody.comment_id = parentId;
    }

    // Add client_meta if provided and not empty
    if (clientMeta && Object.keys(clientMeta).length > 0) {
      requestBody.client_meta = clientMeta;
    }

    logger.info(`Figma API Request body: ${JSON.stringify(requestBody)}`);
    logger.info(
      'Using comment_id field (not parent_id) as per Figma API spec'
    );

    const result = await this.makeRequest<CommentPostResponse>(
      `/v1/files/${fileKey}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (result.success) {
      logger.info(`Successfully posted comment with ID: ${result.data.id}`);
      logger.info(
        `Response parent_id: ${result.data.parent_id || 'NULL (standalone comment)'}`
      );
    }

    return result;
  }

  /**
   * Post a reaction to a comment (POST /v1/files/{file_key}/comments/{comment_id}/reactions)
   * @param fileKey Figma file key
   * @param commentId Comment ID to react to
   * @param emoji Emoji shortcode (e.g., ":thinking_face:", ":+1:")
   */
  async postReaction(
    fileKey: string,
    commentId: string,
    emoji: string
  ): Promise<ApiResult<string>> {
    logger.info(
      `Posting reaction to comment: file=${fileKey}, commentId=${commentId}, emoji=${emoji}`
    );

    const result = await this.makeRequest<string>(
      `/v1/files/${fileKey}/comments/${commentId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Figma-Token': this.accessToken,
        },
        body: JSON.stringify({ emoji }),
      }
    );

    if (result.success) {
      logger.info(
        `Successfully posted reaction: ${emoji} to comment ${commentId}`
      );
    }

    return result;
  }

  /**
   * Get reactions for a comment (GET /v1/files/{file_key}/comments/{comment_id}/reactions)
   * @param fileKey Figma file key
   * @param commentId Comment ID to get reactions for
   */
  async getReactions(
    fileKey: string,
    commentId: string
  ): Promise<ApiResult<{ reactions: Reaction[] }>> {
    logger.debug(
      `Fetching reactions for comment: file=${fileKey}, commentId=${commentId}`
    );

    const result = await this.makeRequest<{ reactions: Reaction[] }>(
      `/v1/files/${fileKey}/comments/${commentId}/reactions`
    );

    if (result.success) {
      logger.info(
        `Retrieved ${result.data.reactions.length} reactions for comment ${commentId}`
      );
    }

    return result;
  }

  /**
   * Delete a reaction from a comment (DELETE /v1/files/{file_key}/comments/{comment_id}/reactions?emoji={emoji})
   * @param fileKey Figma file key
   * @param commentId Comment ID to remove reaction from
   * @param emoji Emoji shortcode to remove
   */
  async deleteReaction(
    fileKey: string,
    commentId: string,
    emoji: string
  ): Promise<ApiResult<string>> {
    logger.info(
      `Deleting reaction from comment: file=${fileKey}, commentId=${commentId}, emoji=${emoji}`
    );

    const encodedEmoji = encodeURIComponent(emoji);
    const result = await this.makeRequest<string>(
      `/v1/files/${fileKey}/comments/${commentId}/reactions?emoji=${encodedEmoji}`,
      {
        method: 'DELETE',
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      }
    );

    if (result.success) {
      logger.info(
        `Successfully deleted reaction: ${emoji} from comment ${commentId}`
      );
    }

    return result;
  }
}
