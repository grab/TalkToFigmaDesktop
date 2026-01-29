/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Figma OAuth 2.0 Configuration
 *
 * Manages OAuth settings for Figma API authentication.
 * Loads credentials from environment variables.
 */

export interface FigmaOAuthConfig {
  // OAuth endpoints
  authUrl: string;
  tokenUrl: string;

  // Local callback server settings
  redirectHost: string;
  redirectPort: number;
  redirectPath: string;
  redirectUri: string;

  // OAuth scopes
  scope: string;

  // Client credentials
  clientId: string;
  clientSecret: string;
}

/**
 * OAuth Configuration Constants
 */
export const OAUTH_CONSTANTS = {
  AUTH_URL: 'https://www.figma.com/oauth',
  TOKEN_URL: 'https://api.figma.com/v1/oauth/token',

  REDIRECT_HOST: '127.0.0.1',
  REDIRECT_PORT: 8080, // Must match Figma OAuth app settings
  REDIRECT_PATH: '/auth/callback',

  // Figma OAuth scopes
  // - current_user:read: Access user profile
  // - file_comments:read: Read comments
  // - file_comments:write: Post comments/replies
  // - file_metadata:read: Access file metadata
  // - file_versions:read: Access version history
  SCOPE: 'current_user:read,file_comments:read,file_comments:write,file_metadata:read,file_versions:read',
} as const;

/**
 * Get OAuth configuration from environment variables
 */
export function getOAuthConfig(): FigmaOAuthConfig {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET must be set in environment variables.\n' +
        'Please set these variables before running the application.'
    );
  }

  const redirectUri = `http://${OAUTH_CONSTANTS.REDIRECT_HOST}:${OAUTH_CONSTANTS.REDIRECT_PORT}${OAUTH_CONSTANTS.REDIRECT_PATH}`;

  return {
    authUrl: OAUTH_CONSTANTS.AUTH_URL,
    tokenUrl: OAUTH_CONSTANTS.TOKEN_URL,
    redirectHost: OAUTH_CONSTANTS.REDIRECT_HOST,
    redirectPort: OAUTH_CONSTANTS.REDIRECT_PORT,
    redirectPath: OAUTH_CONSTANTS.REDIRECT_PATH,
    redirectUri,
    scope: OAUTH_CONSTANTS.SCOPE,
    clientId,
    clientSecret,
  };
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(): boolean {
  try {
    const config = getOAuthConfig();
    return !!(config.clientId && config.clientSecret);
  } catch {
    return false;
  }
}

/**
 * Generate random state for CSRF protection
 */
export function generateState(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(state: string, redirectUri?: string): string {
  const config = getOAuthConfig();
  const uri = redirectUri || config.redirectUri;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: uri,
    scope: config.scope,
    state,
    response_type: 'code',
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Log OAuth configuration (without sensitive data)
 */
export function logOAuthConfig(logger: any): void {
  try {
    const config = getOAuthConfig();
    logger.info('Figma OAuth Configuration:', {
      authUrl: config.authUrl,
      tokenUrl: config.tokenUrl,
      redirectUri: config.redirectUri,
      scope: config.scope,
      clientId: `${config.clientId.slice(0, 8)}...`,
      configSource: process.env.FIGMA_CLIENT_ID ? 'environment variables' : 'unknown',
    });
  } catch (error) {
    logger.error('Failed to load OAuth configuration:', error);
  }
}
