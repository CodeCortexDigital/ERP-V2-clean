import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, RefreshCw, BookOpen, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import CourseForm from '@/components/CourseForm'
import courseService, { Course } from '@/services/course.service'

export default function CoursesListPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const data = await courseService.getAll()
      setCourses(data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleCreate = async (data: any) => {
    await courseService.create(data)
    await fetchCourses()
    setShowForm(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editingCourse) return
    await courseService.update(editingCourse.id, data)
    await fetchCourses()
    setEditingCourse(null)
  }

  const handleDelete = async (course: Course) => {
    if (confirm(`Are you sure you want to delete ${course.name}?`)) {
      await courseService.delete(course.id)
      await fetchCourses()
    }
  }

  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Courses Management
          </h1>
          <p className="text-gray-500 mt-1">Manage course catalog</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCourses} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Courses</p><p className="text-2xl font-bold text-blue-600">{courses.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Active Courses</p><p className="text-2xl font-bold text-green-600">{courses.filter(c => c.is_active).length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Credits</p><p className="text-2xl font-bold text-purple-600">{courses.reduce((sum, c) => sum + (c.credits || 0), 0)}</p></CardContent></Card>
      </div>

      {/* Search */}
      <Card><CardContent className="pt-6"><Input placeholder="Search by course code or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-md" /></CardContent></Card>

      {/* Courses Table */}
      <Card>
        <CardHeader><CardTitle>Course Records ({filteredCourses.length} courses)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8">Loading...</div> : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Course Name</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-4 font-mono text-xs font-bold">{course.code}</td>
                      <td className="px-4 py-4 font-medium text-gray-900">{course.name}</td>
                      <td className="px-4 py-4"><Badge variant="info">{course.credits} credits</Badge></td>
                      <td className="px-4 py-4">{course.level}</td>
                      <td className="px-4 py-4">
                        <Badge variant={course.is_active ? 'success' : 'secondary'}>
                          {course.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setEditingCourse(course)} className="text-green-600 hover:text-green-800"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(course)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && <CourseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      {editingCourse && <CourseForm initialData={editingCourse} onSubmit={handleUpdate} onCancel={() => setEditingCourse(null)} isEdit={true} />}
    </div>
  )
}
