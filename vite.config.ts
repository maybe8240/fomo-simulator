import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the previous Vite 5 compilation target during the security upgrade.
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },
  server: {
    proxy: {
      '/api/game': {
        target: 'http://127.0.0.1:3001',
      },
    },
  },
});
