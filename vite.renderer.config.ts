import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

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
