import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Calendar as LeaveIcon, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import api, { extractListData } from '@/services/api';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'on_leave' | 'absent';
  reason: string;
}

interface TeacherAttendanceCalendarProps {
  teacherId: string;
  teacherName: string;
}

const statusConfig = {
  present: { icon: CheckCircle, color: 'green', label: 'Present', bgColor: 'bg-green-50' },
  on_leave: { icon: LeaveIcon, color: 'blue', label: 'On Leave', bgColor: 'bg-blue-50' },
  absent: { icon: AlertCircle, color: 'yellow', label: 'Absent', bgColor: 'bg-yellow-50' },
};

export function TeacherAttendanceCalendar({ teacherId, teacherName }: TeacherAttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'present' | 'on_leave' | 'absent'>('present');
  const [reason, setReason] = useState('');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    fetchAttendance();
  }, [teacherId, currentYear, currentMonth]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/auth/academics/teacher-attendance/?teacher_id=${teacherId}&year=${currentYear}&month=${currentMonth + 1}`);
      const attendanceMap = new Map();
      extractListData<AttendanceRecord>(response.data).forEach((item) => {
        attendanceMap.set(item.date, item);
      });
      setAttendanceRecords(attendanceMap);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = async (date: string) => {
    try {
      const existing = attendanceRecords.get(date);
      if (existing) {
        await api.put(`/auth/academics/teacher-attendance/${existing.id}/`, {
          ...existing,
          status: selectedStatus,
          reason: reason
        });
      } else {
        await api.post('/auth/academics/teacher-attendance/', {
          teacher: teacherId,
          date: date,
          status: selectedStatus,
          reason: reason
        });
      }
      await fetchAttendance();
      setSelectedDate(null);
      setReason('');
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance');
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const weeks = [];
    let days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const record = attendanceRecords.get(dateStr);
      
      // Determine cell styling based on whether a record exists
      let cellBgClass = 'bg-white hover:bg-gray-50';
      let iconElement = null;
      
      if (record) {
        const config = statusConfig[record.status];
        const Icon = config.icon;
        cellBgClass = `${config.bgColor} hover:bg-opacity-75`;
        iconElement = <Icon className="w-4 h-4 mt-1" style={{ color: config.color === 'green' ? '#22c55e' : config.color === 'blue' ? '#3b82f6' : '#eab308' }} />;
      }

      days.push(
        <div 
          key={day} 
          className={`h-20 ${cellBgClass} border rounded-lg p-1 cursor-pointer transition hover:shadow-md relative`}
          onClick={() => {
            setSelectedDate(dateStr);
            setSelectedStatus(record?.status || 'present');
            setReason(record?.reason || '');
          }}
        >
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold">{day}</span>
            {iconElement}
            {record?.reason && (
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-full px-1">{record.reason.substring(0, 12)}</p>
            )}
          </div>
        </div>
      );

      if (days.length === 7) {
        weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1 mb-1">{days}</div>);
        days = [];
      }
    }

    if (days.length > 0) {
      while (days.length < 7) {
        days.push(<div key={`empty-end-${days.length}`} className="h-20 bg-gray-50 rounded-lg"></div>);
      }
      weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1 mb-1">{days}</div>);
    }

    return weeks;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-base">{teacherName} - Attendance Calendar</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-sm font-semibold px-2">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-7 w-7 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Legend - only show if there are records */}
        {attendanceRecords.size > 0 && (
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> <span>Present</span></div>
            <div className="flex items-center gap-1"><LeaveIcon className="w-3 h-3 text-blue-500" /> <span>On Leave</span></div>
            <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-yellow-500" /> <span>Absent</span></div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold py-1 bg-gray-100 rounded">
              {day}
            </div>
          ))}
        </div>
        {renderCalendar()}
      </CardContent>

      {/* Attendance Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold">Update Attendance</h2>
              <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Date: <span className="font-semibold">{selectedDate}</span></p>
              
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                >
                  <option value="present">✅ Present</option>
                  <option value="on_leave">📋 On Leave</option>
                  <option value="absent">⚠️ Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Reason (Optional)</label>
                <textarea
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., On vacation, Medical emergency..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => updateAttendance(selectedDate)} size="sm" className="flex-1 text-sm">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setSelectedDate(null)} size="sm" className="flex-1 text-sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
