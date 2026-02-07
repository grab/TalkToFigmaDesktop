import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Load .env file at build time (for npm run make)
// In development, direnv loads .envrc which takes precedence
// In CI/CD, GitLab CI exports variables which take precedence
// dotenv will never modify any environment variables that have already been set
dotenv.config();

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Inject analytics environment variables at build time
    // These will be replaced with literal values in the bundled code
    '__GOOGLE_ANALYTICS_ID__': JSON.stringify(process.env.GOOGLE_ANALYTICS_ID || ''),
    '__GOOGLE_ANALYTICS_API_SECRET__': JSON.stringify(process.env.GOOGLE_ANALYTICS_API_SECRET || ''),
  },
});
