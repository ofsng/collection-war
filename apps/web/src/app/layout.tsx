import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { LOCALE_STORAGE_KEY, resolveLocale } from '@collection-war/localization';
import '@collection-war/design-system/styles.css';
import { Providers } from '../components/providers';

/**
 * Every route under this layout is rendered per request.
 *
 * The layout reads `cookies()` and `headers()` to resolve the player's locale before the
 * first paint, which is inherently request-specific. Declaring it explicitly stops Next
 * from attempting to prerender routes (including its built-in `/_not-found`) that cannot
 * be static, and makes the trade-off visible rather than implicit.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Collection War',
  description: 'Collection War — development platform shell.',
  robots: { index: false, follow: false },
};

/**
 * Root layout.
 *
 * The locale is resolved ON THE SERVER, from the cookie first and the `Accept-Language`
 * header second, so `<html lang>` and the first paint are already correct. Resolving it
 * only on the client would render Turkish text into an `lang="en"` document and then
 * visibly swap it after hydration — bad for screen readers and bad to look at.
 */
export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const locale = resolveLocale(
    cookieStore.get(LOCALE_STORAGE_KEY)?.value,
    headerStore.get('accept-language'),
  );

  return (
    <html lang={locale}>
      <body>
        {/* The first tab stop on every page. Visible only when focused. */}
        <a className="cw-skip-link" href="#main">
          Skip to content
        </a>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
