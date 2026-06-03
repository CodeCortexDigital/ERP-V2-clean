import api from './api';

export interface AttendanceRecord {
  id?: string;
  student: string;
  student_name?: string;
  student_id?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  check_in_time?: string;
  check_out_time?: string;
  remarks?: string;
}

const attendanceService = {
  // Get attendance history for a specific student
  getStudentHistory: (studentId: string) =>
    api.get(`/auth/attendance/student/${studentId}/`),
  
  // Get attendance for a class on a specific date
  getByClassAndDate: (classId: string, date: string) =>
    api.get(`/auth/attendance/class/${classId}/?date=${date}`),
  
  // Bulk save attendance - preserve optional class/section fields
  bulkSave: async (date: string, records: Array<any>) => {
    // Use the canonical bulk endpoint which attaches `marked_by` when saving
    return api.post('/auth/attendance/bulk/', {
      records: records.map(r => ({
        student_id: r.student_id,
        date: date,
        status: r.status,
        ...(r.class_id ? { class_id: r.class_id } : {}),
        ...(r.section_id ? { section_id: r.section_id } : {}),
        ...(r.remarks ? { remarks: r.remarks } : {})
      }))
    });
  },

  // Get attendance by date, optionally filtered by class and section
  getByDate: (date: string, classId?: string, sectionId?: string) => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (classId) params.append('class_id', classId);
    if (sectionId) params.append('section_id', sectionId);
    return api.get(`/auth/attendance/?${params.toString()}`);
  },
  
  // Mark single attendance
  markAttendance: (studentId: string, date: string, status: string) =>
    api.post('/auth/attendance/mark/', { student_id: studentId, date, status }),
  
  // Get attendance summary
  getSummary: (studentId: string, startDate?: string, endDate?: string) => {
    let url = `/auth/attendance/student/${studentId}/summary/`;
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    return api.get(url);
  },
  
  // Get class statistics
  getClassStatistics: (classId: string, month?: string, year?: string) => {
    let url = `/auth/attendance/class/${classId}/statistics/`;
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  }
};

export default attendanceService;
