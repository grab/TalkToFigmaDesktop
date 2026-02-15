/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import path from 'path';

import {
  Tray,
  Menu,
  NativeImage,
  nativeImage,
  app,
  BrowserWindow,
  nativeTheme,
} from 'electron';
import { createLogger } from '../utils/logger';

import { TalkToFigmaServerManager } from './TalkToFigmaServerManager';
import { TalkToFigmaService } from './TalkToFigmaService';
import { checkForUpdates } from '../utils/updater';

const logger = createLogger('Tray');

/**
 * System Tray Menu for TalkToFigma Servers
 * Provides quick access to server controls and status
 * 
 * Platform-specific icon behavior:
 * - macOS: Uses black template images that auto-invert in dark mode
 * - Windows: Detects system theme and loads appropriate colored icon
 * - Linux: Uses black icons (most desktop environments support this)
 */
export class TalkToFigmaTray {
  private tray: Tray | null = null;
  private manager: TalkToFigmaServerManager;
  private service: TalkToFigmaService;

  constructor(manager: TalkToFigmaServerManager) {
    this.manager = manager;
    this.service = TalkToFigmaService.getInstance();

    // Register this tray to be updated when server status changes
    this.service.setTrayUpdateCallback(() => {
      this.updateMenu();
    });

    // Windows: Listen for theme changes to update icon
    if (process.platform === 'win32') {
      nativeTheme.on('updated', () => {
        logger.info(`[TalkToFigma Tray] Windows theme changed to ${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'} mode`);
        this.updateMenu();
      });
    }
  }

  /**
   * Create system tray icon and menu
   */
  create(): void {
    if (this.tray) {
      logger.warn('[TalkToFigma Tray] Tray already exists');
      return;
    }

    try {
      const icon = this.getIcon();
      this.tray = new Tray(icon);
      this.tray.setToolTip('TalkToFigma Desktop - Figma Automation');
      this.updateMenu();

      logger.info('[TalkToFigma Tray] ✅ System tray created');
    } catch (error) {
      logger.error('[TalkToFigma Tray] Failed to create tray:', error);
    }
  }

  /**
   * Destroy system tray
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      logger.info('[TalkToFigma Tray] System tray destroyed');
    }
  }

  /**
   * Update tray menu with current server status
   */
  updateMenu(): void {
    if (!this.tray) {
      logger.warn('[TalkToFigma Tray] Tray does not exist');
      return;
    }

    try {
      this.tray.setImage(this.getIcon());
      this.tray.setContextMenu(this.buildMenu());
    } catch (error) {
      logger.error('[TalkToFigma Tray] Failed to update menu:', error);
    }
  }

  /**
   * Build context menu based on current server status
   */
  private buildMenu(): Menu {
    const status = this.manager.getStatus();
    const wsRunning = status.websocket.running;

    const template: Electron.MenuItemConstructorOptions[] = [
      // ═══ HEADER ═══
      {
        label: 'TalkToFigma Desktop',
        enabled: false,
      },
      { type: 'separator' },

      // ═══ WINDOW & PAGES ═══
      {
        label: 'Terminal',
        click: () => this.showPage('terminal'),
      },
      {
        label: 'Settings',
        click: () => this.showPage('settings'),
      },
      {
        label: 'Help',
        click: () => this.showPage('help'),
      },
      { type: 'separator' },

      // ═══ SERVER CONTROLS ═══
      {
        label: wsRunning ? '⬤ Stop Server' : '○ Start Server',
        click: async () => {
          if (wsRunning) {
            await this.stopAll();
          } else {
            await this.startAll();
          }
        },
      },
      { type: 'separator' },

      // ═══ UPDATE CHECK ═══
      {
        label: 'Check for Updates...',
        click: () => checkForUpdates(true),
      },
      { type: 'separator' },

      // ═══ EXIT ═══
      {
        label: 'Quit',
        click: async () => {
          await this.manager.stopAll();
          app.quit();
        },
      },
    ];

    return Menu.buildFromTemplate(template);
  }

  /**
   * Get tray icon based on server status and platform
   * 
   * Platform behavior:
   * - macOS: Uses black template images (auto-inverts in dark mode)
   * - Windows: Detects theme and loads black (light mode) or white (dark mode) icons
   * - Linux: Uses black icons
   */
  private getIcon(): NativeImage {
    let icon: NativeImage = nativeImage.createEmpty();

    try {
      // Check if WebSocket server is running to determine which icon to use
      const status = this.manager.getStatus();
      const wsRunning = status.websocket.running;
      
      // Determine icon file name based on platform and theme
      let iconFileName: string = wsRunning ? 'trayTemplate_active.png' : 'trayTemplate.png'; // Default

      if (process.platform === 'darwin' || process.platform === 'linux') {
        // macOS & Linux: Use black template images (will auto-invert in dark mode)
        iconFileName = wsRunning ? 'trayTemplate_active.png' : 'trayTemplate.png';
        logger.info(`[TalkToFigma Tray] ${process.platform === 'darwin' ? 'macOS' : 'Linux'}: Using template icon for auto light/dark support`);
      } else if (process.platform === 'win32') {
        // Windows: Detect system theme and load appropriate icon
        const isDarkMode = nativeTheme.shouldUseDarkColors;
        if (isDarkMode) {
          // Dark mode: use white icons
          iconFileName = wsRunning ? 'tray_dark_active.png' : 'tray_dark.png';
        } else {
          // Light mode: use black template icons
          iconFileName = wsRunning ? 'trayTemplate_active.png' : 'trayTemplate.png';
        }
        logger.info(`[TalkToFigma Tray] Windows: Detected ${isDarkMode ? 'dark' : 'light'} mode, using ${iconFileName}`);
      } else {
        logger.warn(`[TalkToFigma Tray] Unknown platform: ${process.platform}, using default template icon`);
      }

      // Get app root path
      const appPath = app.getAppPath();
      const isProduction = app.isPackaged;

      // Build path arrays - prioritize production paths when packaged
      const iconPaths = isProduction ? [
        // Production paths (packaged app) - try these first
        path.join(process.resourcesPath, 'public', iconFileName),
        // Fallback to relative paths
        path.join(appPath, '..', 'public', iconFileName),
        path.join(appPath, 'public', iconFileName),
      ] : [
        // Development paths - try project root first
        path.join(__dirname, '..', '..', '..', 'public', iconFileName),
        path.join(appPath, '..', '..', 'public', iconFileName),
        path.join(appPath, 'public', iconFileName),
      ];

      // Fallback paths if primary icon not found
      const fallbackFileName = wsRunning ? 'tray_active.png' : 'tray.png';
      const fallbackPaths = isProduction ? [
        path.join(process.resourcesPath, 'public', fallbackFileName),
        path.join(appPath, '..', 'public', fallbackFileName),
        path.join(appPath, 'public', fallbackFileName),
      ] : [
        path.join(__dirname, '..', '..', '..', 'public', fallbackFileName),
        path.join(appPath, '..', '..', 'public', fallbackFileName),
        path.join(appPath, 'public', fallbackFileName),
      ];

      const allPaths = [...iconPaths, ...fallbackPaths];

      logger.info(`[TalkToFigma Tray] Environment: ${isProduction ? 'Production' : 'Development'}`);
      logger.info(`[TalkToFigma Tray] app.getAppPath(): ${appPath}`);
      logger.info(`[TalkToFigma Tray] process.resourcesPath: ${process.resourcesPath || 'undefined'}`);
      logger.info(`[TalkToFigma Tray] Attempting to load icon: ${iconFileName}`);

      // Try each path until we find a valid icon
      for (const iconPath of allPaths) {
        logger.info(`[TalkToFigma Tray] Trying path: ${iconPath}`);
        const loadedIcon = nativeImage.createFromPath(iconPath);
        if (!loadedIcon.isEmpty()) {
          const isTemplate = iconPath.includes('Template');
          const isFallback = iconPath.includes(fallbackFileName);
          logger.info(
            `[TalkToFigma Tray] ✅ Loaded ${isFallback ? 'fallback' : isTemplate ? 'template' : 'themed'} icon (${wsRunning ? 'active' : 'inactive'}) from: ${iconPath}`,
          );
          
          // Resize to proper tray icon size BEFORE setting as template
          // macOS tray icons should be 16x16 (or 32x32 for @2x)
          const size = loadedIcon.getSize();
          logger.info(`[TalkToFigma Tray] Original icon size: ${size.width}x${size.height}`);
          
          if (size.width !== 16 || size.height !== 16) {
            // Resize to 16x16 for proper tray display
            icon = loadedIcon.resize({ width: 16, height: 16 });
            logger.info('[TalkToFigma Tray] Resized icon to 16x16 for tray');
          } else {
            icon = loadedIcon;
            logger.info('[TalkToFigma Tray] Icon already 16x16, using as-is');
          }
          
          // macOS & Linux: Set as template image for automatic theme support
          if (process.platform === 'darwin' || process.platform === 'linux') {
            icon.setTemplateImage(true);
            logger.info(`[TalkToFigma Tray] ✅ Enabled template image mode (auto light/dark support)`);
          }
          
          break;
        }
      }

      // If still empty, log detailed warning
      if (icon.isEmpty()) {
        logger.warn('[TalkToFigma Tray] ❌ Could not load icon from any path');
        logger.warn('[TalkToFigma Tray] Platform-specific icon requirements:');
        logger.warn('[TalkToFigma Tray] ');
        logger.warn('[TalkToFigma Tray] macOS:');
        logger.warn('[TalkToFigma Tray]   - File: public/trayTemplate.png (inactive), public/trayTemplate_active.png (active)');
        logger.warn('[TalkToFigma Tray]   - Color: BLACK (#000000) with transparent background');
        logger.warn('[TalkToFigma Tray]   - Size: 16x16pt (32x32px @2x recommended)');
        logger.warn('[TalkToFigma Tray]   - Auto-inverts in dark mode');
        logger.warn('[TalkToFigma Tray] ');
        logger.warn('[TalkToFigma Tray] Windows:');
        logger.warn('[TalkToFigma Tray]   - Light mode: uses public/trayTemplate.png / public/trayTemplate_active.png (BLACK #000)');
        logger.warn('[TalkToFigma Tray]   - Dark mode: public/tray_dark.png / public/tray_dark_active.png (WHITE #fff)');
        logger.warn('[TalkToFigma Tray]   - Size: 16x16px (32x32px @2x recommended)');
        logger.warn('[TalkToFigma Tray] ');
        logger.warn('[TalkToFigma Tray] Linux:');
        logger.warn('[TalkToFigma Tray]   - Same as macOS (uses template images)');
      }

    } catch (error) {
      logger.error('[TalkToFigma Tray] Failed to load icon:', error);
      // Create empty icon as last resort
      icon = nativeImage.createEmpty();
    }

    return icon;
  }

  /**
   * Show main window and navigate to specific page
   */
  private showPage(page: 'terminal' | 'settings' | 'help'): void {
    try {
      const windows = BrowserWindow.getAllWindows();

      if (windows.length === 0) {
        logger.warn('[TalkToFigma Tray] No windows available');
        return;
      }

      const mainWindow = windows[0];

      // Show and focus the window
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();

      // Send IPC message to navigate to the page
      mainWindow.webContents.send('tray:navigate-to-page', page);

      logger.info(`[TalkToFigma Tray] Navigated to ${page} page`);
    } catch (error) {
      logger.error('[TalkToFigma Tray] Failed to show page:', error);
    }
  }

  /**
   * Start all servers
   */
  private async startAll(): Promise<void> {
    await this.service.startAll({ showNotification: true });
    this.updateMenu();
  }

  /**
   * Stop all servers
   */
  private async stopAll(): Promise<void> {
    await this.service.stopAll({ showNotification: true });
    this.updateMenu();
  }

  /**
   * Start WebSocket server only
   */
  private async startWebSocket(): Promise<void> {
    await this.service.startWebSocket({ showNotification: true });
    this.updateMenu();
  }

  /**
   * Stop WebSocket server only
   */
  private async stopWebSocket(): Promise<void> {
    await this.service.stopWebSocket({ showNotification: true });
    this.updateMenu();
  }
}
