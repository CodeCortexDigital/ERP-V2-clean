import api, { extractListData } from './api';

export interface AttendanceHistoryRecord {
  id: string;
  student_id: string;
  student_name?: string;
  date: string;
  status: string;
  remarks?: string;
  marked_by_name?: string;
  course_id?: string;
}

const attendanceService = {
  // By date/class/section
  getByDate: async (date: string, classId?: string, sectionId?: string) => {
    const params: Record<string, string> = { date };

    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;

    const response = await api.get('/auth/attendance/', { params });

    return {
      ...response,
      data: extractListData<AttendanceHistoryRecord>(response.data),
    };
  },

  // Student profile page ke liye
  getAttendance: async (params?: any) => {
    const response = await api.get('/auth/attendance/', { params });

    return {
      ...response,
      data: extractListData<AttendanceHistoryRecord>(response.data),
    };
  },

  // Student history modal ke liye
  getStudentHistory: async (studentId: string) => {
    const response = await api.get('/auth/attendance/', {
      params: { student_id: studentId },
    });

    const rows = extractListData<AttendanceHistoryRecord>(response.data);

    return {
      ...response,
      data: [...rows].sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    };
  },

  // Save attendance
  bulkSave: (records: unknown[]) =>
    api.post('/auth/attendance/bulk/', { records }),
};

export default attendanceService;