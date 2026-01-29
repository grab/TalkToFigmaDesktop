/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Figma OAuth 2.0 Service
 *
 * Handles OAuth authentication flow using local HTTP server for callbacks.
 */

import http from 'http';
import { URL } from 'url';
import { shell } from 'electron';
import { createLogger } from '../../utils/logger';
import { getStore } from '../../utils/store';
import { STORE_KEYS } from '../../../shared/constants';
import {
  getOAuthConfig,
  validateOAuthConfig,
  generateState,
  buildAuthUrl,
  logOAuthConfig,
} from './FigmaOAuthConfig';

const logger = createLogger('OAuth');

/**
 * OAuth Token Response from Figma API
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user_id: string;
}

/**
 * OAuth Result (internal)
 */
type OAuthResult =
  | { type: 'success'; code: string }
  | { type: 'error'; error: string; description?: string }
  | { type: 'timeout' };

/**
 * Figma OAuth Service
 */
export class FigmaOAuthService {
  private server: http.Server | null = null;
  private expectedState: string | null = null;
  private authPromise: Promise<OAuthResult> | null = null;
  private authResolve: ((result: OAuthResult) => void) | null = null;

  /**
   * Start OAuth authentication flow
   */
  async authenticate(): Promise<TokenResponse> {
    try {
      logger.info('Starting Figma OAuth authentication...');

      // 1. Validate configuration
      if (!validateOAuthConfig()) {
        throw new Error('OAuth configuration is invalid');
      }

      logOAuthConfig(logger);

      // 2. Start local HTTP server
      await this.startLocalServer();

      // 3. Generate state and build auth URL
      const state = generateState();
      this.expectedState = state;

      const authUrl = buildAuthUrl(state);
      logger.info('Opening OAuth page in browser:', authUrl);

      // 4. Open browser
      await shell.openExternal(authUrl);

      // 5. Wait for callback (5 minutes timeout)
      const result = await this.waitForCallback();

      // 6. Exchange code for token
      if (result.type === 'success') {
        logger.info(`Received authorization code: ${result.code.slice(0, 8)}...`);
        return await this.exchangeCodeForToken(result.code);
      } else if (result.type === 'error') {
        throw new Error(`OAuth error: ${result.error} - ${result.description || 'Unknown error'}`);
      } else {
        throw new Error('OAuth authentication timeout');
      }
    } catch (error) {
      logger.error('OAuth authentication failed:', error);
      throw error;
    } finally {
      this.stopLocalServer();
    }
  }

  /**
   * Start local HTTP server for OAuth callback
   */
  private async startLocalServer(): Promise<void> {
    const config = getOAuthConfig();

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleCallback(req, res);
      });

      this.server.on('error', (error) => {
        logger.error('Local server error:', error);
        reject(error);
      });

      this.server.listen(config.redirectPort, config.redirectHost, () => {
        logger.info(`OAuth callback server listening on ${config.redirectUri}`);
        resolve();
      });
    });
  }

  /**
   * Stop local HTTP server
   */
  private stopLocalServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      logger.debug('OAuth callback server stopped');
    }
    this.expectedState = null;
    this.authPromise = null;
    this.authResolve = null;
  }

  /**
   * Handle OAuth callback request
   */
  private handleCallback(req: http.IncomingMessage, res: http.ServerResponse): void {
    const config = getOAuthConfig();
    const url = new URL(req.url || '', `http://${config.redirectHost}:${config.redirectPort}`);

    // Check if it's the callback path
    if (url.pathname !== config.redirectPath) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Send success/error HTML page to browser
    const htmlResponse = this.getCallbackHtml(!!error);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlResponse);

    // Handle OAuth result
    if (error) {
      logger.error(`OAuth callback error: ${error} - ${errorDescription}`);
      this.authResolve?.({ type: 'error', error, description: errorDescription || undefined });
    } else if (!code || !state) {
      logger.error('OAuth callback missing code or state');
      this.authResolve?.({ type: 'error', error: 'invalid_callback', description: 'Missing code or state' });
    } else if (state !== this.expectedState) {
      logger.error('OAuth state mismatch (CSRF attack?)');
      this.authResolve?.({ type: 'error', error: 'state_mismatch', description: 'Invalid state parameter' });
    } else {
      logger.info('OAuth callback successful');
      this.authResolve?.({ type: 'success', code });
    }
  }

  /**
   * Wait for OAuth callback (with timeout)
   */
  private async waitForCallback(): Promise<OAuthResult> {
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    this.authPromise = new Promise((resolve) => {
      this.authResolve = resolve;
    });

    const timeoutPromise = new Promise<OAuthResult>((resolve) => {
      setTimeout(() => {
        logger.warn('OAuth callback timeout');
        resolve({ type: 'timeout' });
      }, TIMEOUT_MS);
    });

    return Promise.race([this.authPromise, timeoutPromise]);
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const config = getOAuthConfig();

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: 'authorization_code',
    });

    logger.info('Requesting access token from Figma...');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Token exchange failed (${response.status}):`, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenResponse: TokenResponse = await response.json();
    logger.info('Successfully obtained access token');

    if (tokenResponse.refresh_token) {
      logger.info('Refresh token received');
    }

    // Save tokens to store
    await this.saveTokens(tokenResponse);

    return tokenResponse;
  }

  /**
   * Save tokens to electron-store
   */
  private async saveTokens(tokenResponse: TokenResponse): Promise<void> {
    const store = getStore();

    // Calculate expiration timestamp
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

    store.set(STORE_KEYS.FIGMA_ACCESS_TOKEN, tokenResponse.access_token);
    store.set(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT, expiresAt);
    store.set(STORE_KEYS.FIGMA_USER_ID, tokenResponse.user_id);

    if (tokenResponse.refresh_token) {
      store.set(STORE_KEYS.FIGMA_REFRESH_TOKEN, tokenResponse.refresh_token);
    }

    logger.info('Tokens saved to store');
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(): Promise<string | null> {
    const store = getStore();
    const accessToken = store.get(STORE_KEYS.FIGMA_ACCESS_TOKEN) as string | undefined;
    const expiresAt = store.get(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT) as number | undefined;

    if (!accessToken || !expiresAt) {
      logger.debug('No access token found in store');
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000;

    if (now < expiresAt - bufferMs) {
      // Token is still valid
      return accessToken;
    }

    // Token expired, try to refresh
    logger.info('Access token expired, attempting refresh...');
    const refreshToken = store.get(STORE_KEYS.FIGMA_REFRESH_TOKEN) as string | undefined;

    if (!refreshToken) {
      logger.warn('No refresh token available');
      return null;
    }

    try {
      const service = new FigmaOAuthService();
      const newTokens = await service.refreshAccessToken(refreshToken);
      await service.saveTokens(newTokens);
      return newTokens.access_token;
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const config = getOAuthConfig();

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    logger.info('Refreshing access token...');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Token refresh failed (${response.status}):`, errorText);
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const tokenResponse: TokenResponse = await response.json();
    logger.info('Successfully refreshed access token');

    return tokenResponse;
  }

  /**
   * Clear stored tokens (logout)
   */
  static clearTokens(): void {
    const store = getStore();
    store.delete(STORE_KEYS.FIGMA_ACCESS_TOKEN);
    store.delete(STORE_KEYS.FIGMA_REFRESH_TOKEN);
    store.delete(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT);
    store.delete(STORE_KEYS.FIGMA_USER_ID);
    store.delete(STORE_KEYS.FIGMA_USER_HANDLE);
    store.delete(STORE_KEYS.FIGMA_USER_EMAIL);
    store.delete(STORE_KEYS.FIGMA_USER_IMG_URL);
    store.delete(STORE_KEYS.FIGMA_FILE_KEY);
    store.delete(STORE_KEYS.FIGMA_FILE_URL);

    logger.info('All Figma tokens and user data cleared');
  }

  /**
   * HTML response for OAuth callback
   */
  private getCallbackHtml(isError: boolean): string {
    if (isError) {
      return `
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Failed</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .error { color: #d32f2f; }
    h1 { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1 class="error">Authentication Failed</h1>
  <p>There was an error during authentication.</p>
  <p>You can close this window and try again.</p>
</body>
</html>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Successful</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .success { color: #388e3c; }
    h1 { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1 class="success">Authentication Successful!</h1>
  <p>You can now close this window and return to the TalkToFigma Desktop app.</p>
  <script>
    // Auto-close after 3 seconds
    setTimeout(() => window.close(), 3000);
  </script>
</body>
</html>
    `;
  }
}
