import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: false,
  publicExcludes: ['!noprecache/**/*', '!brand/*.glb'],
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: false,
    runtimeCaching: [{
      urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
      options: { cacheName: 'apis' },
    }, {
      urlPattern: ({ sameOrigin, url, request }) => sameOrigin && /^\/dashboard\/campo\/(pesaje|clasificacion|pendientes)$/.test(url.pathname) && request.headers.get('RSC') !== '1',
      handler: 'NetworkFirst',
      options: { cacheName: 'jirah-campo-pages-v1', networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 16, maxAgeSeconds: 8 * 24 * 60 * 60 } },
    }, {
      urlPattern: ({ sameOrigin, url, request }) => sameOrigin && /^\/dashboard\/campo\/(pesaje|clasificacion|pendientes)$/.test(url.pathname) && request.headers.get('RSC') === '1',
      handler: 'NetworkFirst',
      options: { cacheName: 'jirah-campo-rsc-v1', cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 96, maxAgeSeconds: 8 * 24 * 60 * 60 } },
    }, {
      urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
      handler: 'CacheFirst',
      options: { cacheName: 'jirah-campo-assets-v1', cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 192, maxAgeSeconds: 8 * 24 * 60 * 60 } },
    }, {
      // Las pantallas de cuenta y aprobación nunca se reutilizan desde una caché de otra sesión.
      urlPattern: ({ sameOrigin, url }) => sameOrigin && /^\/(bienvenida|verificar|registro)(\/|$)/.test(url.pathname),
      handler: 'NetworkOnly',
    }],
  },
});

const nextConfig: NextConfig = {
  // Turbopack (Next.js 16 default bundler)
  turbopack: {},
  experimental: { proxyClientMaxBodySize: '4mb' },
  webpack(config, { dev }) {
    // En Windows, reutilizar la caché de disco falla en WasmHash al recompilar.
    // La caché en memoria evita esa lectura; no afecta a las cachés de la PWA.
    if (!dev && process.platform === 'win32') config.cache = { type: 'memory' };
    return config;
  },
  // Imágenes externas permitidas
  images: {
    remotePatterns: [],
  },
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          ...(process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https:')
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
      {
        source: '/recuperar/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

export default withPWA(nextConfig);
