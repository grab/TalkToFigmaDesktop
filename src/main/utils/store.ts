/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import ElectronStore from 'electron-store';
import { STORE_KEYS } from '../../shared/constants';
import type { FigmaAuthTokens, FigmaUser } from '../../shared/types';

// Create store instance - use 'any' to avoid ESM/CJS compatibility issues with electron-store types
const store: any = new (ElectronStore as any)({
  name: 'talktofigma-config',
  encryptionKey: 'talktofigma-secure-key-v1', // Use a secure key in production
  defaults: {
    'app.theme': 'system',
    'app.firstLaunch': true,
    'app.showTutorial': true,
  },
});

/**
 * Get store instance (singleton pattern)
 * Use this function to access the store from anywhere in the main process
 */
export function getStore(): any {
  return store;
}

// Helper functions for Figma auth
export function saveFigmaTokens(tokens: FigmaAuthTokens): void {
  store.set(STORE_KEYS.FIGMA_ACCESS_TOKEN, tokens.accessToken);
  store.set(STORE_KEYS.FIGMA_REFRESH_TOKEN, tokens.refreshToken);
  store.set(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT, tokens.expiresAt);
}

export function getFigmaTokens(): FigmaAuthTokens | null {
  const accessToken = store.get(STORE_KEYS.FIGMA_ACCESS_TOKEN) as string | undefined;
  const refreshToken = store.get(STORE_KEYS.FIGMA_REFRESH_TOKEN) as string | undefined;
  const expiresAt = store.get(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT) as number | undefined;

  if (!accessToken || !refreshToken || !expiresAt) {
    return null;
  }

  return { accessToken, refreshToken, expiresAt };
}

export function clearFigmaTokens(): void {
  store.delete(STORE_KEYS.FIGMA_ACCESS_TOKEN);
  store.delete(STORE_KEYS.FIGMA_REFRESH_TOKEN);
  store.delete(STORE_KEYS.FIGMA_TOKEN_EXPIRES_AT);
}

export function saveFigmaUser(user: FigmaUser): void {
  store.set(STORE_KEYS.FIGMA_USER_ID, user.id);
  store.set(STORE_KEYS.FIGMA_USER_HANDLE, user.handle);
  store.set(STORE_KEYS.FIGMA_USER_EMAIL, user.email);
  if (user.imgUrl) {
    store.set(STORE_KEYS.FIGMA_USER_IMG_URL, user.imgUrl);
  }
}

export function getFigmaUser(): FigmaUser | null {
  const id = store.get(STORE_KEYS.FIGMA_USER_ID) as string | undefined;
  const handle = store.get(STORE_KEYS.FIGMA_USER_HANDLE) as string | undefined;
  const email = store.get(STORE_KEYS.FIGMA_USER_EMAIL) as string | undefined;

  if (!id || !handle || !email) {
    return null;
  }

  return {
    id,
    handle,
    email,
    imgUrl: store.get(STORE_KEYS.FIGMA_USER_IMG_URL) as string | undefined,
  };
}

export function clearFigmaUser(): void {
  store.delete(STORE_KEYS.FIGMA_USER_ID);
  store.delete(STORE_KEYS.FIGMA_USER_HANDLE);
  store.delete(STORE_KEYS.FIGMA_USER_EMAIL);
  store.delete(STORE_KEYS.FIGMA_USER_IMG_URL);
}

export function setFigmaFileKey(key: string, url?: string): void {
  store.set(STORE_KEYS.FIGMA_FILE_KEY, key);
  if (url) {
    store.set(STORE_KEYS.FIGMA_FILE_URL, url);
  }
}

export function getFigmaFileKey(): { key: string; url?: string } | null {
  const key = store.get(STORE_KEYS.FIGMA_FILE_KEY) as string | undefined;
  if (!key) return null;

  return {
    key,
    url: store.get(STORE_KEYS.FIGMA_FILE_URL) as string | undefined,
  };
}

// Generic get/set for settings
export function getSetting<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setSetting<T>(key: string, value: T): void {
  store.set(key, value);
}

// Export store instance for direct access if needed
export { store };
