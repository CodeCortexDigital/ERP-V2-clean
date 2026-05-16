import api from '@/services/api';

export type FeatureName =
  | 'whatsapp_integration'
  | 'online_payments'
  | 'ai_insights'
  | 'realtime_notifications'
  | 'advanced_analytics';

export interface FeatureFlagRecord {
  id: number;
  name: string;
  is_enabled: boolean;
  tenant: string | null;
  tenant_code: string | null;
  tenant_name: string | null;
  scope: string;
  rollout_percentage: number;
  description: string;
  updated_at: string;
}

export interface FeatureFlagsResponse {
  flags: Record<string, boolean>;
}

export interface FeatureFlagAdminResponse {
  flags: FeatureFlagRecord[];
  tenants: { id: string; name: string; tenant_code: string; school_id: string }[];
}

const featureService = {
  getAvailability: () => api.get<FeatureFlagsResponse>('/v1/features/'),

  adminList: (tenantId?: string) =>
    api.get<FeatureFlagAdminResponse>('/v1/features/admin/list/', {
      params: tenantId ? { tenant_id: tenantId } : undefined,
    }),

  update: (id: number, payload: Partial<Pick<FeatureFlagRecord, 'is_enabled' | 'rollout_percentage' | 'description'>>) =>
    api.patch<FeatureFlagRecord>(`/v1/features/admin/${id}/`, payload),

  upsert: (payload: {
    name: string;
    is_enabled?: boolean;
    rollout_percentage?: number;
    description?: string;
    tenant_id?: string | null;
  }) => api.post<FeatureFlagRecord>('/v1/features/admin/upsert/', payload),
};

export default featureService;
