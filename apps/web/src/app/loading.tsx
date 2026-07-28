/**
 * Route-level loading state.
 *
 * `role="status"` with `aria-live="polite"` announces the change to a screen reader
 * without interrupting whatever it is currently reading. A silent spinner tells a
 * non-sighted user nothing at all.
 *
 * The text is a literal because this renders before any provider, including the locale
 * provider, has mounted.
 */
export default function Loading() {
  return (
    <main id="main" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <p role="status" aria-live="polite" style={{ color: '#9aa5b1' }}>
        Loading…
      </p>
    </main>
  );
}
