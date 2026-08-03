import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isGas = mode === 'gas';

  return {
    plugins: [
      react(), 
      tailwindcss(),
      ...(isGas ? [viteSingleFile()] : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      assetsInlineLimit: isGas ? 100000000 : 4096,
    }
  };
});
