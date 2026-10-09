import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/easter-egg/',
  plugins: [react()],
  worker: { format: 'es' }
});
