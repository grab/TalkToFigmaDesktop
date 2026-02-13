/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Device Information Utility
 *
 * Collects device and system information for GA4 analytics
 * Compatible with Kotlin GoogleAnalyticsService.kt payload structure
 */

import os from 'os';
import { screen } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { getDistributionChannel } from './distribution-channel';

const logger = createLogger('Device');

/**
 * GA4 Device object structure
 */
export interface DeviceInfo {
  category: 'desktop';
  language: string;
  operating_system: string;
  operating_system_version: string;
  screen_resolution?: string;
  brand?: string;
}

/**
 * GA4 User Properties structure
 */
export interface UserProperties {
  app_version: { value: string };
  bundle_id: { value: string };
  app_platform: { value: string };
  java_version: { value: string };
  platform: { value: 'desktop' };
  os_name: { value: string };
  os_version: { value: string };
  screen_resolution: { value: string };
  distribution_channel: { value: string };
}

// Session ID - generated once per app session
let sessionId: string | null = null;

// Cached public IP address
let cachedIp: string | null = null;

/**
 * Map Node.js os.platform() to GA4-friendly operating system names
 */
function mapOperatingSystem(platform: string): string {
  switch (platform) {
    case 'darwin':
      return 'MacOS';
    case 'win32':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return platform;
  }
}

/**
 * Get brand name based on platform
 */
function getBrand(platform: string): string | undefined {
  switch (platform) {
    case 'darwin':
      return 'Apple';
    case 'win32':
      return 'Microsoft';
    case 'linux':
      return 'Linux';
    default:
      return undefined;
  }
}

/**
 * Get screen resolution in WIDTHxHEIGHT format
 */
function getScreenResolution(): string | undefined {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    return `${width}x${height}`;
  } catch (error) {
    logger.debug('Unable to get screen resolution:', error);
    return undefined;
  }
}

/**
 * Validate IPv4 address format
 */
function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Fetch public IP address with 1-second timeout
 * Used for geographic information in GA4
 */
export async function fetchPublicIp(): Promise<string | null> {
  if (cachedIp) return cachedIp;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const response = await fetch('https://api.ipify.org', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const ip = await response.text();
      const trimmedIp = ip.trim();

      if (isValidIpv4(trimmedIp)) {
        cachedIp = trimmedIp;
        logger.debug(`Retrieved public IP: ${cachedIp}`);
        return cachedIp;
      }
    }
  } catch (error) {
    // Silent fail - IP override is optional
    logger.debug('Unable to fetch public IP:', error);
  }

  return null;
}

/**
 * Get or generate session ID
 * Session ID persists for the entire app session
 */
export function getSessionId(): string {
  if (!sessionId) {
    sessionId = uuidv4();
    logger.debug('Generated new session ID');
  }
  return sessionId;
}

/**
 * Get device information for GA4 payload
 */
export function getDeviceInfo(): DeviceInfo {
  const platform = os.platform();
  const osName = mapOperatingSystem(platform);
  const resolution = getScreenResolution();
  const brand = getBrand(platform);

  // Get language from system locale (ISO 639-1 format)
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const language = locale?.split('-')[0] || 'en';

  return {
    category: 'desktop',
    language,
    operating_system: osName,
    operating_system_version: os.release(),
    ...(resolution && { screen_resolution: resolution }),
    ...(brand && { brand }),
  };
}

/**
 * Get user properties for GA4 payload
 */
export function getUserProperties(appVersion: string): UserProperties {
  const platform = os.platform();
  const resolution = getScreenResolution() || 'unknown';

  return {
    app_version: { value: appVersion },
    bundle_id: { value: 'com.grabtaxi.klever' },
    app_platform: { value: 'electron' },
    java_version: { value: process.versions.node }, // Node.js version for parity with Kotlin
    platform: { value: 'desktop' },
    os_name: { value: mapOperatingSystem(platform) },
    os_version: { value: os.release() },
    screen_resolution: { value: resolution },
    distribution_channel: { value: getDistributionChannel() },
  };
}
