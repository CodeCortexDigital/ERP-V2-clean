import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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

export default function AddClassPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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

  // Fetch academic years and teachers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [yearsRes, teachersRes] = await Promise.all([
          academicService.academicYears.getAll().catch(() => []),
          teacherService.getActive().catch(() => [])
        ]);
        
        setAcademicYears(yearsRes || []);
        
        // ✅ FIX: Extract the array from the response
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
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

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

    setLoading(true);
    try {
      console.log('📤 Creating class with payload:', payload);
      
      const result = await academicService.classes.create(payload);
      
      console.log('✅ Class created:', result);
      toast.success(`Class "${result.name}" created successfully!`);
      
      navigate('/education/academics/classes');
    } catch (error: any) {
      console.error('❌ Error creating class:', error);
      
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
            toast.error('Failed to create class. Please check the form.');
          }
        } else {
          toast.error(errorData.detail || errorData.error || 'Failed to create class');
        }
      } else {
        toast.error('Failed to create class');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Back Button */}
        <button
          onClick={() => navigate('/education/academics/classes')}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classes
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Add Class</h1>
            <p className="text-sm text-slate-500">Create a new class for the academic year</p>
          </div>
        </div>

        {/* Form */}
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
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
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
                placeholder="e.g., GRD1A (no spaces)"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.code ? 'border-red-500' : 'border-slate-300'
                } focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-colors text-sm uppercase`}
              />
              {errors.code && (
                <p className="text-xs text-red-500 mt-1">{errors.code}</p>
              )}
              <p className="text-xs text-slate-400">No spaces allowed. Will be automatically uppercased.</p>
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

            {/* ✅ Teacher Dropdown - FIXED */}
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
                {teachers && teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.full_name}>
                      {teacher.full_name} {teacher.email ? `(${teacher.email})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No teachers available</option>
                )}
              </select>
              {(!teachers || teachers.length === 0) && (
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
              {errors.tuition_fee && (
                <p className="text-xs text-red-500 mt-1">{errors.tuition_fee}</p>
              )}
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
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Create Class
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}