import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Calendar as LeaveIcon, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import api, { extractListData } from '@/services/api';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'on_leave' | 'absent';
  reason: string;
}

interface TeacherAttendanceCalendarProps {
  teacherId: string;
  teacherName: string;
  canEdit?: boolean; // Admin passes true; teacher view is read-only
}

const STATUS_CONFIG = {
  present:  { icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-50 hover:bg-green-100',  label: 'Present'  },
  on_leave: { icon: LeaveIcon,    color: 'text-blue-500',   bg: 'bg-blue-50 hover:bg-blue-100',    label: 'On Leave' },
  absent:   { icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50 hover:bg-red-100',      label: 'Absent'   },
} as const;

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function TeacherAttendanceCalendar({
  teacherId,
  teacherName,
  canEdit = false,
}: TeacherAttendanceCalendarProps) {
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [records, setRecords]             = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]              = useState(false);

  // Modal state
  const [selectedDate, setSelectedDate]   = useState<string | null>(null);
  const [selStatus, setSelStatus]         = useState<'present' | 'on_leave' | 'absent'>('present');
  const [reason, setReason]               = useState('');

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => { fetchAttendance(); }, [teacherId, year, month]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/auth/academics/teacher-attendance/?teacher_id=${teacherId}&year=${year}&month=${month + 1}`
      );
      const map = new Map<string, AttendanceRecord>();
      extractListData<AttendanceRecord>(res.data).forEach(r => map.set(r.date, r));
      setRecords(map);
    } catch {
      console.error('Failed to fetch teacher attendance');
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const allRecords = [...records.values()];
  const presentCount  = allRecords.filter(r => r.status === 'present').length;
  const absentCount   = allRecords.filter(r => r.status === 'absent').length;
  const leaveCount    = allRecords.filter(r => r.status === 'on_leave').length;
  const total         = allRecords.length;
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const openModal = (dateStr: string) => {
    if (!canEdit) return;
    const rec = records.get(dateStr);
    setSelectedDate(dateStr);
    setSelStatus(rec?.status ?? 'present');
    setReason(rec?.reason ?? '');
  };

  const saveAttendance = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const existing = records.get(selectedDate);
      if (existing) {
        await api.put(`/auth/academics/teacher-attendance/${existing.id}/`, {
          ...existing,
          status: selStatus,
          reason,
        });
      } else {
        await api.post('/auth/academics/teacher-attendance/', {
          teacher: teacherId,
          date: selectedDate,
          status: selStatus,
          reason,
        });
      }
      toast.success('Attendance updated');
      await fetchAttendance();
      setSelectedDate(null);
    } catch {
      toast.error('Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  // Calendar grid
  const renderCalendar = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay    = new Date(year, month, 1).getDay();
    const todayStr    = today();

    const cells: React.ReactNode[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e-${i}`} className="h-16 bg-gray-50 rounded-lg" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const rec     = records.get(dateStr);
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      const cfg = rec ? STATUS_CONFIG[rec.status] : null;
      const bgClass = cfg ? cfg.bg : isFuture ? 'bg-gray-50' : 'bg-white hover:bg-gray-50';

      cells.push(
        <div
          key={day}
          onClick={() => !isFuture && openModal(dateStr)}
          className={`h-16 ${bgClass} border rounded-lg p-1 flex flex-col items-center transition
            ${canEdit && !isFuture ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
            ${isToday ? 'ring-2 ring-blue-400' : ''}
          `}
          title={rec ? `${STATUS_CONFIG[rec.status].label}${rec.reason ? ` – ${rec.reason}` : ''}` : dateStr}
        >
          <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : ''}`}>{day}</span>
          {cfg && (() => {
            const Icon = cfg.icon;
            return <Icon className={`w-4 h-4 mt-0.5 ${cfg.color}`} />;
          })()}
          {rec?.reason && (
            <p className="text-[10px] text-gray-400 truncate w-full text-center px-0.5 leading-tight">
              {rec.reason.substring(0, 10)}
            </p>
          )}
        </div>
      );
    }

    // Trailing cells
    const remainder = cells.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push(<div key={`ee-${i}`} className="h-16 bg-gray-50 rounded-lg" />);
      }
    }

    // Chunk into rows
    const rows: React.ReactNode[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(
        <div key={i} className="grid grid-cols-7 gap-1 mb-1">
          {cells.slice(i, i + 7)}
        </div>
      );
    }
    return rows;
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          {/* Title + Month nav */}
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              {teacherName} — Attendance
              {canEdit && (
                <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Click a day to edit
                </span>
              )}
            </CardTitle>
            <div className="flex gap-1 items-center">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="h-7 w-7 p-0">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-sm font-semibold px-2 min-w-[130px] text-center">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="h-7 w-7 p-0">
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Stats summary — same style as student calendar */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">Present</p>
              <p className="text-lg font-bold text-green-600">{presentCount}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">Absent</p>
              <p className="text-lg font-bold text-red-600">{absentCount}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">On Leave</p>
              <p className="text-lg font-bold text-blue-600">{leaveCount}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">Rate</p>
              <p className="text-lg font-bold text-purple-600">{attendanceRate}%</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
            <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Present</div>
            <div className="flex items-center gap-1"><XCircle   className="w-3 h-3 text-red-500"   /> Absent</div>
            <div className="flex items-center gap-1"><LeaveIcon  className="w-3 h-3 text-blue-500"  /> On Leave</div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1 bg-gray-100 rounded">{d}</div>
            ))}
          </div>
          {renderCalendar()}
        </CardContent>
      </Card>

      {/* Edit Modal — only shown when canEdit=true and a date is selected */}
      {selectedDate && canEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold">Edit Attendance</h2>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Date: </span>
                <span className="font-semibold">{selectedDate}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['present', 'absent', 'on_leave'] as const).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => setSelStatus(s)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 text-xs font-medium transition
                          ${selStatus === s ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g., Sick leave, personal emergency..."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={saveAttendance} disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedDate(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
