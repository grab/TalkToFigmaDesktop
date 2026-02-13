/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Distribution Channel Utility
 *
 * Identifies the distribution channel for analytics tracking.
 * Allows differentiation between App Store and direct (web) distribution builds.
 *
 * Usage:
 * - Set DISTRIBUTION_CHANNEL=app_store for App Store builds
 * - Set DISTRIBUTION_CHANNEL=direct for web/direct distribution builds
 * - Defaults to 'development' if not set
 */

// Compile-time constant injected by Vite (vite.main.config.ts)
declare const __DISTRIBUTION_CHANNEL__: string | undefined;

/**
 * Distribution channel types
 */
export type DistributionChannel = 'app_store' | 'direct' | 'development';

/**
 * Get the distribution channel for analytics
 *
 * Priority:
 * 1. Compile-time constant (__DISTRIBUTION_CHANNEL__)
 * 2. Runtime environment variable (DISTRIBUTION_CHANNEL)
 * 3. Default to 'development'
 */
export function getDistributionChannel(): DistributionChannel {
  // Check compile-time constant first (for production builds)
  const channel =
    typeof __DISTRIBUTION_CHANNEL__ !== 'undefined'
      ? __DISTRIBUTION_CHANNEL__
      : process.env.DISTRIBUTION_CHANNEL;

  // Validate and return
  if (channel === 'app_store' || channel === 'direct') {
    return channel;
  }

  return 'development';
}
