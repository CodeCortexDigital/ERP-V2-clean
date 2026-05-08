import api from './api';

export interface Attendance {
  id: string;
  student: string;
  student_name?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  class_ref?: string;
  section?: string;
}

const attendanceService = {
  // Get attendance records with filters
  getAttendance: (params?: { date?: string; class_id?: string; section_id?: string; student_id?: string }) => 
    api.get('/education/attendance/', { params }),
  
  // Mark multiple attendance records
  markAttendance: (data: Attendance[]) => api.post('/education/attendance/bulk/', data),
  
  // Update single attendance record
  updateAttendance: (id: string, data: Partial<Attendance>) => 
    api.put(`/education/attendance/${id}/`, data),
  
  // Get attendance by date and class
  getByDate: (date: string, classId?: string) => 
    api.get(`/education/attendance/?date=${date}${classId ? `&class_id=${classId}` : ''}`),
  
  // Get attendance summary
  getSummary: (params?: { class_id?: string; section_id?: string; month?: string; year?: string }) =>
    api.get('/education/attendance/summary/', { params }),
  
  // Get attendance for a specific student
  getStudentAttendance: (studentId: string, params?: { start_date?: string; end_date?: string }) =>
    api.get(`/education/attendance/student/${studentId}/`, { params }),
};

export default attendanceService;
