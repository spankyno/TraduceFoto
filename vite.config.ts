import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// ---------------------------------------------------------------------------
// Content-Security-Policy de la app (solo en `vite build`; en dev rompería HMR).
// Va como <meta> y no como cabecera para no mezclarse con la CSP propia de
// /analytics-frame.html (ver comentario en public/_headers).
//   - script-src 'self'  -> bloquea cualquier script inline o de terceros en el
//                           origen de la app (el tracker vive en un iframe sandbox).
//   - connect-src 'self' -> la app solo puede hablar con su propio /api.
//   - style-src 'unsafe-inline' hace falta para los atributos style de React/Tailwind.
// ---------------------------------------------------------------------------
const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function injectCsp(): Plugin {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: {'http-equiv': 'Content-Security-Policy', content: APP_CSP},
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      injectCsp(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'FotoTraductor - Cámara y Traducción',
          short_name: 'FotoTraductor',
          description: 'Traduce texto de fotos al instante. Apunta la cámara a menús, carteles o documentos y obtén la traducción automática con OCR y Gemini.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // La página de analítica no debe precachearse ni recibir el fallback SPA
          globIgnores: ['analytics-frame.html'],
          navigateFallbackDenylist: [/^\/api\//, /^\/analytics-frame\.html$/],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
