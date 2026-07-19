import api, { extractListData } from './api';

export interface AttendanceRecord {
  id?: string;
  student: string;
  student_name?: string;
  student_id?: string;
  class_id?: string;
  class_name?: string;
  section_id?: string;
  section_name?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  check_in_time?: string;
  check_out_time?: string;
  remarks?: string;
  marked_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendance_rate: number;
  present_percentage: number;
}

export interface AttendanceAnalytics {
  daily_average: number;
  weekly_average: number;
  monthly_average: number;
  overall_attendance: number;
  class_attendance: {
    class_name: string;
    attendance_rate: number;
    total_students: number;
  }[];
  trends: {
    date: string;
    present: number;
    absent: number;
    late: number;
  }[];
}

// Helper to normalize attendance record
const normalizeAttendance = (record: any): AttendanceRecord => ({
  ...record,
  id: String(record.id),
  student: String(record.student),
  student_id: record.student_id || record.student,
  student_name: record.student_name || record.student__full_name || '',
  class_name: record.class_name || record.class__name || '',
  section_name: record.section_name || record.section__name || '',
  status: record.status || 'present',
  date: record.date || new Date().toISOString().split('T')[0],
});

const normalizeAttendanceList = (records: any[]): AttendanceRecord[] => 
  records.map(normalizeAttendance);

const attendanceService = {
  // Get attendance history for a specific student
  getStudentHistory: async (studentId: string, params?: { 
    start_date?: string; 
    end_date?: string; 
    limit?: number;
  }) => {
    const response = await api.get(`/auth/attendance/student/${studentId}/`, { params });
    if (response.data) {
      const records = extractListData<AttendanceRecord>(response.data);
      response.data = normalizeAttendanceList(records);
    }
    return response;
  },
  
  // Get attendance for a class on a specific date
  getByClassAndDate: async (classId: string, date: string, sectionId?: string) => {
    const params: any = { date };
    if (sectionId) params.section_id = sectionId;
    const response = await api.get(`/auth/attendance/class/${classId}/`, { params });
    if (response.data) {
      const records = extractListData<AttendanceRecord>(response.data);
      response.data = normalizeAttendanceList(records);
    }
    return response;
  },
  
  // Get attendance by date, optionally filtered by class and section
  getByDate: async (date: string, classId?: string, sectionId?: string) => {
    const params: any = { date };
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    const response = await api.get('/auth/attendance/', { params });
    if (response.data) {
      const records = extractListData<AttendanceRecord>(response.data);
      response.data = normalizeAttendanceList(records);
    }
    return response;
  },
  
  // Bulk save attendance
  bulkSave: async (date: string, records: Array<any>) => {
    const response = await api.post('/auth/attendance/bulk/', {
      records: records.map(r => ({
        student_id: r.student_id || r.student,
        date: date || r.date,
        status: r.status,
        class_id: r.class_id || r.class,
        section_id: r.section_id || r.section,
        remarks: r.remarks || '',
        check_in_time: r.check_in_time || null,
        check_out_time: r.check_out_time || null,
      }))
    }, { skipGlobalToast: true } as any);
    return response;
  },
  
  // Mark single attendance
  markAttendance: async (studentId: string, date: string, status: string, remarks?: string) => {
    const response = await api.post('/auth/attendance/mark/', { 
      student_id: studentId, 
      date, 
      status,
      remarks: remarks || ''
    });
    return response;
  },
  
  // Get attendance summary for a student
  getSummary: async (studentId: string, startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/auth/attendance/student/${studentId}/summary/`, { params });
    return response;
  },
  
  // Get class statistics
  getClassStatistics: async (classId: string, month?: string, year?: string) => {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await api.get(`/auth/attendance/class/${classId}/statistics/`, { params });
    return response;
  },
  
  // Get overall analytics
  getAnalytics: async (params?: { 
    start_date?: string; 
    end_date?: string; 
    class_id?: string;
  }) => {
    const response = await api.get('/auth/attendance/analytics/', { params });
    return response;
  },
  
  // Get attendance patterns
  getPatterns: async (studentId?: string, classId?: string) => {
    const params: any = {};
    if (studentId) params.student_id = studentId;
    if (classId) params.class_id = classId;
    const response = await api.get('/auth/attendance/patterns/', { params });
    return response;
  },
  
  // Get attendance alerts
  getAlerts: async (params?: { 
    threshold?: number; 
    days?: number;
  }) => {
    const response = await api.get('/auth/attendance/alerts/', { params });
    return response;
  },
  
  // Get attendance trends
  getTrends: async (period: 'weekly' | 'monthly' = 'weekly', studentId?: string, classId?: string) => {
    const params: any = { period };
    if (studentId) params.student_id = studentId;
    if (classId) params.class_id = classId;
    const response = await api.get('/auth/attendance/trends/', { params });
    return response;
  },
  
  // Get at-risk students
  getAtRiskStudents: async (params?: { 
    threshold?: number; 
    days?: number;
    class_id?: string;
  }) => {
    const response = await api.get('/auth/attendance/at-risk/', { params });
    return response;
  },

  // Get attendance for a specific student with date range
  getStudentAttendance: async (studentId: string, startDate: string, endDate: string) => {
    const response = await api.get(`/auth/attendance/student/${studentId}/`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      }
    });
    if (response.data) {
      const records = Array.isArray(response.data)
        ? response.data
        : (response.data.results || extractListData<AttendanceRecord>(response.data));
      response.data = normalizeAttendanceList(records);
    }
    return response;
  },

  // Get attendance for a class with date range
  getClassAttendance: async (classId: string, startDate: string, endDate: string) => {
    const response = await api.get('/auth/attendance/', { 
      params: { 
        class_id: classId, 
        start_date: startDate, 
        end_date: endDate 
      } 
    });
    if (response.data) {
      const records = extractListData<AttendanceRecord>(response.data);
      response.data = normalizeAttendanceList(records);
    }
    return response;
  },

  // Get today's attendance summary
  getTodaySummary: async (classId?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const params: any = { date: today };
    if (classId) params.class_id = classId;
    const response = await api.get('/auth/attendance/summary/', { params });
    return response;
  },

  // Get attendance dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/auth/attendance/dashboard-stats/');
    return response;
  },

  // Export attendance report
  exportAttendance: async (params: { 
    start_date: string; 
    end_date: string; 
    class_id?: string;
    format?: 'csv' | 'pdf' | 'excel';
  }) => {
    const response = await api.get('/auth/attendance/export/', { 
      params,
      responseType: 'blob' 
    });
    return response;
  }
};

export default attendanceService;