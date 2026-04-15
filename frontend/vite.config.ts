import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [react()];

  if (mode !== 'development') {
    const { VitePWA } = await import('vite-plugin-pwa');
    plugins.push(VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tripo',
        short_name: 'Tripo',
        description: 'Discover micro-escapes in Saudi Arabia',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/(places|itineraries)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 3600,
              },
            },
          },
        ],
      },
    }));
  }

  return {
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000', // 👈 التعديل هنا: استخدم IP بدلاً من localhost
          changeOrigin: true,
          secure: false,
        },

      },
      watch: {
        usePolling: true,
        interval: 500,
      },
    },
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});