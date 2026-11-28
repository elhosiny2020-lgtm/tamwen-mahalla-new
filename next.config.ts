import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const isProd = process.env.NODE_ENV === 'production';

// Baseline trusted origins required for AI Studio preview iframes and Cloud Run deployments.
const DEFAULT_FRAME_ANCESTORS = [
  "'self'",
  'https://aistudio.google.com',
  'https://*.aistudio.google.com',
  'https://*.google.com',
  'https://*.googleusercontent.com',
  'https://*.usercontent.goog',
  'https://*.run.app',
  'https://*.web.app',
  'https://*.firebaseapp.com',
];

const VALID_CSP_ORIGIN_RE =
  /^(?:'self'|https?:|https?:\/\/(?:\*\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?::\d{1,5})?)$/;

/**
 * Validates and merges optional FRAME_ANCESTORS env values with trusted defaults.
 * Prevents malformed or misconfigured environment variables from breaking iframe framing
 * (which causes browser "refused to connect" errors) or injecting invalid CSP tokens.
 */
function buildFrameAncestors(rawEnv?: string): string {
  const allowed = new Set<string>(DEFAULT_FRAME_ANCESTORS);

  if (rawEnv) {
    const tokens = rawEnv
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      if (VALID_CSP_ORIGIN_RE.test(token)) {
        allowed.add(token);
      }
    }
  }

  return Array.from(allowed).join(' ');
}

const frameAncestors = buildFrameAncestors(process.env.FRAME_ANCESTORS);

const csp = [
  "default-src 'self' https://*.run.app https://*.google.com",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https: https://fonts.gstatic.com",
  `connect-src 'self' https://*.run.app https://*.google.com https://*.supabase.co wss://*.supabase.co${
    isProd ? '' : ' ws: wss: http://localhost:* http://127.0.0.1:*'
  }`,
  "frame-src 'self' https://*.run.app https://*.google.com",
  `frame-ancestors ${frameAncestors}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

export default function nextConfig(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    // Isolate next dev output from next build / next start (.next) so live dev requests
    // never overwrite or corrupt production build artifacts during publishing.
    distDir: isDevServer ? '.next-dev' : '.next',
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    productionBrowserSourceMaps: false,
    images: {
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 86400,
    },
    httpAgentOptions: {
      keepAlive: true,
    },
    allowedDevOrigins: [
      '*.run.app',
      '*.aistudio.google.com',
      '*.googleusercontent.com',
      '*.usercontent.goog',
      'localhost',
      '127.0.0.1',
    ],
    experimental: {
      webpackBuildWorker: true,
      optimizePackageImports: ['lucide-react', 'd3', 'motion'],
      serverActions: {
        allowedOrigins: [
          '*.run.app',
          '*.aistudio.google.com',
          '*.googleusercontent.com',
          '*.usercontent.goog',
          'localhost:3000',
        ],
      },
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    async headers() {
      return [
        { source: '/(.*)', headers: securityHeaders },
        {
          source: '/_next/static/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
        {
          source: '/assets/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
        },
        {
          source: '/api/(.*)',
          headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
        },
      ];
    },
    webpack: (config, { dev }) => {
      // Avoid writing ~300 MB of single-use webpack filesystem cache during production Publish builds
      if (!dev) {
        config.cache = false;
      }
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      if (dev && process.env.DISABLE_HMR === 'true') {
        config.watchOptions = { ignored: /.*/ };
      } else if (dev) {
        config.watchOptions = {
          ...config.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.next/**',
            '**/.next-dev/**',
            '**/data/**',
            '**/public/assets/**',
          ],
        };
      }
      return config;
    },
  };
}
