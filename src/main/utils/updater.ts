/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { autoUpdater, BrowserWindow, dialog, app } from 'electron';
import updateElectronApp from 'update-electron-app';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';

let isManualCheck = false;

// Track updater state to prevent calling checkForUpdates while already in progress
type UpdaterState = 'idle' | 'checking' | 'downloading' | 'downloaded';
let updaterState: UpdaterState = 'idle';

/**
 * Initialize auto-updater for GitHub Releases
 * Uses update-electron-app for automatic updates from GitHub Releases
 * via update.electronjs.org proxy service
 */
export function initializeUpdater() {
  // Exit early on unsupported platforms
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    log.info('Auto-updater not supported on', process.platform);
    return;
  }

  // Don't run in development
  if (!app.isPackaged) {
    log.info('Auto-updater disabled in development mode');
    return;
  }

  log.info('Initializing auto-updater with update-electron-app...');
  log.info('Current version:', app.getVersion());
  log.info('Repository: grab/TalkToFigmaDesktop');

  // Initialize update-electron-app
  // This automatically:
  // - Detects repository from package.json
  // - Constructs feed URL for update.electronjs.org
  // - Checks for updates every 10 minutes
  // - Handles download and installation
  updateElectronApp({
    updateInterval: '10 minutes',
    logger: log,
    notifyUser: true,
  });

  // Add additional event listeners for state tracking
  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    updaterState = 'idle';
    if (isManualCheck) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        dialog.showMessageBox(focusedWindow, {
          type: 'error' as const,
          title: 'Update Error',
          message: 'Failed to check for updates.',
          detail: err.message,
          buttons: ['OK']
        });
      }
      isManualCheck = false;
    }
  });

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    updaterState = 'checking';
  });

  autoUpdater.on('update-available', () => {
    log.info('Update available - downloading...');
    updaterState = 'downloading';
    if (isManualCheck) {
      isManualCheck = false;
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
    updaterState = 'idle';
    if (isManualCheck) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        dialog.showMessageBox(focusedWindow, {
          type: 'info' as const,
          title: 'No Updates',
          message: 'Current version is up-to-date.',
          buttons: ['OK']
        });
      }
      isManualCheck = false;
    }
  });

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    log.info('Update downloaded:', releaseName);
    updaterState = 'downloaded';

    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      dialog.showMessageBox(focusedWindow, {
        type: 'info' as const,
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version has been downloaded. Restart the application to apply the updates.',
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    }
  });

  log.info('✅ Auto-updater initialized successfully');
}

/**
 * Manually check for updates
 * @param manual - Whether this is a manual check (shows dialog)
 */
export function checkForUpdates(manual = false) {
  isManualCheck = manual;
  
  if (!app.isPackaged) {
      log.info('Skipping update check in dev mode (not supported by native autoUpdater without signing)');
      if (manual) {
          dialog.showMessageBox({
              type: 'info',
              title: 'Development Mode',
              message: 'Update checks are only available in the packaged application.'
          });
      }
      return;
  }
  
  // Handle different updater states
  if (updaterState === 'downloading') {
    log.info('Update already downloading, skipping check');
    if (manual) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update In Progress',
        message: 'An update is being downloaded.',
        detail: 'Please wait for the download to complete. You will be prompted to restart when ready.'
      });
    }
    return;
  }
  
  if (updaterState === 'downloaded') {
    log.info('Update already downloaded, prompting restart');
    if (manual) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        dialog.showMessageBox(focusedWindow, {
          type: 'info',
          buttons: ['Restart', 'Later'],
          title: 'Update Ready',
          message: 'An update has been downloaded.',
          detail: 'Restart the application to apply the updates.'
        }).then(({ response }) => {
          if (response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      }
    }
    return;
  }
  
  if (updaterState === 'checking') {
    log.info('Already checking for updates, skipping');
    return;
  }
  
  log.info(`Update check initiated (Manual: ${manual})`);
  autoUpdater.checkForUpdates();
}
