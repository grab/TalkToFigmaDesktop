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
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file (local development only)
dotenv.config();

// Check if building for Mac App Store
const isMAS = process.env.PLATFORM === 'mas';
const windowsExecutableName = 'talktofigma-desktop';
const shouldSkipExplicitSigning = (filePath: string) =>
  /\/Resources\/[^/]+\.lproj\/locale\.pak$/.test(filePath.replace(/\\/g, '/'));

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.grabtaxi.klever',
    name: 'TalkToFigma Desktop',
    executableName: windowsExecutableName,
    icon: './public/icon', // Electron Forge will append .icns, .ico, .png automatically
    extraResource: [
      './public',
      './runtime/llama',
    ],
    osxUniversal: {
      // Runtime binaries for both archs are bundled intentionally; allow identical Mach-O files.
      x64ArchFiles: 'Contents/Resources/llama/bin/**/*',
    },
    // Code signing configuration (uses .env locally, CI environment variables in automation)
    osxSign: (isMAS ? {
      // Mac App Store signing
      identity: process.env.SIGNING_IDENTITY_APPSTORE || 'Apple Distribution',
      hardenedRuntime: false, // MAS doesn't use hardened runtime
      timestamp: 'none', // Disable TSA calls explicitly for @electron/osx-sign
      // Skip locale resource payloads from explicit signing to reduce signing overhead
      ignore: shouldSkipExplicitSigning,
      entitlements: 'entitlements.mas.plist',
      // Child helpers (Renderer/GPU/Plugin) must inherit sandbox from parent.
      // Using parent entitlements here can crash helper startup in libsecinit.
      'entitlements-inherit': 'entitlements.child.plist',
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
      // Skip locale resource payloads from explicit signing to reduce signing overhead
      ignore: shouldSkipExplicitSigning,
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
  rebuildConfig: {
    // These ws accelerators are optional. Skipping their Electron rebuild keeps
    // local dev startup working on machines without Visual Studio C++ toolchains.
    ignoreModules: ['bufferutil', 'utf-8-validate'],
  },
  // Hooks for post-processing after packaging
  hooks: {
    postPackage: async (_config, options) => {
      const isMacBuild = options.platform === 'darwin' || options.platform === 'mas';
      if (!isMacBuild) {
        return;
      }

      const outputDir = options.outputPaths[0];
      const items = fs.readdirSync(outputDir);
      const appBundle = items.find(item => item.endsWith('.app'));
      if (!appBundle) {
        throw new Error('[postPackage] No .app bundle found in output directory');
      }

      const appPath = path.join(outputDir, appBundle);
      const frameworksPath = path.join(appPath, 'Contents', 'Frameworks');
      const runtimeRoot = path.join(appPath, 'Contents', 'Resources', 'llama', 'bin');

      const runtimeArtifacts = fs.existsSync(runtimeRoot)
        ? fs.readdirSync(runtimeRoot)
          .flatMap((platformDir) => {
            const platformDirPath = path.join(runtimeRoot, platformDir);
            if (!fs.existsSync(platformDirPath) || !fs.statSync(platformDirPath).isDirectory()) {
              return [];
            }

            return fs.readdirSync(platformDirPath)
              .map((entry) => path.join(platformDirPath, entry))
              .filter((artifactPath) => {
                if (!fs.existsSync(artifactPath)) {
                  return false;
                }
                const stat = fs.lstatSync(artifactPath);
                if (!stat.isFile()) {
                  return false;
                }

                const lowerName = path.basename(artifactPath).toLowerCase();
                return lowerName === 'llama-server'
                  || lowerName === 'llama-server.exe'
                  || lowerName.endsWith('.dylib')
                  || lowerName.endsWith('.so');
              });
          })
        : [];

      if (runtimeArtifacts.length === 0) {
        throw new Error('[postPackage] Bundled llama runtime artifacts were not found in app package');
      }

      const runtimeDynamicLibraries = runtimeArtifacts.filter((artifactPath) => {
        const lowerName = path.basename(artifactPath).toLowerCase();
        return lowerName.endsWith('.dylib') || lowerName.endsWith('.so');
      });
      if (runtimeDynamicLibraries.length === 0) {
        throw new Error('[postPackage] Bundled llama runtime dynamic libraries were not found in app package');
      }

      if (isMAS && options.platform === 'mas') {
        console.log('[postPackage] Re-signing helper apps and bundled runtime for MAS...');
        const identity = process.env.SIGNING_IDENTITY_APPSTORE || 'Apple Distribution';
        const childEntitlements = path.resolve('entitlements.child.plist');
        const mainEntitlements = path.resolve('entitlements.mas.plist');
        const teamId = process.env.APPLE_TEAM_ID || '';
        const bundleId = (_config as any).packagerConfig.appBundleId || 'com.grabtaxi.klever';

        console.log(`[postPackage] App bundle: ${appPath}`);
        console.log(`[postPackage] Frameworks path: ${frameworksPath}`);

        if (!fs.existsSync(frameworksPath)) {
          console.log('[postPackage] No Frameworks directory found, skipping helper re-signing');
        } else {
          // Find all helper apps
          const frameworkItems = fs.readdirSync(frameworksPath);
          const helperApps = frameworkItems.filter(item => item.endsWith('.app'));

          console.log(`[postPackage] Found ${helperApps.length} helper apps to re-sign`);

          for (const helperApp of helperApps) {
            const helperPath = path.join(frameworksPath, helperApp);
            console.log(`[postPackage] Re-signing helper: ${helperApp}`);

            try {
              // Re-sign the helper app with child entitlements (inherit only)
              execSync(
                `codesign --force --sign "${identity}" --entitlements "${childEntitlements}" --timestamp=none "${helperPath}"`,
                { stdio: 'inherit' }
              );
              console.log(`[postPackage] ✅ Successfully re-signed: ${helperApp}`);
            } catch (error) {
              console.error(`[postPackage] ❌ Failed to re-sign ${helperApp}:`, error);
              throw error;
            }
          }
        }

        for (const runtimeBinaryPath of runtimeArtifacts) {
          console.log(`[postPackage] Re-signing bundled runtime artifact: ${runtimeBinaryPath}`);
          execSync(
            `codesign --force --sign "${identity}" --entitlements "${childEntitlements}" --timestamp=none "${runtimeBinaryPath}"`,
            { stdio: 'inherit' }
          );
        }

        // Re-sign the main app to update the seal after helper/runtime modifications
        console.log('[postPackage] Re-signing main app to update seal...');
        try {
          // Create enhanced entitlements with application identifier for TestFlight
          const mainEntitlementsContent = fs.readFileSync(mainEntitlements, 'utf8');
          const enhancedEntitlements = mainEntitlementsContent.replace(
            '</dict>',
            `    <!-- Required for TestFlight distribution -->
    <key>com.apple.application-identifier</key>
    <string>${teamId}.${bundleId}</string>
    <key>com.apple.developer.team-identifier</key>
    <string>${teamId}</string>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${teamId}.${bundleId}</string>
    </array>
</dict>`
          );

          const tempEntitlements = path.join(outputDir, 'temp-entitlements.plist');
          fs.writeFileSync(tempEntitlements, enhancedEntitlements);

          execSync(
            `codesign --force --sign "${identity}" --entitlements "${tempEntitlements}" --timestamp=none "${appPath}"`,
            { stdio: 'inherit' }
          );

          // Clean up temp file
          fs.unlinkSync(tempEntitlements);

          console.log('[postPackage] ✅ Successfully re-signed main app');
        } catch (error) {
          console.error('[postPackage] ❌ Failed to re-sign main app:', error);
          throw error;
        }
      }

      for (const runtimeBinaryPath of runtimeArtifacts) {
        console.log(`[postPackage] Verifying bundled runtime signature: ${runtimeBinaryPath}`);
        execSync(`codesign --verify --verbose=2 "${runtimeBinaryPath}"`, { stdio: 'inherit' });
      }

      console.log('[postPackage] Bundled runtime verification complete');
    },
  },
  makers: [
    // macOS: DMG (primary) and ZIP (backup/CI) for Developer ID distribution
    new MakerDMG({
      format: 'UDZO',
      icon: './public/icon.icns', // DMG volume icon (prevents Electron default icon confusion)
      name: 'TalkToFigmaDesktop', // Volume name without spaces to avoid hdiutil issues
    }, ['darwin']),
    new MakerZIP({}, ['darwin']),
    // macOS: PKG for Mac App Store distribution
    new MakerPKG({
      identity: process.env.INSTALLER_IDENTITY || '3rd Party Mac Developer Installer',
    }, ['mas']),
    // Windows: Squirrel for traditional distribution with auto-update
    new MakerSquirrel({
      setupIcon: './public/icon.ico',
      iconUrl: 'https://raw.githubusercontent.com/grab/TalkToFigmaDesktop/main/public/icon.ico',
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
