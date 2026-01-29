import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // Mark optional ws dependencies as external
      external: ['bufferutil', 'utf-8-validate'],
      output: {
        format: 'cjs',
        entryFileNames: 'mcp-stdio-server.cjs',
      },
    },
  },
});
