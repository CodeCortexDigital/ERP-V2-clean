import api from './api'

export interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  course_id: string
  course_name: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  remarks?: string
}

export interface AttendanceSession {
  id: string
  course_id: string
  course_name: string
  date: string
  start_time: string
  end_time: string
  total_students: number
  present_count: number
  absent_count: number
  late_count: number
}

class AttendanceService {
  private baseUrl = '/education/attendance/'

  async getAllRecords(courseId?: string, date?: string): Promise<AttendanceRecord[]> {
    let url = `${this.baseUrl}records/`
    const params = new URLSearchParams()
    if (courseId) params.append('course_id', courseId)
    if (date) params.append('date', date)
    if (params.toString()) url += `?${params.toString()}`
    const response = await api.get(url)
    return response.data.results || []
  }

  async markAttendance(data: {
    student_id: string
    course_id: string
    date: string
    status: string
    remarks?: string
  }): Promise<AttendanceRecord> {
    const response = await api.post(`${this.baseUrl}mark/`, data)
    return response.data
  }

  async getSessions(courseId?: string): Promise<AttendanceSession[]> {
    let url = `${this.baseUrl}sessions/`
    if (courseId) url += `?course_id=${courseId}`
    const response = await api.get(url)
    return response.data.results || []
  }

  async getSummary(courseId?: string): Promise<any> {
    let url = `${this.baseUrl}summary/`
    if (courseId) url += `?course_id=${courseId}`
    const response = await api.get(url)
    return response.data
  }
}

export default new AttendanceService()


