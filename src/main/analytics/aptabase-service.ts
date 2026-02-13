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
import { getDistributionChannel } from './distribution-channel';

const logger = createLogger('Aptabase');

/**
 * Aptabase App Key
 */
export const APTABASE_APP_KEY = 'A-US-1810876928';

/**
 * Track an event with Aptabase
 * Automatically enriches all events with distribution_channel
 */
export function trackAptabaseEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  try {
    // Enrich all events with distribution_channel
    const enrichedProperties = {
      distribution_channel: getDistributionChannel(),
      ...properties,
    };
    trackEvent(eventName, enrichedProperties);
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
  SERVER_ACTION: 'server_action',

  // MCP tool calls
  MCP_TOOL_CALL: 'mcp_tool_call',

  // Figma plugin
  FIGMA_PLUGIN_CONNECTED: 'figma_plugin_connected',
  FIGMA_PLUGIN_DISCONNECTED: 'figma_plugin_disconnected',

  // OAuth
  OAUTH_ACTION: 'oauth_action',

  // Tutorial
  TUTORIAL_SHOWN: 'tutorial_shown',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  TUTORIAL_SKIPPED: 'tutorial_skipped',

  // Settings
  THEME_CHANGED: 'theme_changed',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;
