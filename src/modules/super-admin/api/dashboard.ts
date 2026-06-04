import { apiClient } from '@/shared/api/client';

import type { DashboardResponse } from '@/modules/super-admin/types/dashboard';

export async function getDashboard(): Promise<DashboardResponse> {
    const res = await apiClient.get<DashboardResponse>('/super-admin/dashboard');
    return res.data;
}
