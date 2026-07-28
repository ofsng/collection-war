import type { Metadata } from 'next';
import '@collection-war/design-system/styles.css';
import { publicConfig } from '../lib/config';
import { Providers } from '../components/providers';

/**
 * Admin root layout.
 *
 * `noindex, nofollow` is set here as well as in the response headers. Belt and braces:
 * headers can be stripped by a misconfigured proxy, and an indexed admin console is a
 * standing invitation.
 */
export const metadata: Metadata = {
  title: 'Collection War — Administration',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang={publicConfig.defaultLocale}>
      <body>
        <a className="cw-skip-link" href="#main">
          Skip to content
        </a>
        <Providers initialLocale={publicConfig.defaultLocale}>{children}</Providers>
      </body>
    </html>
  );
}
