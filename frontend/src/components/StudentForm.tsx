import { useState } from 'react'
import { Save, X, User, Mail, Phone, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface StudentFormData {
  id?: string
  student_id: string
  full_name: string
  email: string
  phone: string
  is_active: boolean
}

interface StudentFormProps {
  initialData?: Partial<StudentFormData>
  onSubmit: (data: StudentFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export default function StudentForm({ initialData, onSubmit, onCancel, isEdit = false }: StudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    student_id: initialData?.student_id || '',
    full_name: initialData?.full_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    is_active: initialData?.is_active ?? true,
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.email.match(/\S+@\S+\.\S+/)) newErrors.email = 'Email is invalid'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.student_id.trim()) newErrors.student_id = 'Student ID is required'
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

  const handleChange = (field: keyof StudentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">{isEdit ? 'Edit Student' : 'Add New Student'}</h2>
            <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-1"><User className="w-4 h-4" />Student ID *</Label>
              <Input value={formData.student_id} onChange={(e) => handleChange('student_id', e.target.value)} placeholder="e.g., STU001" className={errors.student_id ? 'border-red-500' : ''} />
              {errors.student_id && <p className="text-red-500 text-xs mt-1">{errors.student_id}</p>}
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-1"><User className="w-4 h-4" />Full Name *</Label>
              <Input value={formData.full_name} onChange={(e) => handleChange('full_name', e.target.value)} placeholder="e.g., John Doe" className={errors.full_name ? 'border-red-500' : ''} />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4" />Email *</Label>
              <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="student@example.com" className={errors.email ? 'border-red-500' : ''} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4" />Phone Number *</Label>
              <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 9876543210" className={errors.phone ? 'border-red-500' : ''} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <Label htmlFor="is_active" className="flex items-center gap-2 cursor-pointer"><CheckCircle className="w-4 h-4 text-green-500" />Active Student</Label>
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
