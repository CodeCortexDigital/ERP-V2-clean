import api from './api'

export interface Course {
  id: string
  code: string
  name: string
  credits: number
  level: string
  is_active: boolean
}

class CourseService {
  private baseUrl = '/auth/courses/'

  async getAll(): Promise<Course[]> {
    const response = await api.get(this.baseUrl)
    return response.data.results || []
  }

  async getById(id: string): Promise<Course> {
    const response = await api.get(`${this.baseUrl}${id}/`)
    return response.data
  }

  async create(data: Partial<Course>): Promise<Course> {
    const response = await api.post(this.baseUrl, data)
    return response.data
  }

  async update(id: string, data: Partial<Course>): Promise<Course> {
    const response = await api.put(`${this.baseUrl}${id}/`, data)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}${id}/`)
  }
}

export default new CourseService()
