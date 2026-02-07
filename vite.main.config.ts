import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env file at build time (for npm run make)
// In development, variables may be pre-set by shell which take precedence
// In CI/CD, GitLab CI exports variables which take precedence
// dotenv will never modify any environment variables that have already been set
dotenv.config();

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Inject environment variables at build time for production builds
    // These will be replaced with literal values in the bundled code
    '__FIGMA_CLIENT_ID__': JSON.stringify(process.env.FIGMA_CLIENT_ID || ''),
    '__FIGMA_CLIENT_SECRET__': JSON.stringify(process.env.FIGMA_CLIENT_SECRET || ''),
    '__GOOGLE_ANALYTICS_ID__': JSON.stringify(process.env.GOOGLE_ANALYTICS_ID || ''),
    '__GOOGLE_ANALYTICS_API_SECRET__': JSON.stringify(process.env.GOOGLE_ANALYTICS_API_SECRET || ''),
  },
  build: {
    rollupOptions: {
      // Mark optional ws dependencies as external
      external: ['bufferutil', 'utf-8-validate'],
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
});
