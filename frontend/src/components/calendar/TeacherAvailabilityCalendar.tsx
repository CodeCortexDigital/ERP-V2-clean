import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import api from '@/services/api';

interface Availability {
  id: string;
  date: string;
  is_available: boolean;
  reason: string;
}

interface TeacherAvailabilityCalendarProps {
  teacherId: string;
  teacherName: string;
}

export function TeacherAvailabilityCalendar({ teacherId, teacherName }: TeacherAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Map<string, Availability>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [reason, setReason] = useState('');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    fetchAvailabilities();
  }, [teacherId, currentYear, currentMonth]);

  const fetchAvailabilities = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/auth/academics/teacher-daily-availability/?teacher_id=${teacherId}&year=${currentYear}&month=${currentMonth + 1}`);
      const availabilityMap = new Map();
      response.data.forEach((item: Availability) => {
        availabilityMap.set(item.date, item);
      });
      setAvailabilities(availabilityMap);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (date: string) => {
    try {
      const existing = availabilities.get(date);
      if (existing) {
        await api.put(`/auth/academics/teacher-daily-availability/${existing.id}/`, {
          ...existing,
          is_available: isAvailable,
          reason: reason
        });
      } else {
        await api.post('/auth/academics/teacher-daily-availability/', {
          teacher: teacherId,
          date: date,
          is_available: isAvailable,
          reason: reason
        });
      }
      await fetchAvailabilities();
      setSelectedDate(null);
      setReason('');
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
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

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 bg-gray-50 border rounded-lg"></div>);
    }

    // Fill actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const availability = availabilities.get(dateStr);
      const isAvailableDay = availability ? availability.is_available : true;

      days.push(
        <div 
          key={day} 
          className={`h-16 border rounded-lg p-1 cursor-pointer transition hover:shadow-md ${isAvailableDay ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
          onClick={() => {
            setSelectedDate(dateStr);
            setIsAvailable(isAvailableDay);
            setReason(availability?.reason || '');
          }}
        >
          <div className="flex justify-between items-start">
            <span className="font-semibold text-base">{day}</span>
            {isAvailableDay ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          {availability?.reason && (
            <p className="text-xs text-gray-500 mt-1 truncate">{availability.reason}</p>
          )}
        </div>
      );

      if (days.length === 7) {
        weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1 mb-2">{days}</div>);
        days = [];
      }
    }

    // Add remaining empty cells
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(<div key={`empty-end-${days.length}`} className="h-16 bg-gray-50 border rounded-lg"></div>);
      }
      weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1 mb-2">{days}</div>);
    }

    return weeks;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{teacherName} - Availability Calendar</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-base font-semibold">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold py-1 bg-gray-100 rounded-lg">
              {day}
            </div>
          ))}
        </div>
        {renderCalendar()}
      </CardContent>

      {/* Availability Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Update Availability</h2>
              <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">Date: <span className="font-semibold">{selectedDate}</span></p>
              
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-1"
                  value={isAvailable ? 'available' : 'unavailable'}
                  onChange={(e) => setIsAvailable(e.target.value === 'available')}
                >
                  <option value="available">✅ Available</option>
                  <option value="unavailable">❌ Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Reason (Optional)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-1"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., On leave, Workshop, Meeting, etc."
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => updateAvailability(selectedDate)} className="flex-1">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setSelectedDate(null)} className="flex-1">
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

