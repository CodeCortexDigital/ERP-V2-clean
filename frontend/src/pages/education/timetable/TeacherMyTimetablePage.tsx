import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ArrowLeft, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import academicService from '@/services/academic.service';
import teacherService from '@/services/teacher.service';
import { useAuth } from '@/contexts/AuthContext';
import { useCanAccess } from '@/hooks/usePermissions';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TeacherMyTimetablePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canView } = useCanAccess();
  const [entries, setEntries] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await teacherService.getMyProfile().catch(() => null);
        const name =
          (profile?.data?.full_name ||
            profile?.data?.name ||
            JSON.parse(localStorage.getItem('current_employee_data') || '{}').name ||
            user?.full_name ||
            '') as string;
        if (!active) return;
        setTeacherName(name.toLowerCase());

        const res = await academicService.getAllTimetableEntries().catch(() => ({ data: [] }));
        const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
        if (!active) return;
        setEntries(raw);
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const myEntries = useMemo(() => {
    if (!teacherName) return entries;
    return entries.filter((e) => {
      const n = (e.teacher_name || e.teacher || '').toLowerCase();
      return n && (n === teacherName || n.includes(teacherName) || teacherName.includes(n));
    });
  }, [entries, teacherName]);

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    DAY_ORDER.forEach((d) => (map[d] = []));
    myEntries.forEach((e) => {
      const day = e.day_of_week || e.weekday || e.day || 'Monday';
      (map[day] || (map[day] = [])).push(e);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    );
    return map;
  }, [myEntries]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/teacher')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Timetable</h1>
            <p className="text-sm text-slate-500">
              {myEntries.length} periods scheduled for {teacherName || 'you'}
            </p>
          </div>
        </div>
        {canView('timetable') && (
          <Button onClick={() => navigate('/education/timetable')} variant="outline">
            <Calendar className="w-4 h-4 mr-2" /> Full Timetable
          </Button>
        )}
      </div>

      {myEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No timetable periods assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAY_ORDER.filter((d) => byDay[d]?.length).map((day) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> {day}
                  <Badge variant="secondary" className="ml-auto">
                    {byDay[day].length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {byDay[day].map((e, i) => (
                  <div key={e.id || i} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-center min-w-[56px]">
                      <p className="text-xs font-bold text-slate-700">{e.start_time || '--:--'}</p>
                      <p className="text-[10px] text-slate-400">{e.end_time || ''}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {e.subject_name || e.subject || 'Subject'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {e.class_name || e.class || 'Class'}
                      </p>
                      {(e.room_name || e.room) && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {e.room_name || e.room}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
