/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

// Figma-related types

export interface FigmaUser {
  id: string;
  handle: string;
  email: string;
  imgUrl?: string;
}

export interface FigmaAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface FigmaAuthState {
  isAuthenticated: boolean;
  user: FigmaUser | null;
  tokens: FigmaAuthTokens | null;
  fileKey: string | null;
  fileUrl: string | null;
}

export interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

export interface FigmaSelection {
  nodes: FigmaNode[];
  count: number;
}

// Figma plugin message types
export interface FigmaPluginMessage {
  type: string;
  channelId?: string;
  requestId?: string;
  payload?: unknown;
}

export interface FigmaCommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
