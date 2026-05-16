import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import featureService, { type FeatureFlagRecord } from '@/services/feature.service';
import { queryKeys } from '@/lib/queryKeys';
import { handleQueryError } from '@/lib/queryClient';

const FEATURE_LABELS: Record<string, string> = {
  whatsapp_integration: 'WhatsApp Integration',
  online_payments: 'Online Payments',
  ai_insights: 'AI Insights',
  realtime_notifications: 'Realtime Notifications',
  advanced_analytics: 'Advanced Analytics',
};

export default function FeatureFlagsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.features.admin(selectedTenantId || 'all'),
    queryFn: async () => {
      const { data: res } = await featureService.adminList(selectedTenantId || undefined);
      return res;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof featureService.update>[1] }) =>
      featureService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
      queryClient.invalidateQueries({ queryKey: ['features', 'admin'] });
      toast.success('Feature flag updated');
    },
    onError: (err) => toast.error(handleQueryError(err)),
  });

  const upsertMutation = useMutation({
    mutationFn: featureService.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
      queryClient.invalidateQueries({ queryKey: ['features', 'admin'] });
      toast.success('Tenant override saved');
    },
    onError: (err) => toast.error(handleQueryError(err)),
  });

  const globalFlags = useMemo(
    () => (data?.flags ?? []).filter((f) => !f.tenant),
    [data?.flags],
  );

  const tenantOverrides = useMemo(
    () =>
      (data?.flags ?? []).filter(
        (f) => f.tenant && (!selectedTenantId || f.tenant === selectedTenantId),
      ),
    [data?.flags, selectedTenantId],
  );

  const handleGlobalToggle = (flag: FeatureFlagRecord, checked: boolean) => {
    updateMutation.mutate({ id: flag.id, payload: { is_enabled: checked } });
  };

  const handleRolloutChange = (flag: FeatureFlagRecord, value: number) => {
    updateMutation.mutate({ id: flag.id, payload: { rollout_percentage: value } });
  };

  const handleTenantOverride = (name: string, checked: boolean) => {
    if (!selectedTenantId) {
      toast.error('Select a tenant first');
      return;
    }
    upsertMutation.mutate({
      name,
      tenant_id: selectedTenantId,
      is_enabled: checked,
      rollout_percentage: checked ? 100 : 0,
    });
  };

  const effectiveForTenant = (name: string): boolean | null => {
    const override = tenantOverrides.find((f) => f.name === name);
    if (override) return override.is_enabled;
    const global = globalFlags.find((f) => f.name === name);
    return global ? global.is_enabled : null;
  };

  if (isLoading) {
    return <p className="text-gray-500">Loading feature flags…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Feature Flags
        </h2>
        <p className="text-sm text-gray-500">
          Toggle features globally or override per school tenant for safe rollout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global defaults</CardTitle>
          <CardDescription>Applied to all tenants unless overridden below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {globalFlags.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              label={FEATURE_LABELS[flag.name] ?? flag.name}
              onToggle={(checked) => handleGlobalToggle(flag, checked)}
              onRollout={(pct) => handleRolloutChange(flag, pct)}
              disabled={updateMutation.isPending}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-tenant override</CardTitle>
          <CardDescription>
            Select a school to enable or disable features for that tenant only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full max-w-md h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Select tenant —</option>
              {(data?.tenants ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tenant_code} — {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTenantId ? (
            <div className="space-y-4">
              {globalFlags.map((flag) => {
                const override = tenantOverrides.find((f) => f.name === flag.name);
                const effective = effectiveForTenant(flag.name);
                return (
                  <div
                    key={flag.name}
                    className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {FEATURE_LABELS[flag.name] ?? flag.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Global: {flag.is_enabled ? 'on' : 'off'}
                        {effective !== null && (
                          <>
                            {' '}
                            · Effective: {effective ? 'on' : 'off'}
                            {override ? ' (override)' : ''}
                          </>
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={override?.is_enabled ?? false}
                      onCheckedChange={(checked) => handleTenantOverride(flag.name, checked)}
                      disabled={upsertMutation.isPending}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Choose a tenant to manage overrides.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FlagRow({
  flag,
  label,
  onToggle,
  onRollout,
  disabled,
}: {
  flag: FeatureFlagRecord;
  label: string;
  onToggle: (checked: boolean) => void;
  onRollout: (pct: number) => void;
  disabled?: boolean;
}) {
  const [rollout, setRollout] = useState(String(flag.rollout_percentage));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 font-mono">{flag.name}</p>
        {flag.description ? (
          <p className="text-sm text-gray-500 mt-1">{flag.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Rollout %</label>
          <Input
            type="number"
            min={0}
            max={100}
            className="w-20 h-9"
            value={rollout}
            onChange={(e) => setRollout(e.target.value)}
            onBlur={() => {
              const n = Math.min(100, Math.max(0, parseInt(rollout, 10) || 0));
              setRollout(String(n));
              if (n !== flag.rollout_percentage) onRollout(n);
            }}
          />
        </div>
        <Switch checked={flag.is_enabled} onCheckedChange={onToggle} disabled={disabled} />
      </div>
    </div>
  );
}
