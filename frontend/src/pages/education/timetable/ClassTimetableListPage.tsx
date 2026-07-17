import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Eye, Edit, Calendar, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import academicService from '@/services/academic.service';
import { useAuth } from '@/contexts/AuthContext';

export default function ClassTimetableListPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser;

  const [classes, setClasses] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, entriesRes] = await Promise.all([
        academicService.getClasses().catch(() => ({ data: [] })),
        academicService.getAllTimetableEntries().catch(() => ({ data: [] }))
      ]);

      const rawClasses = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || [];
      const rawEntries = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data as any)?.results || [];

      setClasses(rawClasses);
      setTimetableEntries(rawEntries);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const classSchedules = useMemo(() => {
    const defaultClasses = [
      { id: 'cls-1', name: 'Grade 1-A', code: 'G1A' },
      { id: 'cls-2', name: 'Grade 1-B', code: 'G1B' },
      { id: 'cls-3', name: 'Grade 2-A', code: 'G2A' },
      { id: 'cls-4', name: 'Grade 2-B', code: 'G2B' },
      { id: 'cls-5', name: 'Grade 3-A', code: 'G3A' },
      { id: 'cls-6', name: 'Grade 3-B', code: 'G3B' },
      { id: 'cls-7', name: 'Grade 4-A', code: 'G4A' },
      { id: 'cls-8', name: 'Grade 4-B', code: 'G4B' },
      { id: 'cls-9', name: 'Grade 5-A', code: 'G5A' },
      { id: 'cls-10', name: 'Grade 5-B', code: 'G5B' },
      { id: 'cls-11', name: 'Grade 6-A', code: 'G6A' },
      { id: 'cls-12', name: 'Grade 6-B', code: 'G6B' },
      { id: 'cls-13', name: 'Grade 7-A', code: 'G7A' },
      { id: 'cls-14', name: 'Grade 7-B', code: 'G7B' },
      { id: 'cls-15', name: 'Grade 8-A', code: 'G8A' },
      { id: 'cls-16', name: 'Grade 8-B', code: 'G8B' },
      { id: 'cls-17', name: 'Grade 9-A', code: 'G9A' },
      { id: 'cls-18', name: 'Grade 9-B', code: 'G9B' },
      { id: 'cls-19', name: 'Grade 10-A', code: 'G10A' },
      { id: 'cls-20', name: 'Grade 10-B', code: 'G10B' }
    ];

    const active = classes.length > 0 ? classes : defaultClasses;

    // Deduplicate by name (case-insensitive)
    const unique = [];
    const seen = new Set();
    for (const c of active) {
      if (c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        unique.push(c);
      }
    }

    // Natural sort
    unique.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    return unique.map(cls => {
      // Find entries for this class (normalize dashes/spaces/case: "Grade 1-A" == "Grade 1A")
      const norm = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const classEntries = timetableEntries.filter(e => norm(e.class_name) === norm(cls.name) || norm(e.class_subject?.split('-')[0]) === norm(cls.name));
      return {
        id: cls.id,
        name: cls.name,
        code: cls.code || cls.name.substring(0, 5).toUpperCase(),
        total_periods: classEntries.length,
        last_modified: classEntries.length > 0 ? 'Configured' : 'Not Configured'
      };
    });
  }, [classes, timetableEntries]);

  const filteredSchedules = useMemo(() => {
    if (!searchQuery) return classSchedules;
    const term = searchQuery.toLowerCase();
    return classSchedules.filter(c => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
  }, [searchQuery, classSchedules]);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Calendar className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/timetable')}>Timetable</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Class Timetables</span>
        </div>

        <button
          onClick={() => navigate('/education/timetable')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-650" /> Class Timetables Directory
            </h1>
            <p className="text-[10px] text-slate-400 font-bold">View, export or configure weekly timetable schedules class-wise.</p>
          </div>
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search classes..."
              className="pl-10 text-xs h-9 rounded-xl border-slate-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                    <th className="p-3.5">Class Name</th>
                    <th className="p-3.5">Class Code</th>
                    <th className="p-3.5 text-center">Periods Scheduled</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Configured State</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                  {filteredSchedules.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">{cls.name}</td>
                      <td className="p-3.5">
                        <span className="font-mono text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {cls.code}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-850">{cls.total_periods} periods</td>
                      <td className="p-3.5 text-center">
                        <Badge variant={cls.total_periods > 0 ? 'success' : 'secondary'}>
                          {cls.total_periods > 0 ? 'Active' : 'Empty'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-[10px] text-slate-400 font-normal">{cls.last_modified}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="outline" 
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-600 font-bold"
                            onClick={() => navigate(`/education/timetable/view?class_id=${cls.id}`)}
                            title="View Timetable"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="outline" 
                              className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-650 hover:text-purple-650 font-bold"
                              onClick={() => navigate(`/education/timetable/editor?class_id=${cls.id}`)}
                              title="Edit Timetable"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
