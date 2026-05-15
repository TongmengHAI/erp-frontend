import axios, {
    type AxiosError,
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Shared API client — Axios instance + Sanctum SPA interceptors.
//
// withCredentials=true:  session cookie travels on every request.
// withXSRFToken=true:    Axios reads XSRF-TOKEN cookie and sets the
//                        X-XSRF-TOKEN header on mutating requests.
//
// Interceptors:
//   Request  — lazy-fetch /sanctum/csrf-cookie before the first POST/PUT/
//              PATCH/DELETE. Read-only sessions never trigger the round-trip.
//   Response — on 419 (CSRF mismatch), refresh the cookie and retry the
//              original request ONCE. A second 419 propagates as a normal
//              error; we do not loop.
//
// 401, 422, 429 pass through unchanged: store/page-level code handles them
// with the context the interceptor doesn't have (current route, active
// form, error_code semantics).
// ─────────────────────────────────────────────────────────────────────────────

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient: AxiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

// Module-scoped state: whether we've fetched the CSRF cookie this session.
let csrfReady = false;

/**
 * Force the next mutation to re-fetch the CSRF cookie. Called by logout,
 * which rolls the token server-side.
 */
export function resetCsrfReady(): void {
    csrfReady = false;
}

/**
 * Test-only: reset the module's csrfReady flag. Production code uses
 * `resetCsrfReady()` for the same purpose; this alias exists so test files
 * can express intent ("I'm setting up for a clean run") without coupling to
 * the logout-semantics naming.
 */
export const __testing = {
    resetCsrfReady: (): void => {
        csrfReady = false;
    },
    isCsrfReady: (): boolean => csrfReady,
};

async function ensureCsrf(): Promise<void> {
    if (csrfReady) return;
    // /sanctum/csrf-cookie is NOT under /api/v1. Override baseURL on this
    // single call so it hits the Sanctum endpoint directly.
    await apiClient.get('/sanctum/csrf-cookie', { baseURL: '/' });
    csrfReady = true;
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase();
    // Skip CSRF prefetch on the CSRF endpoint itself — would be infinite.
    const url = config.url ?? '';
    if (MUTATING_METHODS.has(method) && !url.includes('/sanctum/csrf-cookie')) {
        await ensureCsrf();
    }
    return config;
});

/** Used by the response interceptor to mark a request that's already been retried once. */
interface RetryableConfig extends InternalAxiosRequestConfig {
    __csrfRetried?: boolean;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryableConfig | undefined;
        const status = error.response?.status;

        if (status === 419 && config && !config.__csrfRetried) {
            // CSRF mismatch — server expected a token we didn't have or
            // had a stale one. Refresh and retry exactly once.
            csrfReady = false;
            try {
                await ensureCsrf();
            } catch {
                // If we can't even fetch a fresh cookie, fall through with
                // the original 419. Don't recurse.
                throw error;
            }
            config.__csrfRetried = true;
            return apiClient.request(config);
        }

        // 401 / 422 / 429 / anything else: pass through.
        throw error;
    },
);
