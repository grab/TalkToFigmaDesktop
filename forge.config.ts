import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerPKG } from '@electron-forge/maker-pkg';
import { MakerMSIX } from '@electron-forge/maker-msix';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { PublisherGithub } from '@electron-forge/publisher-github';
import dotenv from 'dotenv';

// Load environment variables from .env file (local development only)
dotenv.config();

// Check if building for Mac App Store
const isMAS = process.env.PLATFORM === 'mas';
const windowsExecutableName = 'talktofigma-desktop';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.grabtaxi.klever',
    name: 'TalkToFigma Desktop',
    executableName: windowsExecutableName,
    icon: './public/icon', // Electron Forge will append .icns, .ico, .png automatically
    extraResource: [
      './public',
    ],
    // Code signing configuration (uses .env locally, CI environment variables in automation)
    osxSign: (isMAS ? {
      // Mac App Store signing
      identity: process.env.SIGNING_IDENTITY_APPSTORE || 'Apple Distribution',
      hardenedRuntime: false, // MAS doesn't use hardened runtime
      timestamp: 'none', // Disable TSA calls explicitly for @electron/osx-sign
      // Skip locale resource payloads from explicit signing to reduce signing overhead
      ignore: (filePath: string) => /\/Resources\/[^/]+\.lproj\/locale\.pak$/.test(filePath.replace(/\\/g, '/')),
      entitlements: 'entitlements.mas.plist',
      'entitlements-inherit': 'entitlements.mas.plist',
      provisioningProfile: process.env.PROVISIONING_PROFILE, // Optional: only if using provisioning profile
      optionsForFile: (filePath: string) => {
        // Apply child entitlements only to helper/framework binaries.
        const normalizedPath = filePath.replace(/\\/g, '/');
        const useChildEntitlements =
          /\/Contents\/Frameworks\/[^/]+\.app\/Contents\/MacOS\//.test(normalizedPath) ||
          /\/Contents\/Frameworks\/[^/]+\.framework\//.test(normalizedPath);
        return {
          hardenedRuntime: false,
          timestamp: 'none',
          entitlements: useChildEntitlements ? 'entitlements.child.plist' : 'entitlements.mas.plist',
        };
      },
    } : {
      // Regular distribution signing (Developer ID)
      identity: process.env.SIGNING_IDENTITY || 'Developer ID Application: GRABTAXI HOLDINGS PTE. LTD. (VU3G7T53K5)',
      hardenedRuntime: true,
      'gatekeeper-assess': false,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
    }) as any,
    // Notarization configuration (not used for MAS/App Store builds)
    osxNotarize: isMAS ? undefined : {
      appleId: process.env.APPLE_ID || '',
      appleIdPassword: process.env.APPLE_PASSWORD || '',
      teamId: process.env.APPLE_TEAM_ID || 'VU3G7T53K5',
    },
  },
  rebuildConfig: {},
  makers: [
    // macOS: DMG (primary) and ZIP (backup/CI) for Developer ID distribution
    new MakerDMG({
      format: 'ULFO',
      icon: './public/icon.icns', // DMG volume icon (prevents Electron default icon confusion)
    }, ['darwin']),
    new MakerZIP({}, ['darwin']),
    // macOS: PKG for Mac App Store distribution
    new MakerPKG({
      identity: process.env.INSTALLER_IDENTITY || '3rd Party Mac Developer Installer',
    }, ['mas']),
    // Windows: Squirrel for traditional distribution with auto-update
    new MakerSquirrel({
      // Squirrel for traditional installer
    }, ['win32']),
    // Windows: MSIX for Microsoft Store distribution (no signing required for store submission)
    new MakerMSIX({
      manifestVariables: {
        publisher: process.env.MSIX_PUBLISHER || 'CN=GRABTAXI HOLDINGS PTE. LTD.',
        publisherDisplayName: process.env.MSIX_PUBLISHER_DISPLAY_NAME || 'GRABTAXI HOLDINGS PTE. LTD.',
        packageIdentity: process.env.MSIX_IDENTITY_NAME || 'com.grabtaxi.klever',
        appExecutable: `${windowsExecutableName}.exe`,
      },
    }),
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
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'grab',
        name: 'TalkToFigmaDesktop',
      },
      prerelease: false,
      draft: true, // Create as draft for manual review before publishing
    }),
  ],
};

export default config;
