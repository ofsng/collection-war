import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LocaleProvider } from './locale-provider';
import { SystemStatus } from './system-status';

/**
 * These tests exercise the web shell's one real behaviour: reaching the API and rendering
 * the three outcomes a player can actually experience — healthy, degraded, unreachable.
 *
 * `fetch` is stubbed rather than the API client, so the client's own parsing and error
 * mapping are covered too.
 */

function renderWithProviders(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale="en">{node}</LocaleProvider>
    </QueryClientProvider>,
  );
}

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => handler(String(input))),
  );
}

const READY_BODY = {
  status: 'ready',
  timestamp: '2026-07-28T10:00:00.000Z',
  dependencies: {
    database: { status: 'up', latencyMs: 3 },
    redis: { status: 'up', latencyMs: 1 },
  },
};

const INFO_BODY = {
  name: 'collection-war-api',
  apiVersion: 'v1',
  environment: 'local',
  supportedLocales: ['tr-TR', 'en'],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SystemStatus', () => {
  it('shows a checking state before the API answers', () => {
    stubFetch(() => new Promise<Response>(() => undefined));

    renderWithProviders(<SystemStatus />);

    expect(screen.getByText('Checking API…')).toBeInTheDocument();
  });

  it('reports the API healthy and lists dependency status', async () => {
    stubFetch((url) => json(url.includes('/ready') ? READY_BODY : INFO_BODY));

    renderWithProviders(<SystemStatus />);

    await waitFor(() => expect(screen.getByText('API is healthy')).toBeInTheDocument());
    // Two dependencies, both "Available".
    expect(screen.getAllByText('Available')).toHaveLength(2);
  });

  it('reports the API unhealthy when a dependency is down', async () => {
    // This is exactly the state on a machine with no Docker — the state this bootstrap
    // actually ran in — so it must render correctly rather than look like a crash.
    stubFetch((url) =>
      json(
        url.includes('/ready')
          ? {
              ...READY_BODY,
              status: 'degraded',
              dependencies: {
                database: { status: 'down', latencyMs: 2000 },
                redis: { status: 'up', latencyMs: 1 },
              },
            }
          : INFO_BODY,
        url.includes('/ready') ? 503 : 200,
      ),
    );

    renderWithProviders(<SystemStatus />);

    await waitFor(() => expect(screen.getByText('API reported a problem')).toBeInTheDocument());
  });

  it('reports the API unreachable when the network fails, without throwing', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });

    renderWithProviders(<SystemStatus />);

    await waitFor(() => expect(screen.getByText('Cannot reach the API')).toBeInTheDocument());
  });

  it('offers a retry action', async () => {
    stubFetch((url) => json(url.includes('/ready') ? READY_BODY : INFO_BODY));

    renderWithProviders(<SystemStatus />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled());
  });

  it('shows the configured API endpoint so a misconfiguration is visible', async () => {
    stubFetch((url) => json(url.includes('/ready') ? READY_BODY : INFO_BODY));

    renderWithProviders(<SystemStatus />);

    await waitFor(() => expect(screen.getByText('http://localhost:4000')).toBeInTheDocument());
  });
});
