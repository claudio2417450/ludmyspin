import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:3000', ws: true, changeOrigin: true },
      '/auth':        { target: 'http://localhost:3000', changeOrigin: true },
      '/wallet':      { target: 'http://localhost:3000', changeOrigin: true },
      '/slots':       { target: 'http://localhost:3000', changeOrigin: true },
      '/fairness':    { target: 'http://localhost:3000', changeOrigin: true },
      '/history':     { target: 'http://localhost:3000', changeOrigin: true },
      '/withdrawals': { target: 'http://localhost:3000', changeOrigin: true },
      '/admin':       { target: 'http://localhost:3000', changeOrigin: true },
      '/owner':       { target: 'http://localhost:3000', changeOrigin: true },
      '/jackpots':    { target: 'http://localhost:3000', changeOrigin: true },
      '/health':      { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
