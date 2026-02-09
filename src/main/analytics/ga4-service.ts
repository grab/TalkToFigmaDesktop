/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Google Analytics 4 Service
 *
 * Tracks events using GA4 Measurement Protocol.
 * Provides backward compatibility with existing GA4 dashboards.
 */

import { createLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../utils/store';
import {
  getDeviceInfo,
  getUserProperties,
  getSessionId,
  fetchPublicIp,
} from './device-info';
import { app } from 'electron';

const logger = createLogger('GA4');

/**
 * GA4 Configuration
 * Supports both GOOGLE_ANALYTICS_* (Kotlin compatibility) and GA4_* naming
 * Uses compile-time injected constants or falls back to runtime env vars
 */
const GA4_MEASUREMENT_ID =
  (typeof __GOOGLE_ANALYTICS_ID__ !== 'undefined' ? __GOOGLE_ANALYTICS_ID__ : process.env.GOOGLE_ANALYTICS_ID) ||
  process.env.GA4_MEASUREMENT_ID ||
  'G-XXXXXXXXXX';
const GA4_API_SECRET =
  (typeof __GOOGLE_ANALYTICS_API_SECRET__ !== 'undefined' ? __GOOGLE_ANALYTICS_API_SECRET__ : process.env.GOOGLE_ANALYTICS_API_SECRET) ||
  process.env.GA4_API_SECRET ||
  '';
const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/**
 * Get or create client ID
 */
function getClientId(): string {
  const store = getStore();
  let clientId = store.get('analytics.clientId') as string | undefined;

  if (!clientId) {
    clientId = uuidv4();
    store.set('analytics.clientId', clientId);
    logger.debug('Generated new GA4 client ID');
  }

  return clientId;
}

/**
 * Track event to GA4
 * Payload structure matches Kotlin GoogleAnalyticsService.kt for backward compatibility
 */
export async function trackGA4Event(
  eventName: string,
  parameters?: Record<string, string | number | boolean>
): Promise<void> {
  // Skip if not configured
  if (!GA4_API_SECRET || GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    logger.debug('GA4 not configured, skipping event:', eventName);
    return;
  }

  try {
    const clientId = getClientId();
    const sessionId = getSessionId();
    const appVersion = app.getVersion();

    // Fetch public IP (with timeout, optional)
    const publicIp = await fetchPublicIp();

    // Build GA4 Measurement Protocol payload (Kotlin-compatible)
    const payload: Record<string, any> = {
      client_id: clientId,
      ...(publicIp && { ip_override: publicIp }),
      device: getDeviceInfo(),
      user_properties: getUserProperties(appVersion),
      events: [
        {
          name: eventName,
          params: {
            session_id: sessionId,
            app_version: appVersion,
            engagement_time_msec: 1,
            ...parameters,
          },
        },
      ],
    };

    const url = `${GA4_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error(`GA4 tracking failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    logger.error(`Failed to track GA4 event ${eventName}:`, error);
  }
}

/**
 * GA4 Event names
 * Matches Kotlin GoogleAnalyticsService.kt event names for backward compatibility
 */
export const GA4Events = {
  // Standard GA4 events
  PAGE_VIEW: 'page_view',
  USER_ENGAGEMENT: 'user_engagement',
  FIRST_OPEN: 'first_open',
  APP_EXCEPTION: 'app_exception',

  // App lifecycle
  APP_START: 'app_start',
  APP_QUIT: 'app_quit',

  // Server actions
  SERVER_ACTION: 'server_action',
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

  // User actions
  USER_ACTION: 'user_action',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;
