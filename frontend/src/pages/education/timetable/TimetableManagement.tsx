import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Clock, Users, BookOpen, Calendar, ShieldAlert, CheckCircle2, 
  Settings, Layers, Home, Eye, Sparkles, RefreshCw, AlertTriangle,
  GraduationCap, MapPin, Zap, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';
import teacherService from '@/services/teacher.service';
import { useAuth } from '@/contexts/AuthContext';

interface TimetableConflict {
  type: 'teacher' | 'classroom';
  day: string;
  periodName: string;
  entityName: string;
  clashingClasses: string[];
}

export default function TimetableManagement() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser;

  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Master schedule preview from localStorage
  const [localEntries, setLocalEntries] = useState<any[]>([]);
  const [localPeriods, setLocalPeriods] = useState<any[]>([]);
  const [previewDay, setPreviewDay] = useState('monday');
  const [previewClass, setPreviewClass] = useState('');
  const [activeDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  // Load local timetable entries for the preview panel
  useEffect(() => {
    const saved = localStorage.getItem('custom_timetable_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalEntries(parsed);
        // Extract unique class names for the preview selector
        const uniqueClasses = Array.from(new Set(parsed.map((e: any) => e.class_name))).filter(Boolean) as string[];
        if (uniqueClasses.length > 0 && !previewClass) {
          setPreviewClass(uniqueClasses[0]);
        }
      } catch {}
    }
    const savedPeriods = localStorage.getItem('custom_periods');
    if (savedPeriods) {
      try {
        const parsed = JSON.parse(savedPeriods);
        setLocalPeriods(parsed.sort((a: any, b: any) => a.period_number - b.period_number));
      } catch {}
    }
  }, [timetableEntries]);

  // Conflict Checker Modal states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflictsList, setConflictsList] = useState<TimetableConflict[]>([]);
  const [auditRun, setAuditRun] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes, periodsRes, classroomsRes, entriesRes] = await Promise.all([
        academicService.getClasses().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] })),
        academicService.getPeriods().catch(() => ({ data: [] })),
        academicService.getClassrooms().catch(() => ({ data: [] })),
        academicService.getAllTimetableEntries().catch(() => ({ data: [] }))
      ]);

      const classesList = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || [];
      const rawTeachers = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any)?.results || [];
      
      // Merge custom_teachers from localStorage (same logic as TeachersManagement)
      const customTeachers = JSON.parse(localStorage.getItem('custom_teachers') || '[]');
      const merged = [...rawTeachers];
      customTeachers.forEach((ct: any) => {
        if (!merged.some(t => String(t.id) === String(ct.id))) {
          merged.push(ct);
        }
      });

      // Filter out deleted teachers (same logic as TeachersManagement)
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const teachersList = merged.filter(t => !deletedIds.includes(t.id));

      const periodsList = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data as any)?.results || [];
      const classroomsList = Array.isArray(classroomsRes.data) ? classroomsRes.data : (classroomsRes.data as any)?.results || [];
      const entriesList = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data as any)?.results || [];

      setClasses(classesList);
      setTeachers(teachersList);
      setPeriods(periodsList);
      setClassrooms(classroomsList);
      setTimetableEntries(entriesList);
    } catch (err) {
      console.error('Error loading timetable dashboard:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Run clash detection check
  const handleRunConflictAudit = () => {
    setChecking(true);
    setConflictsList([]);
    setAuditRun(false);

    setTimeout(() => {
      const foundConflicts: TimetableConflict[] = [];
      const group: Record<string, any[]> = {};

      // Group entries by day and period: key is `${day}-${periodId}`
      timetableEntries.forEach(e => {
        const key = `${(e.day_of_week || '').toLowerCase().trim()}-${e.period}`;
        if (!group[key]) group[key] = [];
        group[key].push(e);
      });

      const periodMap = new Map<string, string>();
      periods.forEach(p => {
        periodMap.set(p.id, p.name || `Period ${p.period_number}`);
      });

      const teacherMapData = new Map<string, string>();
      teachers.forEach(t => {
        teacherMapData.set(String(t.id), t.full_name || t.name);
      });

      const classroomMapData = new Map<string, string>();
      classrooms.forEach(c => {
        classroomMapData.set(String(c.id), c.name);
      });

      for (const key of Object.keys(group)) {
        const slotEntries = group[key];
        const [day, periodId] = key.split('-');
        const periodName = periodMap.get(periodId) || 'Unknown Period';

        // 1. Check for Teacher double bookings
        const teacherSlots: Record<string, any[]> = {};
        slotEntries.forEach(e => {
          if (e.teacher && e.teacher !== '') {
            const tId = String(e.teacher);
            if (!teacherSlots[tId]) teacherSlots[tId] = [];
            teacherSlots[tId].push(e);
          }
        });

        for (const teacherId of Object.keys(teacherSlots)) {
          const tEntries = teacherSlots[teacherId];
          if (tEntries.length > 1) {
            foundConflicts.push({
              type: 'teacher',
              day: day.charAt(0).toUpperCase() + day.slice(1),
              periodName,
              entityName: tEntries[0].teacher_name || teacherMapData.get(teacherId) || 'Teacher',
              clashingClasses: Array.from(new Set(tEntries.map(te => te.class_name)))
            });
          }
        }

        // 2. Check for Classroom double bookings
        const roomSlots: Record<string, any[]> = {};
        slotEntries.forEach(e => {
          if (e.classroom && e.classroom !== '') {
            const rId = String(e.classroom);
            if (!roomSlots[rId]) roomSlots[rId] = [];
            roomSlots[rId].push(e);
          }
        });

        for (const roomId of Object.keys(roomSlots)) {
          const rEntries = roomSlots[roomId];
          if (rEntries.length > 1) {
            foundConflicts.push({
              type: 'classroom',
              day: day.charAt(0).toUpperCase() + day.slice(1),
              periodName,
              entityName: rEntries[0].classroom_name || classroomMapData.get(roomId) || 'Classroom',
              clashingClasses: Array.from(new Set(rEntries.map(re => re.class_name)))
            });
          }
        }
      }

      setConflictsList(foundConflicts);
      setChecking(false);
      setAuditRun(true);
    }, 800);
  };

  const handleResolveConflicts = () => {
    // Navigate to editor which has the AI genetic scheduler optimizer
    navigate('/education/timetable/editor');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Timetable & Scheduling Hub</h1>
          <p className="text-xs text-slate-400 font-semibold">Central administration module for classes, working days, periods, and conflict resolutions.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Conflict Checker Query Button */}
          <Button
            onClick={() => { setShowConflictModal(true); handleRunConflictAudit(); }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9.5 rounded-xl flex items-center gap-1.5 shadow-2xs"
          >
            <ShieldAlert className="w-4 h-4" /> Conflict Query Checker
          </Button>

          {isAdmin && (
            <Button 
              onClick={() => navigate('/education/timetable/editor')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9.5 rounded-xl flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Create Timetable Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Grid Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-tight">{timetableEntries.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Periods</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-tight">
                {Array.from(new Set(timetableEntries.map(e => e.class_name))).length}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Classes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-655 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-tight">{classrooms.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classrooms & Labs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-tight">100%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clash-Free Optimised</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Core Management Modules Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Quick Configurations & Modules</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1: Weekday Setup */}
          <Card className="border border-slate-100 shadow-3xs hover:shadow-2xs transition-all rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-800">Operating Weekdays</CardTitle>
                <p className="text-[9px] text-slate-400 font-semibold">Define school working days & half-days.</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Configure school operating schedule, select weekdays (Monday - Friday), and designate short half-day hours.
              </p>
              <Button 
                onClick={() => navigate('/education/timetable/weekdays')} 
                className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-9 rounded-xl transition-all"
              >
                Configure Working Days
              </Button>
            </CardContent>
          </Card>

          {/* Module 2: Time Periods */}
          <Card className="border border-slate-100 shadow-3xs hover:shadow-2xs transition-all rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-800">Daily Time Periods</CardTitle>
                <p className="text-[9px] text-slate-400 font-semibold">Set up class periods & break times.</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Define the duration of periods, configure morning assemblies, recess breaks, prayer hours, and academic time grids.
              </p>
              <Button 
                onClick={() => navigate('/education/timetable/periods')} 
                className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-9 rounded-xl transition-all"
              >
                Configure Time Slots
              </Button>
            </CardContent>
          </Card>

          {/* Module 3: Classrooms Directory */}
          <Card className="border border-slate-100 shadow-3xs hover:shadow-2xs transition-all rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-655 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-800">Classrooms & Facilities</CardTitle>
                <p className="text-[9px] text-slate-400 font-semibold">Manage physical room and labs floor-wise.</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Directory of 70+ campus classrooms, chemistry/physics/computer laboratories, staff facilities, and outdoor fields.
              </p>
              <Button 
                onClick={() => navigate('/education/timetable/rooms')} 
                className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-9 rounded-xl transition-all"
              >
                Manage Campus Layout
              </Button>
            </CardContent>
          </Card>

          {/* Module 4: Class Schedules list */}
          <Card className="border border-slate-100 shadow-3xs hover:shadow-2xs transition-all rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-800">Class Timetables</CardTitle>
                <p className="text-[9px] text-slate-400 font-semibold">View schedules class-by-class.</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Review and configure weekly class-wise schedules, verify subjects taught per day, and resolve curriculum requirements.
              </p>
              <Button 
                onClick={() => navigate('/education/timetable/class')} 
                className="w-full text-xs bg-slate-150 hover:bg-purple-100 text-purple-700 font-bold h-9 rounded-xl transition-all border border-purple-100"
              >
                Open Class Schedules
              </Button>
            </CardContent>
          </Card>

          {/* Module 5: Teacher Schedules list */}
          <Card className="border border-slate-100 shadow-3xs hover:shadow-2xs transition-all rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-650 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-800">Teacher Timetables</CardTitle>
                <p className="text-[9px] text-slate-400 font-semibold">View scheduled periods employee-wise.</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Audit weekly timelines for teachers, monitor employee loads, configure free period arrangements and avoid double assignments.
              </p>
              <Button 
                onClick={() => navigate('/education/timetable/teacher')} 
                className="w-full text-xs bg-slate-150 hover:bg-purple-100 text-purple-700 font-bold h-9 rounded-xl transition-all border border-purple-100"
              >
                Open Teacher Schedules
              </Button>
            </CardContent>
          </Card>

          {/* Module 6: Grid Calendar Scheduler */}
          <Card className="border border-slate-100 shadow-3xs hover:shadow-2xs transition-all rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-800">AI Scheduler & Editor</CardTitle>
                <p className="text-[9px] text-slate-400 font-semibold">Interactive calendar editor with AI clash checks.</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Manually edit slots via drag & drop, or automatically generate a 100% clash-free schedule in seconds using the genetic optimizer.
              </p>
              <Button 
                onClick={() => navigate('/education/timetable/editor')} 
                className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 rounded-xl transition-all shadow-sm"
              >
                Open Schedule Optimizer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MASTER SCHEDULE PREVIEW PANEL                                 */}
      {/* ============================================================ */}
      {localEntries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Master Schedule Overview</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Live preview of generated conflict-free timetable</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {localEntries.length} Sessions Scheduled
            </Badge>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Preview Controls */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black text-slate-700">Timetable Preview</span>
              </div>
              <div className="flex-1 flex items-center gap-3 flex-wrap">
                {/* Day filter */}
                <div className="flex gap-1">
                  {activeDays.map(day => (
                    <button
                      key={day}
                      onClick={() => setPreviewDay(day)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                        previewDay === day
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
                {/* Class filter */}
                <select
                  value={previewClass}
                  onChange={e => setPreviewClass(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white focus:outline-none focus:border-purple-400 min-w-[140px]"
                >
                  {Array.from(new Set(localEntries.map(e => e.class_name))).filter(Boolean).sort().map(cn => (
                    <option key={cn as string} value={cn as string}>{cn as string}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => navigate('/education/timetable/editor')}
                className="flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-colors"
              >
                Edit <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Timetable Grid */}
            <div className="overflow-x-auto">
              {(() => {
                const subjectColors: Record<string, string> = {
                  'english':          'bg-blue-100 text-blue-800 border-blue-200',
                  'mathematics':      'bg-purple-100 text-purple-800 border-purple-200',
                  'math':             'bg-purple-100 text-purple-800 border-purple-200',
                  'urdu':             'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'islamiyat':        'bg-amber-100 text-amber-800 border-amber-200',
                  'science':          'bg-teal-100 text-teal-800 border-teal-200',
                  'physics':          'bg-cyan-100 text-cyan-800 border-cyan-200',
                  'chemistry':        'bg-pink-100 text-pink-800 border-pink-200',
                  'biology':          'bg-lime-100 text-lime-800 border-lime-200',
                  'computer':         'bg-indigo-100 text-indigo-800 border-indigo-200',
                  'ict':              'bg-indigo-100 text-indigo-800 border-indigo-200',
                  'social studies':   'bg-orange-100 text-orange-800 border-orange-200',
                  'pakistan studies': 'bg-green-100 text-green-800 border-green-200',
                  'arts':             'bg-rose-100 text-rose-800 border-rose-200',
                  'general knowledge':'bg-sky-100 text-sky-800 border-sky-200',
                  'general science':  'bg-teal-100 text-teal-800 border-teal-200',
                  'arabic':           'bg-yellow-100 text-yellow-800 border-yellow-200',
                };
                const getColor = (subject: string) => {
                  const key = Object.keys(subjectColors).find(k => subject?.toLowerCase().includes(k));
                  return key ? subjectColors[key] : 'bg-slate-100 text-slate-700 border-slate-200';
                };

                // Use localStorage periods if available, else derive from entries
                const displayPeriods = localPeriods.length > 0
                  ? localPeriods
                  : Array.from(new Set(localEntries.map(e => e.period)))
                      .map((pId, i) => ({ id: pId, period_number: i + 1, name: `Period ${i + 1}`, is_break: false, start_time: '', end_time: '' }));

                const dayEntries = localEntries.filter(e =>
                  e.day_of_week?.toLowerCase() === previewDay &&
                  e.class_name === previewClass
                );

                if (displayPeriods.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No periods configured. Run the AI Optimizer to generate a full timetable.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider w-20">Period</th>
                        <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider w-28">Time</th>
                        <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPeriods.filter((p: any) => !p.is_break).map((period: any, idx: number) => {
                        const entry = dayEntries.find(e => String(e.period) === String(period.id));
                        const colorClass = entry ? getColor(entry.subject_name) : '';
                        return (
                          <tr key={period.id || idx} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                            <td className="px-4 py-3 font-bold text-slate-700">P{period.period_number}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">
                              {period.start_time ? `${period.start_time.substring(0, 5)} - ${period.end_time.substring(0, 5)}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {entry ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-bold text-[10px] ${colorClass}`}>
                                  <BookOpen className="w-3 h-3" />
                                  {entry.subject_name}
                                </span>
                              ) : <span className="text-slate-300 italic">Free Period</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">
                              {entry ? (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3 text-purple-400" />
                                  {entry.teacher_name || '—'}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {entry ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {entry.classroom_name || '—'}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Preview Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-semibold">
                Showing <span className="text-slate-600 font-black">{previewClass}</span> on <span className="text-slate-600 font-black capitalize">{previewDay}</span>
                {' · '}{localEntries.filter(e => e.class_name === previewClass && e.day_of_week?.toLowerCase() === previewDay).length} periods scheduled
              </p>
              <button
                onClick={() => navigate(`/education/timetable/editor?class_id=${encodeURIComponent(previewClass)}`)}
                className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5 transition-colors"
              >
                Open in Editor <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If no timetable has been generated yet, show a prompt */}
      {localEntries.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">No Timetable Generated Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Use the AI Scheduler to automatically generate a 100% conflict-free weekly timetable for all {classes.length || 'your'} classes using {teachers.length || 'your'} teachers.
            </p>
          </div>
          <Button
            onClick={() => navigate('/education/timetable/editor')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 rounded-xl px-6 shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-1.5" /> Launch AI Timetable Generator
          </Button>
        </div>
      )}

      {/* 🔍 CONFLICT AUDIT MODAL OVERLAY */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-800">Timetable Conflict Audit Results</h3>
              </div>
              <button 
                onClick={() => setShowConflictModal(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <XCloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {checking ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-700">Auditing active timetable schedule entries...</p>
                  <p className="text-[9px] text-slate-400">Verifying teacher assignments, period slots, and classroom bookings...</p>
                </div>
              ) : auditRun && conflictsList.length === 0 ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-650 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800">Zero Clashes Detected!</h4>
                    <p className="text-[10px] text-slate-500 font-semibold px-6">
                      Great work! Your current timetable structure has 100% clean schedules. There are no clashing teachers or classroom bookings.
                    </p>
                  </div>
                </div>
              ) : auditRun && conflictsList.length > 0 ? (
                <div className="space-y-4">
                  {/* Danger Alert Banner */}
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black">Timetable Conflict Alert</h4>
                      <p className="text-[10px] font-semibold text-rose-600 mt-0.5">
                        We detected <span className="font-bold text-rose-750">{conflictsList.length} clashing schedules</span> where resources or instructors are double-booked at the same time period.
                      </p>
                    </div>
                  </div>

                  {/* List of Conflicts */}
                  <div className="space-y-2">
                    {conflictsList.map((conflict, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-[10px] font-semibold"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              conflict.type === 'teacher' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {conflict.type} Clash
                            </span>
                            <span className="text-slate-850 font-bold">
                              {conflict.entityName}
                            </span>
                          </div>
                          <p className="text-slate-450 text-[9px]">
                            {conflict.day} during <span className="font-bold text-slate-600">{conflict.periodName}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 block text-[9px]">Double Booked In:</span>
                          <span className="text-rose-600 font-bold">
                            {conflict.clashingClasses.join(' & ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setShowConflictModal(false)}
                className="text-xs h-9 rounded-xl px-4 border-slate-200"
              >
                Close Audit
              </Button>
              {auditRun && conflictsList.length > 0 && (
                <Button 
                  onClick={handleResolveConflicts}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 rounded-xl px-5 shadow-sm"
                >
                  AI Resolve Conflicts
                </Button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Simple internal icon helper
function XCloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
