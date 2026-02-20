/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Analytics Service
 *
 * Unified analytics tracking for both Aptabase and GA4.
 * Tracks events to both services simultaneously.
 */

import { trackAptabaseEvent, AptabaseEvents } from './aptabase-service';
import { trackGA4Event, GA4Events } from './ga4-service';
import { createLogger } from '../utils/logger';
import { getStore } from '../utils/store';
import { STORE_KEYS } from '@/shared/constants';

const logger = createLogger('Analytics');

/**
 * Track event to both analytics services
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  // Track to Aptabase (privacy-focused, primary)
  trackAptabaseEvent(eventName, properties);

  // Track to GA4 (backward compatibility)
  trackGA4Event(eventName, properties);
}

/**
 * Analytics Events (unified from both services)
 */
export const AnalyticsEvents = {
  ...AptabaseEvents,
  ...GA4Events,
};

/**
 * Track app start
 */
export function trackAppStart(): void {
  trackEvent(AnalyticsEvents.APP_START, {
    platform: process.platform,
    arch: process.arch,
    version: process.env.npm_package_version || '1.0.0',
  });
}

/**
 * Track app quit
 */
export function trackAppQuit(): void {
  trackEvent(AnalyticsEvents.APP_QUIT);
}

/**
 * Track server action (unified event)
 * All server actions use 'server_action' event with action property for consistency
 */
export function trackServerAction(
  action: 'start' | 'stop' | 'restart',
  serverType: 'websocket' | 'mcp' | 'all',
  port?: number,
  startupTimeMs?: number,
  success = true,
  errorMessage?: string
): void {
  const params: Record<string, string | number | boolean> = {
    action,
    server_type: serverType,
    success,
  };

  if (port !== undefined) {
    params.port = port;
  }

  if (startupTimeMs !== undefined) {
    params.startup_time_ms = startupTimeMs;
  }

  if (errorMessage) {
    params.error_message = errorMessage;
  }

  trackEvent(AnalyticsEvents.SERVER_ACTION, params);
}

/**
 * Track MCP tool call (Kotlin-compatible)
 * Uses single event name with success parameter
 */
export function trackMCPToolCall(
  toolName: string,
  success: boolean,
  errorMessage?: string,
  durationMs?: number
): void {
  const params: Record<string, string | number | boolean> = {
    tool_name: toolName,
    success: success,
  };

  if (errorMessage) {
    params.error_message = errorMessage;
  }

  if (durationMs !== undefined) {
    params.duration_ms = durationMs;
  }

  trackEvent(AnalyticsEvents.MCP_TOOL_CALL, params);
}

/**
 * Track Figma plugin connection
 */
export function trackFigmaConnection(connected: boolean, channelName?: string): void {
  if (connected) {
    trackEvent(AnalyticsEvents.FIGMA_PLUGIN_CONNECTED, {
      channel: channelName || 'unknown',
    });
  } else {
    trackEvent(AnalyticsEvents.FIGMA_PLUGIN_DISCONNECTED);
  }
}

/**
 * Track OAuth action (unified event pattern)
 * Uses single 'oauth_action' event with action property for consistency with server_action
 */
export function trackOAuthAction(action: 'start' | 'success' | 'error' | 'logout'): void {
  trackEvent(AnalyticsEvents.OAUTH_ACTION, { action });
}

/**
 * Track tutorial action
 */
export function trackTutorialAction(action: 'shown' | 'completed' | 'skipped'): void {
  const eventMap = {
    shown: AnalyticsEvents.TUTORIAL_SHOWN,
    completed: AnalyticsEvents.TUTORIAL_COMPLETED,
    skipped: AnalyticsEvents.TUTORIAL_SKIPPED,
  };

  trackEvent(eventMap[action]);
}

/**
 * Track theme change
 */
export function trackThemeChange(theme: 'light' | 'dark' | 'system'): void {
  trackEvent(AnalyticsEvents.THEME_CHANGED, { theme });
}

/**
 * Track error
 */
export function trackError(errorType: string, errorMessage: string): void {
  trackEvent(AnalyticsEvents.ERROR_OCCURRED, {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Limit length
  });
}

/**
 * Track page view (for window/view navigation)
 * Kotlin-compatible event
 */
export function trackPageView(
  pageTitle: string,
  pageLocation: string,
  pagePath?: string
): void {
  trackEvent(AnalyticsEvents.PAGE_VIEW, {
    page_title: pageTitle,
    page_location: pageLocation,
    ...(pagePath && { page_path: pagePath }),
  });
}

/**
 * Track user engagement
 * Kotlin-compatible event
 */
export function trackUserEngagement(engagementTimeMs = 1000): void {
  trackEvent(AnalyticsEvents.USER_ENGAGEMENT, {
    engagement_time_msec: engagementTimeMs,
  });
}

/**
 * Track first open for new users
 * Only sends once, then sets a flag to prevent duplicate sends
 * Kotlin-compatible event
 */
export function trackFirstOpenIfNeeded(): void {
  const store = getStore();
  const firstOpenSent = store.get(STORE_KEYS.ANALYTICS_FIRST_OPEN_SENT) as boolean | undefined;

  if (!firstOpenSent) {
    trackEvent(AnalyticsEvents.FIRST_OPEN, {
      platform: 'desktop',
    });
    store.set(STORE_KEYS.ANALYTICS_FIRST_OPEN_SENT, true);
    logger.debug('First open event sent and flag set');
  }
}

/**
 * Track user action (generic user interaction event)
 * Kotlin-compatible event
 */
export function trackUserAction(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  const params: Record<string, string | number> = {
    action,
    category,
  };

  if (label !== undefined) {
    params.label = label;
  }

  if (value !== undefined) {
    params.value = value;
  }

  trackEvent(AnalyticsEvents.USER_ACTION, params);
}

/**
 * Track app exception (for crash reporting)
 * Kotlin-compatible event
 */
export function trackAppException(
  fatal: boolean,
  exceptionType: string,
  exceptionMessage?: string,
  threadName?: string,
  stacktraceTop?: string
): void {
  const params: Record<string, string | number | boolean> = {
    fatal,
    exception_type: exceptionType.substring(0, 100),
  };

  if (exceptionMessage) {
    params.exception_message = exceptionMessage.substring(0, 150);
  }

  if (threadName) {
    params.thread_name = threadName.substring(0, 80);
  }

  if (stacktraceTop) {
    params.top_stack_frame = stacktraceTop.substring(0, 180);
  }

  trackEvent(AnalyticsEvents.APP_EXCEPTION, params);
}
