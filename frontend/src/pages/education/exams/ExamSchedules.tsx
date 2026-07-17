import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';

interface ExamSchedule {
  id: string;
  exam_id: string;
  exam_name: string;
  exam_code: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  room: string;
  status: 'scheduled' | 'ongoing' | 'completed';
}

export default function ExamSchedules() {
  const navigate = useNavigate();

  // State
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ExamSchedule | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    exam_id: '',
    date: '',
    start_time: '',
    end_time: '',
    venue: 'Main Hall',
    room: 'Hall A',
    status: 'scheduled' as 'scheduled' | 'ongoing' | 'completed'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, examsRes] = await Promise.all([
        api.get('/auth/exams/schedules/').catch(() => ({ data: [] })),
        api.get('/auth/exams/').catch(() => ({ data: [] }))
      ]);

      const rawExams = Array.isArray(examsRes.data) ? examsRes.data : examsRes.data?.results || [];
      const formattedExams = rawExams.map((e: any) => ({
        id: e.id,
        title: e.title || 'Exam',
        exam_code: e.exam_code || 'EXM-001'
      }));

      setExams(formattedExams);

      // Parse schedules from API only
      const rawSchedules = Array.isArray(schedulesRes.data) ? schedulesRes.data : schedulesRes.data?.results || [];
      const backendMapped: ExamSchedule[] = rawSchedules.map((s: any) => {
        const matchingExam = formattedExams.find(ex => ex.id === s.exam);
        return {
          id: s.id,
          exam_id: s.exam,
          exam_name: matchingExam ? matchingExam.title : 'Exam',
          exam_code: matchingExam ? matchingExam.exam_code : 'EXM-001',
          date: s.date || '',
          start_time: s.start_time || '',
          end_time: s.end_time || '',
          venue: s.venue || 'Main Hall',
          room: s.room || 'Hall A',
          status: s.status || 'scheduled'
        };
      });

      setSchedules(backendMapped);
      if (formattedExams.length > 0 && !formData.exam_id) {
        setFormData(prev => ({ ...prev, exam_id: formattedExams[0].id }));
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exam_id || !formData.date || !formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      exam: formData.exam_id,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      venue: formData.venue,
      room: formData.room,
      status: formData.status
    };

    try {
      if (editingItem) {
        await api.put(`/auth/exams/schedules/${editingItem.id}/`, payload);
        toast.success('Exam schedule updated successfully!');
      } else {
        await api.post('/auth/exams/schedules/', payload);
        toast.success('Exam schedule created successfully!');
      }
      await fetchData();
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        exam_id: exams[0]?.id || '',
        date: '',
        start_time: '',
        end_time: '',
        venue: 'Main Hall',
        room: 'Hall A',
        status: 'scheduled'
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to save schedule');
    }
  };

  const handleEdit = (item: ExamSchedule) => {
    setEditingItem(item);
    setFormData({
      exam_id: item.exam_id,
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time,
      venue: item.venue,
      room: item.room,
      status: item.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/auth/exams/schedules/${id}/`);
      toast.success('Schedule deleted successfully');
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete schedule');
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Exams</span>
          <span>Exam Schedule</span>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(!showForm);
          }}
          className="px-3 h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 transition-colors text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? 'View Schedules' : 'Add Schedule'}
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {showForm ? (
          /* Form Card */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6 max-w-lg mx-auto">
            <h2 className="text-base font-black text-slate-800 text-center">
              {editingItem ? 'Edit Exam Schedule' : 'Create Exam Schedule'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Select Exam*</label>
                <select
                  value={formData.exam_id}
                  onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
                  className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                  required
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.exam_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Exam Date*</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full text-xs h-10 rounded-xl border-slate-200 focus:ring-purple-650 focus:border-purple-650 px-3 font-semibold text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Start Time*</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full text-xs h-10 rounded-xl border-slate-200 focus:ring-purple-650 focus:border-purple-650 px-3 font-semibold text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">End Time*</label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full text-xs h-10 rounded-xl border-slate-200 focus:ring-purple-650 focus:border-purple-650 px-3 font-semibold text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Venue*</label>
                  <Input
                    type="text"
                    placeholder="e.g. Main Hall"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full text-xs h-10 rounded-xl border-slate-200 focus:ring-purple-650 focus:border-purple-650 px-3 font-semibold text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Room*</label>
                  <Input
                    type="text"
                    placeholder="e.g. Hall A"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full text-xs h-10 rounded-xl border-slate-200 focus:ring-purple-650 focus:border-purple-650 px-3 font-semibold text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Status*</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                  required
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#f39c12] hover:bg-[#d6850f] text-white text-xs font-black h-10 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-colors animate-fade-in"
                >
                  <FileText className="w-4 h-4" />
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* List Card */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
            <h2 className="text-sm font-black text-slate-800">Exam Timetables & Schedules</h2>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-655 font-bold">
                  <tr>
                    <th className="px-4 py-3">Exam Name (Code)</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time Slot</th>
                    <th className="px-4 py-3">Venue/Room</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {schedules.length > 0 ? (
                    schedules.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-850">{item.exam_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.exam_code}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-500">{formatDateDisplay(item.date)}</td>
                        <td className="px-4 py-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.start_time} - {item.end_time}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.venue} / {item.room}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'ongoing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No schedules found. Click "Add Schedule" to configure one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
