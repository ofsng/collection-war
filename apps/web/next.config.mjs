import { publicNextEnv } from '../../scripts/load-root-env.mjs';

/**
 * Next.js configuration for the Collection War web application.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,

  // The version banner is free reconnaissance. Removing it costs nothing.
  poweredByHeader: false,

  /**
   * Public configuration, read from the single repository-root `.env`.
   *
   * An explicit allow-list — see scripts/load-root-env.mjs for why these are not spread
   * from `process.env`.
   */
  env: publicNextEnv(),

  typescript: {
    // `pnpm typecheck` is the repository-wide gate. This does NOT skip type errors; it
    // keeps `next build` honest about them too.
    ignoreBuildErrors: false,
  },

  /**
   * Security headers for the document responses Next serves.
   *
   * The API sets its own; these cover the pages. A CSP is deliberately NOT set here yet:
   * a CSP written before the application has any real assets is either so permissive it
   * does nothing, or so strict it breaks the first feature that adds an image. It is
   * tracked as required work in docs/status/DEFERRED_WORK.md rather than faked here.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
