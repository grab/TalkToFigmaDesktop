import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerMSIX } from '@electron-forge/maker-msix';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.grabtaxi.klever',
    name: 'TalkToFigma Desktop',
    executableName: 'talktofigma-desktop',
    icon: './public/icon', // Electron Forge will append .icns, .ico, .png automatically
    extraResource: [
      './public',
    ],
    // Enable code signing with default settings
    osxSign: {},
  },
  rebuildConfig: {},
  makers: [
    // macOS: DMG (primary) and ZIP (backup/CI)
    new MakerDMG({
      format: 'ULFO',
    }, ['darwin']),
    new MakerZIP({}, ['darwin']),
    // Windows: MSIX (for Microsoft Store) and Squirrel (for direct download)
    new MakerMSIX({
      manifestVariables: {
        publisher: 'CN=GRABTAXI HOLDINGS PTE. LTD.',
        // packageIdentity: MSIX package identity (no spaces allowed)
        packageIdentity: 'TalkToFigmaDesktop',
        // packageDisplayName: User-facing package name (spaces allowed)
        packageDisplayName: 'TalkToFigma Desktop',
        // appDisplayName: User-facing app name (spaces allowed)
        appDisplayName: 'TalkToFigma Desktop',
        // appExecutable: Must match packagerConfig.executableName
        appExecutable: 'talktofigma-desktop.exe',
      },
      // Code signing will be configured in CI via windowsSignOptions
    }, ['win32']),
    new MakerSquirrel({
      // Squirrel for traditional installer
    }, ['win32']),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
        {
          // stdio MCP server - standalone executable
          entry: 'src/main/server/mcp-stdio-server.ts',
          config: 'vite.stdio.config.ts',
          target: 'main',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false, // Allow loading extraResources outside asar
    }),
  ],
};

export default config;
