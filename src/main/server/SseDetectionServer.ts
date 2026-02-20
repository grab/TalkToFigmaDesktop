/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * SSE Detection Server
 *
 * Listens on port 3056 for a short window after app start to detect legacy MCP clients
 * that are still configured to use the deprecated SSE transport (GET /sse).
 * When detected, fires a callback so the app can show a migration guide dialog.
 */

import * as http from 'http';
import { createLogger } from '../utils/logger';
import { PORTS } from '@/shared/constants';

const logger = createLogger('SseDetection');

const MIGRATION_RESPONSE = JSON.stringify({
  error: 'SSE transport is no longer supported',
  message:
    'This MCP server has been upgraded to use stdio transport. ' +
    'Please update your MCP client configuration to use the stdio server instead. ' +
    'Open TalkToFigma Desktop and go to Settings to get the new configuration.',
  migration: {
    from: `http://127.0.0.1:${PORTS.MCP_SSE}/sse`,
    to: 'stdio (see TalkToFigma Desktop → Settings)',
  },
});

export class SseDetectionServer {
  private httpServer: http.Server | null = null;
  private onDetected: () => void;

  constructor(onDetected: () => void) {
    this.onDetected = onDetected;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (req.url === '/sse' && req.method === 'GET') {
          logger.info('Legacy SSE client detected on port 3056 — showing migration dialog');
          this.onDetected();

          res.writeHead(426, { 'Upgrade': 'stdio' });
          res.end(MIGRATION_RESPONSE);
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'SSE transport is no longer supported' }));
        }
      });

      this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.warn(`Port ${PORTS.MCP_SSE} already in use — SSE detection disabled`);
          resolve(); // silently skip, don't block app start
        } else {
          logger.error('SSE detection server error:', error);
          resolve(); // non-fatal
        }
      });

      this.httpServer.listen(PORTS.MCP_SSE, '127.0.0.1', () => {
        logger.info(`SSE detection server listening on port ${PORTS.MCP_SSE} (60s window)`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      this.httpServer.close(() => {
        logger.info('SSE detection server stopped');
        this.httpServer = null;
        resolve();
      });
    });
  }
}
