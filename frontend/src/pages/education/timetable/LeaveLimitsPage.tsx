import { useState, useEffect, useMemo } from 'react';
import { SlidersHorizontal, Save, RefreshCw, Search, ShieldAlert, Users2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import teacherService from '@/services/teacher.service';

const LEAVE_TYPES = [
  { key: 'sick', label: 'Sick' },
  { key: 'casual', label: 'Casual' },
  { key: 'annual', label: 'Annual' },
  { key: 'maternity', label: 'Maternity' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'other', label: 'Other' },
] as const;

type LeaveTypeKey = typeof LEAVE_TYPES[number]['key'];

interface StaffRow {
  id: string;
  full_name: string;
  employee_id: string;
  email: string;
  is_active: boolean;
  balanceId: string | null;
  entitlements: Record<LeaveTypeKey, number>;
  usedByType: Record<LeaveTypeKey, number>;
  balanceByType: Record<LeaveTypeKey, number>;
  loaded: boolean;
  dirty: boolean;
  saving: boolean;
}

const emptyEntitlements = (): Record<LeaveTypeKey, number> =>
  LEAVE_TYPES.reduce((acc, t) => ({ ...acc, [t.key]: 0 }), {} as Record<LeaveTypeKey, number>);

export default function LeaveLimitsPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await teacherService.getAll({ page_size: 200, include_inactive: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const rows: StaffRow[] = list.map((t: any) => ({
        id: t.id,
        full_name: t.full_name || 'Unknown',
        employee_id: t.employee_id || '',
        email: t.email || '',
        is_active: t.is_active !== false,
        balanceId: null,
        entitlements: emptyEntitlements(),
        usedByType: emptyEntitlements(),
        balanceByType: emptyEntitlements(),
        loaded: false,
        dirty: false,
        saving: false,
      }));
      setStaff(rows);
      await Promise.all(rows.map((r) => loadBalanceFor(r.id)));
    } catch {
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceFor = async (staffId: string) => {
    try {
      const bal = await teacherService.leaveBalances.get({ teacher_id: staffId });
      setStaff((prev) =>
        prev.map((r) => {
          if (r.id !== staffId) return r;
          if (!bal) {
            return { ...r, loaded: true };
          }
          const entitlements = { ...emptyEntitlements() };
          LEAVE_TYPES.forEach((t) => {
            const f = t.key === 'annual' ? 'annual_type_entitlement' : `${t.key}_entitlement`;
            entitlements[t.key] = Number(bal[f] ?? 0);
          });
          return {
            ...r,
            balanceId: bal.id,
            entitlements,
            usedByType: (bal.used_by_type || emptyEntitlements()) as Record<LeaveTypeKey, number>,
            balanceByType: (bal.balance_by_type || emptyEntitlements()) as Record<LeaveTypeKey, number>,
            loaded: true,
          };
        })
      );
    } catch {
      setStaff((prev) => prev.map((r) => (r.id === staffId ? { ...r, loaded: true } : r)));
    }
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.employee_id.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [staff, search]);

  const updateEntitlement = (staffId: string, type: LeaveTypeKey, value: number) => {
    setStaff((prev) =>
      prev.map((r) =>
        r.id === staffId
          ? {
              ...r,
              entitlements: { ...r.entitlements, [type]: isNaN(value) ? 0 : value },
              dirty: true,
            }
          : r
      )
    );
  };

  const saveRow = async (row: StaffRow) => {
    if (!row.balanceId) {
      toast.error('Balance record not available for this staff member yet');
      return;
    }
    setStaff((prev) => prev.map((r) => (r.id === row.id ? { ...r, saving: true } : r)));
    try {
      const payload: Record<string, number> = {};
      LEAVE_TYPES.forEach((t) => {
        const f = t.key === 'annual' ? 'annual_type_entitlement' : `${t.key}_entitlement`;
        payload[f] = row.entitlements[t.key];
      });
      await teacherService.leaveBalances.update(row.balanceId, payload);
      toast.success(`Leave limits saved for ${row.full_name}`);
      setStaff((prev) => prev.map((r) => (r.id === row.id ? { ...r, dirty: false, saving: false } : r)));
    } catch {
      toast.error(`Failed to save limits for ${row.full_name}`);
      setStaff((prev) => prev.map((r) => (r.id === row.id ? { ...r, saving: false } : r)));
    }
  };

  const applyDefaults = async (overwrite: boolean) => {
    const label = overwrite
      ? 'Overwrite ALL staff leave limits with defaults (Annual 15, Casual 10)?'
      : 'Apply default limits (Annual 15, Casual 10) to staff who have no limits set yet?';
    if (!window.confirm(label)) return;
    setBulkSaving(true);
    try {
      const res = await teacherService.leaveBalances.setDefaults({
        annual: 15,
        casual: 10,
        sick: 0,
        maternity: 0,
        emergency: 0,
        other: 0,
        overwrite,
      });
      toast.success(
        `Defaults applied — ${res.created} new, ${res.updated} updated. You can still override any staff below.`
      );
      await loadStaff();
    } catch {
      toast.error('Failed to apply default limits');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, employee id or email..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => applyDefaults(false)} disabled={bulkSaving || loading}>
          <Users2 className="w-4 h-4 mr-1.5" />
          {bulkSaving ? 'Applying...' : 'Set Defaults (All)'}
        </Button>
        <Button variant="outline" onClick={() => applyDefaults(true)} disabled={bulkSaving || loading}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Overwrite All
        </Button>
        <Button variant="outline" onClick={loadStaff} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold flex-wrap">
        <ShieldAlert className="w-4 h-4 text-fuchsia-600" />
        Admin only — set the leave entitlement (in days) per leave type for each staff.
        <span className="text-fuchsia-700 font-bold">Defaults: Annual 15 · Casual 10</span>
        (others 0). "Set Defaults (All)" fills only empty records; "Overwrite All" replaces every staff's limits.
        Used / remaining balances are derived from approved leaves.
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-xs text-slate-400 font-semibold">
            Loading staff...
          </CardContent>
        </Card>
      ) : filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-xs text-slate-400 font-semibold">
            No staff found.
          </CardContent>
        </Card>
      ) : (
        filteredStaff.map((row) => (
          <Card key={row.id} className="border border-slate-150">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-fuchsia-600" />
                <CardTitle className="text-sm font-bold text-slate-800">{row.full_name}</CardTitle>
                <Badge className="bg-slate-100 text-slate-600 text-[9px] font-bold">
                  {row.employee_id || 'No ID'}
                </Badge>
                {!row.is_active && (
                  <Badge className="bg-rose-100 text-rose-600 text-[9px] font-bold">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {row.dirty && <Badge className="bg-amber-100 text-amber-700 text-[9px] font-bold">Unsaved</Badge>}
                <Button size="sm" onClick={() => saveRow(row)} disabled={row.saving || !row.balanceId || !row.dirty}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {row.saving ? 'Saving...' : 'Save Limits'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {LEAVE_TYPES.map((t) => (
                  <div key={t.key} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">{t.label}</label>
                    <Input
                      type="number"
                      min={0}
                      value={row.entitlements[t.key]}
                      onChange={(e) => updateEntitlement(row.id, t.key, parseInt(e.target.value, 10))}
                      disabled={!row.loaded}
                      className="h-9 text-center"
                    />
                    <p className="text-[9px] text-slate-400 font-semibold text-center">
                      used {row.usedByType[t.key] ?? 0} · left {row.balanceByType[t.key] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
