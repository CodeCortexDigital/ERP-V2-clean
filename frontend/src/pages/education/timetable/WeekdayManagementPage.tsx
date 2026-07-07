import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from 'sonner';

interface Weekday {
  id: string;
  name: string; // e.g. Monday
  day_code: string; // e.g. monday
  is_active: boolean;
  is_half_day: boolean;
  notes?: string;
}

const DEFAULT_DAYS: Weekday[] = [
  { id: '1', name: 'Monday', day_code: 'monday', is_active: true, is_half_day: false },
  { id: '2', name: 'Tuesday', day_code: 'tuesday', is_active: true, is_half_day: false },
  { id: '3', name: 'Wednesday', day_code: 'wednesday', is_active: true, is_half_day: false },
  { id: '4', name: 'Thursday', day_code: 'thursday', is_active: true, is_half_day: false },
  { id: '5', name: 'Friday', day_code: 'friday', is_active: true, is_half_day: true, notes: 'Friday Prayer Break' },
  { id: '6', name: 'Saturday', day_code: 'saturday', is_active: false, is_half_day: false, notes: 'Weekend Holiday' },
  { id: '7', name: 'Sunday', day_code: 'sunday', is_active: false, is_half_day: false, notes: 'Weekend Holiday' }
];

export default function WeekdayManagementPage() {
  const navigate = useNavigate();
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('active_weekdays');
    if (saved) {
      try {
        setWeekdays(JSON.parse(saved));
      } catch (e) {
        setWeekdays(DEFAULT_DAYS);
      }
    } else {
      setWeekdays(DEFAULT_DAYS);
    }
  }, []);

  const handleToggleActive = (id: string) => {
    setWeekdays(prev =>
      prev.map(day =>
        day.id === id
          ? { 
              ...day, 
              is_active: !day.is_active,
              // If marking inactive, disable half day too
              is_half_day: !day.is_active ? false : day.is_half_day 
            }
          : day
      )
    );
  };

  const handleToggleHalfDay = (id: string) => {
    setWeekdays(prev =>
      prev.map(day =>
        day.id === id ? { ...day, is_half_day: !day.is_half_day } : day
      )
    );
  };

  const handleNoteChange = (id: string, notes: string) => {
    setWeekdays(prev =>
      prev.map(day => (day.id === id ? { ...day, notes } : day))
    );
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('active_weekdays', JSON.stringify(weekdays));
      toast.success('Weekdays configuration saved successfully!');
    } catch (e) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <CalendarDays className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/timetable')}>Timetable</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Weekdays Configuration</span>
        </div>

        <button
          onClick={() => navigate('/education/timetable')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">School Operation Days</CardTitle>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Toggle active school days and set half-days for your institution.</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-sm px-4">
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="divide-y divide-slate-100">
              {weekdays.map(day => (
                <div key={day.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      day.is_active ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {day.name[0]}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{day.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block capitalize">{day.day_code}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Active/Inactive Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={day.is_active}
                        onChange={() => handleToggleActive(day.id)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                      />
                      <span className={`text-[10px] font-bold ${day.is_active ? 'text-purple-700' : 'text-slate-500'}`}>
                        {day.is_active ? 'Active Day' : 'Holiday'}
                      </span>
                    </label>

                    {/* Half Day Toggle */}
                    {day.is_active && (
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={day.is_half_day}
                          onChange={() => handleToggleHalfDay(day.id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                        />
                        <span className={`text-[10px] font-bold ${day.is_half_day ? 'text-amber-700 font-black' : 'text-slate-500'}`}>
                          {day.is_half_day ? 'Half Day' : 'Full Day'}
                        </span>
                      </label>
                    )}

                    {/* Note Input */}
                    <input
                      type="text"
                      placeholder="Optional notes (e.g. Timing details)"
                      value={day.notes || ''}
                      onChange={(e) => handleNoteChange(day.id, e.target.value)}
                      className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-xs shadow-3xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tip Section */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-purple-700 flex-shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-purple-950">Timetable Synchronization</h4>
            <p className="text-[10px] text-purple-750 font-medium leading-relaxed">
              Timetable generator and viewer will automatically filter columns and display schedules matching the active weekdays configured here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
