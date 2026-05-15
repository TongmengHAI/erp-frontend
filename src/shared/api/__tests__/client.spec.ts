import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { apiClient, __testing } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// apiClient interceptor specs.
//
// We swap apiClient's `adapter` for the test: every request goes through our
// hand-rolled router that matches on `${method} ${url}` (and respects the
// per-request `baseURL` override the CSRF call uses). The interceptor stack
// runs unchanged, so CSRF prefetch + 419 retry are exercised end-to-end.
// ─────────────────────────────────────────────────────────────────────────────

interface MockResponse {
    status: number;
    data?: unknown;
}

interface RecordedCall {
    method: string;
    url: string;
}

function buildAdapter(routes: Map<string, () => MockResponse>): {
    adapter: AxiosAdapter;
    history: RecordedCall[];
} {
    const history: RecordedCall[] = [];
    const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
        const method = (config.method ?? 'get').toLowerCase();
        // Build the "matched" key. The CSRF call uses baseURL='/' to bypass
        // the /api/v1 prefix; we match on the bare URL so '/sanctum/...'
        // works identically to '/auth/...'.
        const url = config.url ?? '';
        const key = `${method} ${url}`;
        history.push({ method, url });

        const handler = routes.get(key);
        if (!handler) {
            return Promise.reject(
                Object.assign(new Error(`No mock handler for ${key}`), {
                    isAxiosError: true,
                    config,
                    response: undefined,
                }),
            );
        }
        const { status, data } = handler();
        const response: AxiosResponse = {
            status,
            statusText: '',
            data,
            headers: {},
            config,
            request: {},
        };
        if (status >= 200 && status < 300) {
            return Promise.resolve(response);
        }
        return Promise.reject(
            Object.assign(new Error(`HTTP ${status}`), {
                isAxiosError: true,
                config,
                response,
            }),
        );
    };
    return { adapter, history };
}

describe('apiClient interceptors', () => {
    let originalAdapter: AxiosAdapter | undefined;

    beforeEach(() => {
        originalAdapter = apiClient.defaults.adapter as AxiosAdapter | undefined;
        __testing.resetCsrfReady();
    });

    afterEach(() => {
        apiClient.defaults.adapter = originalAdapter;
    });

    it('fetches /sanctum/csrf-cookie before the first POST', async () => {
        const { adapter, history } = buildAdapter(
            new Map([
                ['get /sanctum/csrf-cookie', () => ({ status: 204 })],
                ['post /auth/login', () => ({ status: 200, data: { data: {} } })],
            ]),
        );
        apiClient.defaults.adapter = adapter;

        await apiClient.post('/auth/login', { email: 'a', password: 'b' });

        const calls = history.map((c) => `${c.method} ${c.url}`);
        const csrfIdx = calls.indexOf('get /sanctum/csrf-cookie');
        const loginIdx = calls.indexOf('post /auth/login');
        expect(csrfIdx).toBeGreaterThanOrEqual(0);
        expect(loginIdx).toBeGreaterThan(csrfIdx);
        expect(__testing.isCsrfReady()).toBe(true);
    });

    it('does NOT prefetch CSRF before a plain GET', async () => {
        const { adapter, history } = buildAdapter(
            new Map([['get /auth/me', () => ({ status: 200, data: { data: {} } })]]),
        );
        apiClient.defaults.adapter = adapter;

        await apiClient.get('/auth/me');

        expect(history.some((c) => c.url === '/sanctum/csrf-cookie')).toBe(false);
        expect(__testing.isCsrfReady()).toBe(false);
    });

    it('does not re-fetch CSRF on a second mutation in the same session', async () => {
        let csrfCount = 0;
        const { adapter, history } = buildAdapter(
            new Map([
                ['get /sanctum/csrf-cookie', () => {
                    csrfCount += 1;
                    return { status: 204 };
                }],
                ['post /foo', () => ({ status: 200, data: {} })],
                ['post /bar', () => ({ status: 200, data: {} })],
            ]),
        );
        apiClient.defaults.adapter = adapter;

        await apiClient.post('/foo');
        await apiClient.post('/bar');

        expect(csrfCount).toBe(1);
        expect(history.filter((c) => c.url === '/sanctum/csrf-cookie')).toHaveLength(1);
    });

    it('on 419, refreshes CSRF and retries the original request exactly once', async () => {
        let postCount = 0;
        let csrfCount = 0;
        const { adapter, history } = buildAdapter(
            new Map([
                ['get /sanctum/csrf-cookie', () => {
                    csrfCount += 1;
                    return { status: 204 };
                }],
                ['post /auth/login', () => {
                    postCount += 1;
                    return postCount === 1
                        ? { status: 419, data: { message: 'CSRF mismatch' } }
                        : { status: 200, data: { data: {} } };
                }],
            ]),
        );
        apiClient.defaults.adapter = adapter;

        const res = await apiClient.post('/auth/login', {});
        expect(res.status).toBe(200);
        expect(postCount).toBe(2);
        // Two CSRF fetches: initial prefetch + post-419 refresh.
        expect(csrfCount).toBe(2);
        expect(history.length).toBeGreaterThanOrEqual(4);
    });

    it('does NOT retry on a second consecutive 419 (no infinite loop)', async () => {
        let postCount = 0;
        const { adapter } = buildAdapter(
            new Map([
                ['get /sanctum/csrf-cookie', () => ({ status: 204 })],
                ['post /auth/login', () => {
                    postCount += 1;
                    return { status: 419, data: { message: 'still mismatched' } };
                }],
            ]),
        );
        apiClient.defaults.adapter = adapter;

        await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({
            response: { status: 419 },
        });
        // Exactly 2 POSTs: initial + one retry. NOT three.
        expect(postCount).toBe(2);
    });
});
