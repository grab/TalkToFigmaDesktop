/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { app, Menu, MenuItemConstructorOptions, shell, BrowserWindow } from 'electron';
import { checkForUpdates } from './utils/updater';
import { getUpdateCapabilities } from './utils/distribution';
import { TalkToFigmaServerManager } from './server/TalkToFigmaServerManager';
import { TalkToFigmaService } from './server/TalkToFigmaService';
import { t } from './i18n';

/**
 * Create application menu
 * Based on Tray menu structure for consistency
 */
export function createMenu(mainWindow: BrowserWindow, requestQuit: () => void | Promise<void>) {
  const isMac = process.platform === 'darwin';
  const showsWindowAfterClose = isMac || process.platform === 'win32';
  const { canCheckForUpdates } = getUpdateCapabilities();
  const serverManager = TalkToFigmaServerManager.getInstance();
  const service = TalkToFigmaService.getInstance();

  /**
   * Navigate to a specific page in the app
   */
  const showPage = (page: 'assistant' | 'terminal' | 'settings' | 'help') => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('tray:navigate-to-page', page);
    }
  };

  const showMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  };

  /**
   * Get current server status for dynamic menu items
   */
  const getServerStatus = () => {
    const status = serverManager.getStatus();
    return status.websocket.running;
  };

  const buildEditMenu = (): MenuItemConstructorOptions[] => ([
    { label: t('common.undo'), role: 'undo' },
    { label: t('common.redo'), role: 'redo' },
    { type: 'separator' },
    { label: t('common.cut'), role: 'cut' },
    { label: t('common.copy'), role: 'copy' },
    { label: t('common.paste'), role: 'paste' },
    { type: 'separator' },
    { label: t('common.selectAll'), role: 'selectAll' },
  ]);

  const template: MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { label: `${t('common.about')} ${app.name}`, role: 'about' },
            { type: 'separator' },
            ...(canCheckForUpdates
              ? [
                  {
                    label: t('common.checkForUpdates'),
                    click: () => {
                      checkForUpdates(true);
                    }
                  } as MenuItemConstructorOptions,
                  { type: 'separator' as const },
                ]
              : []),
            { label: t('common.services'), role: 'services' },
            { type: 'separator' },
            { label: t('common.hide'), role: 'hide' },
            { label: t('common.hideOthers'), role: 'hideOthers' },
            { label: t('common.unhide'), role: 'unhide' },
            { type: 'separator' },
            {
              label: `${t('common.quit')} ${app.name}`,
              accelerator: 'Command+Q',
              click: () => {
                void requestQuit();
              },
            }
          ]
        } as MenuItemConstructorOptions]
      : []),

    // File Menu (Windows/Linux)
    ...(!isMac
      ? [{
          label: t('native.menu.file'),
          submenu: [
            {
              label: t('common.quit'),
              accelerator: 'Alt+F4',
              click: () => {
                void requestQuit();
              },
            },
          ],
        } as MenuItemConstructorOptions]
      : []),

    // Edit Menu (clipboard shortcuts: cut/copy/paste/select all)
    {
      label: t('native.menu.edit'),
      submenu: buildEditMenu(),
    },

    // Server Menu (server control)
    {
      label: t('native.menu.server'),
      submenu: [
        {
          label: getServerStatus() ? t('server.stopServer') : t('server.startServer'),
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            const isRunning = getServerStatus();
            if (isRunning) {
              await service.stopAll({ showNotification: true });
            } else {
              await service.startAll({ showNotification: true });
            }
            // Menu will be automatically updated via menuUpdateCallback
          }
        },
        {
          label: t('server.restartServer'),
          accelerator: 'CmdOrCtrl+R',
          click: async () => {
            await service.stopAll({ showNotification: false });
            await service.startAll({ showNotification: true });
          }
        }
      ] as MenuItemConstructorOptions[]
    },

    // View Menu (page navigation + window controls)
    {
      label: t('native.menu.view'),
      submenu: [
        {
          label: t('app.nav.assistant'),
          accelerator: 'CmdOrCtrl+1',
          click: () => showPage('assistant')
        },
        { type: 'separator' },
        {
          label: t('app.nav.terminal'),
          accelerator: 'CmdOrCtrl+2',
          click: () => showPage('terminal')
        },
        {
          label: t('app.nav.settings'),
          accelerator: 'CmdOrCtrl+3',
          click: () => showPage('settings')
        },
        {
          label: t('app.nav.help'),
          accelerator: 'CmdOrCtrl+4',
          click: () => showPage('help')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ] as MenuItemConstructorOptions[]
    },

    // Window Menu (window management)
    {
      label: t('native.menu.window'),
      submenu: [
        ...(showsWindowAfterClose
          ? [
              {
                label: t('common.showMainWindow'),
                click: () => showMainWindow(),
              } as MenuItemConstructorOptions,
              { type: 'separator' as const },
            ]
          : []),
        { label: t('common.minimize'), role: 'minimize' },
        { label: t('common.zoom'), role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { label: t('common.bringAllToFront'), role: 'front' as const }
            ]
          : [
              { label: t('common.closeWindow'), role: 'close' as const }
            ])
      ] as MenuItemConstructorOptions[]
    },

    // Help Menu
    {
      label: t('native.menu.help'),
      submenu: [
        // Windows/Linux: Add "Check for Updates" to Help menu
        ...(!isMac && canCheckForUpdates
          ? [
              {
                label: t('common.checkForUpdates'),
                click: () => {
                  checkForUpdates(true);
                }
              },
              { type: 'separator' as const }
            ]
          : []),
        {
          label: t('native.menu.learnMore'),
          click: async () => {
            await shell.openExternal('https://github.com/grab/TalkToFigmaDesktop');
          }
        },
        {
          label: t('native.menu.documentation'),
          click: async () => {
            await shell.openExternal('https://github.com/grab/TalkToFigmaDesktop/blob/main/README.md');
          }
        },
        {
          label: t('native.menu.mcpProtocolDocs'),
          click: async () => {
            await shell.openExternal('https://modelcontextprotocol.io');
          }
        },
        { type: 'separator' },
        {
          label: t('common.reportIssue'),
          click: async () => {
            await shell.openExternal('https://github.com/grab/TalkToFigmaDesktop/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
