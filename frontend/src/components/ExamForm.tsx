import { useState } from 'react'
import { Save, X, FileText, Clock, Hash, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface ExamFormData {
  id?: string
  code: string
  title: string
  duration_minutes: number
  total_marks: number
  passing_marks?: number
  exam_date?: string
  start_time?: string
  end_time?: string
  venue?: string
  room?: string
  course_code?: string
  course_name?: string
  status?: string
}

interface ExamFormProps {
  initialData?: Partial<ExamFormData>
  onSubmit: (data: ExamFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export default function ExamForm({ initialData, onSubmit, onCancel, isEdit = false }: ExamFormProps) {
  const [formData, setFormData] = useState<ExamFormData>({
    code: initialData?.code || '',
    title: initialData?.title || '',
    duration_minutes: initialData?.duration_minutes || 120,
    total_marks: initialData?.total_marks || 100,
    passing_marks: initialData?.passing_marks || 40,
    exam_date: initialData?.exam_date || '',
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    venue: initialData?.venue || '',
    room: initialData?.room || '',
    course_code: initialData?.course_code || '',
    course_name: initialData?.course_name || '',
    status: initialData?.status || 'scheduled',
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.code.trim()) newErrors.code = 'Exam code is required'
    if (!formData.title.trim()) newErrors.title = 'Exam title is required'
    if (formData.duration_minutes < 1) newErrors.duration_minutes = 'Duration must be at least 1 minute'
    if (formData.total_marks < 1) newErrors.total_marks = 'Total marks must be at least 1'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ExamFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white rounded-lg w-full max-w-lg my-8">
        <form onSubmit={handleSubmit}>
          <div className="border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {isEdit ? 'Edit Exam' : 'Add New Exam'}
            </h2>
            <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4" />Exam Code *</Label>
                <Input value={formData.code} onChange={(e) => handleChange('code', e.target.value.toUpperCase())} placeholder="e.g., FINAL101" className={errors.code ? 'border-red-500' : ''} />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4" />Exam Title *</Label>
                <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., Final Examination" className={errors.title ? 'border-red-500' : ''} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4" />Duration (minutes)</Label>
                <Input type="number" value={formData.duration_minutes} onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value))} />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1"><Hash className="w-4 h-4" />Total Marks</Label>
                <Input type="number" value={formData.total_marks} onChange={(e) => handleChange('total_marks', parseInt(e.target.value))} />
              </div>
            </div>

            <div>
              <Label>Passing Marks</Label>
              <Input type="number" value={formData.passing_marks} onChange={(e) => handleChange('passing_marks', parseInt(e.target.value))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4" />Exam Date</Label>
                <Input type="date" value={formData.exam_date} onChange={(e) => handleChange('exam_date', e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <select className="w-full border rounded-lg p-2" value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={formData.start_time} onChange={(e) => handleChange('start_time', e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={formData.end_time} onChange={(e) => handleChange('end_time', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" />Venue</Label>
                <Input value={formData.venue} onChange={(e) => handleChange('venue', e.target.value)} placeholder="e.g., Main Hall" />
              </div>
              <div>
                <Label>Room</Label>
                <Input value={formData.room} onChange={(e) => handleChange('room', e.target.value)} placeholder="e.g., Room 101" />
              </div>
            </div>
          </div>

          <div className="border-t p-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
