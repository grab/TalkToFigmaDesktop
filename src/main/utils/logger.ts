/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import winston from 'winston';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import type { LogEntry } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants';

// Determine log directory
const getLogDir = (): string => {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  } catch {
    // Fallback for when app is not ready yet
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  }
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, source }) => {
    const src = source ? `[${source}]` : '';
    return `${timestamp} ${level} ${src} ${message}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.json()
);

// Log buffer for UI display (keeps last N entries)
const LOG_BUFFER_SIZE = 500;
const logBuffer: Array<{
  level: string;
  message: string;
  timestamp: string;
  source?: string;
}> = [];

// MainWindow reference for emitting logs to renderer
let mainWindow: BrowserWindow | null = null;

// Set mainWindow reference (called from main.ts)
export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

// Custom transport to send logs to renderer
class IPCTransport extends winston.Transport {
  constructor(opts?: winston.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const logEntry: LogEntry = {
      level: info.level as LogEntry['level'],
      message: info.message,
      timestamp: info.timestamp || new Date().toISOString(),
      source: info.source,
    };

    // Add to buffer
    logBuffer.push(logEntry);

    // Trim buffer if needed
    if (logBuffer.length > LOG_BUFFER_SIZE) {
      logBuffer.shift();
    }

    // Emit to renderer if window is available
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.LOG_ENTRY, logEntry);
    }

    callback();
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  defaultMeta: { service: 'talktofigma' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(getLogDir(), 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(getLogDir(), 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // IPC transport for sending logs to renderer
    new IPCTransport({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      ),
    }),
  ],
  exitOnError: false,
});

// Helper to create child loggers with source context
export function createLogger(source: string): winston.Logger {
  return logger.child({ source });
}

export function getLogBuffer() {
  return [...logBuffer];
}

export function clearLogBuffer() {
  logBuffer.length = 0;
}

// Export default logger
export default logger;
