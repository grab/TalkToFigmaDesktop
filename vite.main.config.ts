import { defineConfig } from 'vite';
import path from 'node:path';
import { builtinModules } from 'node:module';

// Load .env file at build time (for npm run make)
// In development, variables may be pre-set by shell which take precedence
// In CI/CD, GitHub Actions/GitLab CI exports variables which take precedence
// Safe import: only load dotenv if available (may not be in CI)
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch {
  // dotenv not available (CI environment) - environment variables already set
  console.log('dotenv not available, using existing environment variables');
}

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Node.js environment settings (from KleverDesktop)
    // Some libraries that can run in both Web and Node.js environments require this
    browserField: false,
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  define: {
    // Inject environment variables at build time for production builds
    // These will be replaced with literal values in the bundled code
    '__FIGMA_CLIENT_ID__': JSON.stringify(process.env.FIGMA_CLIENT_ID || ''),
    '__FIGMA_CLIENT_SECRET__': JSON.stringify(process.env.FIGMA_CLIENT_SECRET || ''),
    '__GOOGLE_ANALYTICS_ID__': JSON.stringify(process.env.GOOGLE_ANALYTICS_ID || ''),
    '__GOOGLE_ANALYTICS_API_SECRET__': JSON.stringify(process.env.GOOGLE_ANALYTICS_API_SECRET || ''),
    // Distribution channel for analytics (app_store, direct, or development)
    '__DISTRIBUTION_CHANNEL__': JSON.stringify(process.env.DISTRIBUTION_CHANNEL || 'development'),
  },
  build: {
    rollupOptions: {
      // Mark electron and all Node.js built-in modules as external
      // These are available at runtime in Electron environment
      external: [
        'electron',
        ...builtinModules,
        // Optional native dependencies
        'bufferutil',
        'utf-8-validate',
      ],
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
});
