import { apiClient } from '@/shared/api/client';
import type {
    AuthMeResponse,
    LoginRequest,
    LoginResponse,
} from '@/modules/auth/types';

// ─────────────────────────────────────────────────────────────────────────────
// Auth API — typed wrappers over apiClient.
//
// Endpoints mirror backend/docs/api/v1/auth.md:
//   POST /api/v1/auth/login    → LoginResponse
//   GET  /api/v1/auth/me       → AuthMeResponse
//   POST /api/v1/auth/logout   → 204 No Content
//
// All requests rely on the shared apiClient's withCredentials + withXSRFToken
// for Sanctum cookie auth. The CSRF cookie is fetched lazily by the request
// interceptor before any mutation. See src/shared/api/client.ts.
// ─────────────────────────────────────────────────────────────────────────────

export async function login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', payload);
    return res.data;
}

export async function me(): Promise<AuthMeResponse> {
    const res = await apiClient.get<AuthMeResponse>('/auth/me');
    return res.data;
}

export async function logout(): Promise<void> {
    await apiClient.post('/auth/logout');
}
