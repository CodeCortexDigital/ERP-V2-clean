import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, Loader2, Save } from 'lucide-react';
import academicService from '@/services/academic.service';
import teacherService from '@/services/teacher.service';

interface AcademicYear {
  id: string;
  name: string;
  is_active: boolean;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

export default function EditClassPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    academic_year: '',
    teacher_name: '',
    is_active: true,
    tuition_fee: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch academic years and teachers in parallel
      const [yearsRes, teachersRes, classData] = await Promise.all([
        academicService.academicYears.getAll().catch(() => []),
        teacherService.getActive().catch(() => []),
        id ? academicService.classes.getById(id) : Promise.resolve(null)
      ]);
      
      setAcademicYears(yearsRes || []);
      
      // ✅ FIXED: Extract the array from the response
      let teachersArray: Teacher[] = [];
      if (Array.isArray(teachersRes)) {
        teachersArray = teachersRes;
      } else if (teachersRes && typeof teachersRes === 'object') {
        // Check for data property (from api response)
        if (Array.isArray(teachersRes.data)) {
          teachersArray = teachersRes.data;
        } else if (Array.isArray(teachersRes.results)) {
          teachersArray = teachersRes.results;
        } else {
          // If it's an array-like object, try to convert
          teachersArray = Object.values(teachersRes).filter(Array.isArray).flat() || [];
        }
      }
      
      setTeachers(teachersArray);
      console.log('📚 Teachers loaded:', teachersArray);

      // Set form data if class exists
      if (classData) {
        console.log('📚 Class data:', classData);
        setFormData({
          name: classData.name || '',
          code: classData.code || '',
          description: classData.description || '',
          academic_year: classData.academic_year || '',
          teacher_name: classData.teacher_name || '',
          is_active: classData.is_active !== false,
          tuition_fee: classData.tuition_fee || 0
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }
    if (!formData.code.trim()) {
      newErrors.code = 'Class code is required';
    }
    if (formData.code.includes(' ')) {
      newErrors.code = 'Class code cannot contain spaces';
    }
    if (formData.tuition_fee < 0) {
      newErrors.tuition_fee = 'Tuition fee cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase().replace(/\s/g, ''),
      description: formData.description.trim(),
      academic_year: formData.academic_year || null,
      teacher_name: formData.teacher_name || '',
      is_active: formData.is_active,
      tuition_fee: formData.tuition_fee
    };

    setSaving(true);
    try {
      console.log('📤 Updating class:', payload);
      
      if (!id) {
        toast.error('Class ID is missing');
        return;
      }
      
      const result = await academicService.classes.update(id, payload);
      
      console.log('✅ Class updated:', result);
      toast.success(`Class "${result.name}" updated successfully!`);
      
      navigate('/education/academics/classes');
    } catch (error: any) {
      console.error('❌ Error updating class:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          Object.keys(errorData).forEach(field => {
            if (field === 'code') {
              setErrors(prev => ({ ...prev, code: errorData[field][0] || 'Invalid code' }));
            } else if (field === 'name') {
              setErrors(prev => ({ ...prev, name: errorData[field][0] || 'Invalid name' }));
            } else if (field === 'tuition_fee') {
              setErrors(prev => ({ ...prev, tuition_fee: errorData[field][0] || 'Invalid fee' }));
            }
          });
          
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            toast.error(firstError[0]);
          } else {
            toast.error('Failed to update class. Please check the form.');
          }
        } else {
          toast.error(errorData.detail || errorData.error || 'Failed to update class');
        }
      } else {
        toast.error('Failed to update class');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-500">Loading class data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => navigate('/education/academics/classes')}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classes
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Edit Class</h1>
            <p className="text-sm text-slate-500">Update class details for {formData.name || 'selected class'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Class Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Grade 1A"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.name ? 'border-red-500' : 'border-slate-300'
                } focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Class Code */}
            <div className="space-y-1.5">
              <label htmlFor="code" className="block text-sm font-medium text-slate-700">
                Class Code <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., GRD1A"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.code ? 'border-red-500' : 'border-slate-300'
                } focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm uppercase`}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              <p className="text-xs text-slate-400">No spaces allowed.</p>
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label htmlFor="academic_year" className="block text-sm font-medium text-slate-700">
                Academic Year
              </label>
              <select
                id="academic_year"
                name="academic_year"
                value={formData.academic_year}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm"
              >
                <option value="">None</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="teacher_name" className="block text-sm font-medium text-slate-700">
                Class Teacher
              </label>
              <select
                id="teacher_name"
                name="teacher_name"
                value={formData.teacher_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm"
              >
                <option value="">Select a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.full_name}>
                    {teacher.full_name} {teacher.email ? `(${teacher.email})` : ''}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  No teachers found. Please add teachers first.
                </p>
              )}
            </div>

            {/* Tuition Fee */}
            <div className="space-y-1.5">
              <label htmlFor="tuition_fee" className="block text-sm font-medium text-slate-700">
                Tuition Fee
              </label>
              <input
                id="tuition_fee"
                name="tuition_fee"
                type="number"
                value={formData.tuition_fee}
                onChange={handleChange}
                placeholder="0"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.tuition_fee ? 'border-red-500' : 'border-slate-300'
                } focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm`}
              />
              {errors.tuition_fee && <p className="text-xs text-red-500 mt-1">{errors.tuition_fee}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description of the class..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm resize-none"
              />
            </div>

            {/* Active Status */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
                <span className="text-xs text-slate-400">(Class will be visible and available)</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/education/academics/classes')}
              className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}