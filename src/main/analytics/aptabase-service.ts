/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Aptabase Analytics Service
 *
 * Privacy-focused analytics for Electron apps.
 * Tracks app usage, events, and user behavior.
 */

import { trackEvent } from '@aptabase/electron/main';
import { createLogger } from '../utils/logger';

const logger = createLogger('Aptabase');

/**
 * Aptabase App Key
 */
export const APTABASE_APP_KEY = 'A-US-1810876928';

/**
 * Track an event with Aptabase
 */
export function trackAptabaseEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  try {
    trackEvent(eventName, properties);
  } catch (error) {
    logger.error(`Failed to track Aptabase event ${eventName}:`, error);
  }
}

/**
 * Common event names
 */
export const AptabaseEvents = {
  // App lifecycle
  APP_START: 'app_start',
  APP_QUIT: 'app_quit',

  // Server actions
  SERVER_START: 'server_start',
  SERVER_STOP: 'server_stop',
  SERVER_RESTART: 'server_restart',

  // MCP tool calls
  MCP_TOOL_CALL: 'mcp_tool_call',
  MCP_TOOL_SUCCESS: 'mcp_tool_success',
  MCP_TOOL_ERROR: 'mcp_tool_error',

  // Figma plugin
  FIGMA_PLUGIN_CONNECTED: 'figma_plugin_connected',
  FIGMA_PLUGIN_DISCONNECTED: 'figma_plugin_disconnected',
  FIGMA_CHANNEL_JOINED: 'figma_channel_joined',

  // OAuth
  OAUTH_START: 'oauth_start',
  OAUTH_SUCCESS: 'oauth_success',
  OAUTH_ERROR: 'oauth_error',
  OAUTH_LOGOUT: 'oauth_logout',

  // Tutorial
  TUTORIAL_SHOWN: 'tutorial_shown',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  TUTORIAL_SKIPPED: 'tutorial_skipped',

  // Settings
  THEME_CHANGED: 'theme_changed',
  FILE_KEY_SET: 'file_key_set',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;
