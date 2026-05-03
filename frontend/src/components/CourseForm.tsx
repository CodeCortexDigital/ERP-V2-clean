import { useState } from 'react'
import { Save, X, BookOpen, CreditCard, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface CourseFormData {
  id?: string
  code: string
  name: string
  credits: number
  level: string
  is_active: boolean
}

interface CourseFormProps {
  initialData?: Partial<CourseFormData>
  onSubmit: (data: CourseFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export default function CourseForm({ initialData, onSubmit, onCancel, isEdit = false }: CourseFormProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    credits: initialData?.credits || 3,
    level: initialData?.level || 'Undergraduate',
    is_active: initialData?.is_active ?? true,
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.code.trim()) newErrors.code = 'Course code is required'
    if (!formData.name.trim()) newErrors.name = 'Course name is required'
    if (formData.credits < 1 || formData.credits > 6) newErrors.credits = 'Credits must be between 1 and 6'
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

  const handleChange = (field: keyof CourseFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {isEdit ? 'Edit Course' : 'Add New Course'}
            </h2>
            <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Course Code */}
            <div>
              <Label className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4" />
                Course Code *
              </Label>
              <Input
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="e.g., CS101, MATH201"
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>

            {/* Course Name */}
            <div>
              <Label className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4" />
                Course Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Introduction to Programming"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Credits */}
            <div>
              <Label className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4" />
                Credits *
              </Label>
              <Input
                type="number"
                min="1"
                max="6"
                value={formData.credits}
                onChange={(e) => handleChange('credits', parseInt(e.target.value) || 1)}
                className={errors.credits ? 'border-red-500' : ''}
              />
              {errors.credits && <p className="text-red-500 text-xs mt-1">{errors.credits}</p>}
            </div>

            {/* Level */}
            <div>
              <Label className="mb-1 block">Level</Label>
              <select
                className="w-full border rounded-lg p-2"
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
              >
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="Diploma">Diploma</option>
                <option value="Certificate">Certificate</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active Course</Label>
            </div>
          </div>

          <div className="border-t p-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
