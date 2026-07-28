import { publicNextEnv } from '../../scripts/load-root-env.mjs';

/**
 * Next.js configuration for the Collection War administration application.
 *
 * Stricter than the player-facing web application, because this one will eventually hold
 * privileged operations:
 *   - `X-Frame-Options: DENY` and `frame-ancestors 'none'` — an admin console must never
 *     be embeddable, or a clickjacking page can drive it with an administrator's session.
 *   - `noindex` and `Cache-Control: no-store` — no admin page should be indexed or cached.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: publicNextEnv(),
  typescript: { ignoreBuildErrors: false },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
