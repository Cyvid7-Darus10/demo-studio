import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'out', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
  server: { fs: { allow: ['..'] } },
});
