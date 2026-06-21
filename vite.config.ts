import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // Pre-bundle React + router so the first lazy-route load after a dev-server
      // restart doesn't transiently throw "Invalid hook call" while Vite re-optimizes.
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react-router-dom', 'react-helmet-async'],
      },
      plugins: [tailwindcss(), react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Admin API module is ~thousands of LOC and only needed on /admin/* routes.
              // Isolating it keeps it out of the public-page bundle.
              if (id.includes('/services/api/admin.api')) {return 'chunk-api-admin';}
              if (id.includes('/services/api/checkout.api')) {return 'chunk-api-checkout';}

              // Vendor chunks
              if (id.includes('node_modules/react-router') ||
                  id.includes('node_modules/react/') ||
                  id.includes('node_modules/react-dom/') ||
                  id.includes('node_modules/scheduler/')) {return 'vendor-react';}
              if (id.includes('node_modules/@supabase')) {return 'vendor-supabase';}
              if (id.includes('node_modules/recharts') ||
                  id.includes('node_modules/d3-')) {return 'vendor-recharts';}
              if (id.includes('node_modules/hls.js')) {return 'vendor-hls';}
              if (id.includes('node_modules/lucide-react')) {return 'vendor-icons';}
              return undefined;
            },
          },
        },
      },
    };
});
