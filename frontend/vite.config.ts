import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mjs', '.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': src,
      '@types': `${src}/types`,
      '@contexts': `${src}/contexts`,
      '@hooks': `${src}/hooks`,
      '@services': `${src}/services`,
      '@utils': `${src}/utils`,
      '@components': `${src}/components`,
      '@pages': `${src}/pages`,
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    // CommonJS package with a nested default export.
    needsInterop: ['react-use-websocket'],
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    target: 'es2022',
    // The PDF exporter is intentionally a large, on-demand chunk.
    chunkSizeWarningLimit: 1000,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react';
          }
          if (id.includes('node_modules/@tanstack/')) return 'data';
          if (
            id.includes('node_modules/framer-motion/') ||
            id.includes('node_modules/motion-dom/') ||
            id.includes('node_modules/motion-utils/')
          ) {
            return 'motion';
          }
          if (id.includes('node_modules/lucide-react/')) return 'icons';
        },
      },
    },
  },
});
