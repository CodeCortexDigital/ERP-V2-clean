import api from './api'

export interface Exam {
  id: string
  code: string
  title: string
  duration_minutes: number
  total_marks: number
  passing_marks?: number
  status?: string
  exam_date?: string
  start_time?: string
  end_time?: string
  course_code?: string
  course_name?: string
  venue?: string
  room?: string
}

class ExamService {
  private baseUrl = '/auth/exams/'

  async getAll(): Promise<Exam[]> {
    const response = await api.get(this.baseUrl)
    return response.data.results || []
  }

  async getById(id: string): Promise<Exam> {
    const response = await api.get(`${this.baseUrl}${id}/`)
    return response.data
  }

  async create(data: Partial<Exam>): Promise<Exam> {
    const response = await api.post(this.baseUrl, data)
    return response.data
  }

  async update(id: string, data: Partial<Exam>): Promise<Exam> {
    const response = await api.put(`${this.baseUrl}${id}/`, data)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}${id}/`)
  }
}

export default new ExamService()
