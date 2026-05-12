import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import api from '@/services/api';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  subject?: string;
}

interface StudentAttendanceCalendarProps {
  studentId: string;
  studentName: string;
}

const statusConfig = {
  present: { icon: CheckCircle, color: 'green', label: 'Present' },
  absent: { icon: XCircle, color: 'red', label: 'Absent' },
  late: { icon: AlertCircle, color: 'yellow', label: 'Late' },
};

export function StudentAttendanceCalendar({ studentId, studentName }: StudentAttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    fetchAttendance();
  }, [studentId, currentYear, currentMonth]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Fetch attendance for this student
      const response = await api.get(`/auth/attendance/student/${studentId}/?year=${currentYear}&month=${currentMonth + 1}`);
      const attendanceMap = new Map();
      let presentCount = 0, absentCount = 0, lateCount = 0;
      
      response.data.forEach((item: AttendanceRecord) => {
        attendanceMap.set(item.date, item);
        if (item.status === 'present') presentCount++;
        else if (item.status === 'absent') absentCount++;
        else if (item.status === 'late') lateCount++;
      });
      
      setAttendanceRecords(attendanceMap);
      setStats({
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: presentCount + absentCount + lateCount
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
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
      days.push(<div key={`empty-${i}`} className="h-16 bg-gray-50 rounded-lg"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const record = attendanceRecords.get(dateStr);
      
      let cellBgClass = 'bg-white hover:bg-gray-50';
      let iconElement = null;
      
      if (record && record.status !== 'present') {
        const config = statusConfig[record.status as keyof typeof statusConfig];
        if (config) {
          const Icon = config.icon;
          cellBgClass = record.status === 'absent' ? 'bg-red-50 hover:bg-red-100' : 'bg-yellow-50 hover:bg-yellow-100';
          iconElement = <Icon className="w-4 h-4 mt-1" style={{ color: record.status === 'absent' ? '#ef4444' : '#eab308' }} />;
        }
      } else if (record && record.status === 'present') {
        cellBgClass = 'bg-green-50 hover:bg-green-100';
        const Icon = statusConfig.present.icon;
        iconElement = <Icon className="w-4 h-4 mt-1 text-green-500" />;
      }

      days.push(
        <div key={day} className={`h-16 ${cellBgClass} border rounded-lg p-1 relative`}>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold">{day}</span>
            {iconElement}
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
        days.push(<div key={`empty-end-${days.length}`} className="h-16 bg-gray-50 rounded-lg"></div>);
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

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-base">{studentName} - Attendance Overview</CardTitle>
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
        
        {/* Statistics Summary */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Present</p>
            <p className="text-lg font-bold text-green-600">{stats.present}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Absent</p>
            <p className="text-lg font-bold text-red-600">{stats.absent}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Late</p>
            <p className="text-lg font-bold text-yellow-600">{stats.late}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Attendance</p>
            <p className="text-lg font-bold text-blue-600">{attendanceRate}%</p>
          </div>
        </div>
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
    </Card>
  );
}

