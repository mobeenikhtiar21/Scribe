import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4002,
    proxy: {
      '/api': 'http://localhost:4001',
      '/auth': 'http://localhost:4001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
