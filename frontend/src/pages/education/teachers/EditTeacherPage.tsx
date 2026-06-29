import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, User, Mail, Phone, GraduationCap, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import teacherService, { Teacher } from '@/services/teacher.service';
import academicService from '@/services/academic.service';

export default function EditTeacherPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classList, setClassList] = useState<any[]>([]);
  const [newQualification, setNewQualification] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    phone: '',
    qualifications: [] as string[],
    specializations: [] as string[],
    experience_years: 0,
    joining_date: '',
    is_active: true,
    assigned_class: '',
  });

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  const fetchTeacher = async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        teacherService.getById(id!),
        academicService.getClasses().catch(() => ({ data: [] }))
      ]);
      
      const tData = tRes.data;
      const classesData = Array.isArray(cRes.data) ? cRes.data : (cRes.data as any)?.results || [];
      setClassList(classesData);

      // Check localStorage first, then class teacher_name match
      const storedMap = JSON.parse(localStorage.getItem('teacher_assigned_classes') || '{}');
      const storedClass = storedMap[tData.id] || storedMap[tData.full_name];
      const assignedCls = classesData.find((c: any) => c.teacher_name === tData.full_name);

      setTeacher(tData);
      setFormData({
        employee_id: tData.employee_id || '',
        full_name: tData.full_name || '',
        email: tData.email || '',
        phone: tData.phone || '',
        qualifications: tData.qualifications || [],
        specializations: tData.specializations || [],
        experience_years: tData.experience_years || 0,
        joining_date: tData.joining_date || new Date().toISOString().split('T')[0],
        is_active: tData.is_active !== false,
        assigned_class: storedClass || tData.assigned_class || (assignedCls ? assignedCls.name : ''),
      });
    } catch (error) {
      console.error('Error fetching teacher:', error);
      toast.error('Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const addQualification = () => {
    if (newQualification.trim() && !formData.qualifications.includes(newQualification.trim())) {
      setFormData({
        ...formData,
        qualifications: [...formData.qualifications, newQualification.trim()],
      });
      setNewQualification('');
    }
  };

  const removeQualification = (qual: string) => {
    setFormData({
      ...formData,
      qualifications: formData.qualifications.filter(q => q !== qual),
    });
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, newSpecialization.trim()],
      });
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter(s => s !== spec),
    });
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${teacher?.full_name}? This action cannot be undone.`)) {
      setSaving(true);
      try {
        await teacherService.deleteTeacher(id!);
        toast.success('Teacher deleted successfully');
        navigate('/education/teachers');
      } catch (error) {
        console.error('Error deleting teacher:', error);
        toast.error('Failed to delete teacher');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await teacherService.update(id!, formData);

      // Persist assigned class locally and update class model
      const storedMap = JSON.parse(localStorage.getItem('teacher_assigned_classes') || '{}');
      storedMap[id!] = formData.assigned_class;
      if (formData.full_name) {
        storedMap[formData.full_name] = formData.assigned_class;
      }
      localStorage.setItem('teacher_assigned_classes', JSON.stringify(storedMap));

      // Sync to Class record
      if (formData.assigned_class) {
        const matchedCls = classList.find((c: any) => 
          c.name.toLowerCase() === formData.assigned_class.toLowerCase() || 
          formData.assigned_class.toLowerCase().includes(c.name.toLowerCase()) ||
          c.id === formData.assigned_class
        );
        if (matchedCls) {
          await academicService.updateClass(matchedCls.id, { teacher_name: formData.full_name }).catch(() => {});
        }
      }

      toast.success('Teacher updated successfully!');
      navigate(`/education/teachers/${id}`);
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast.error('Failed to update teacher');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Teacher not found</p>
        <Button onClick={() => navigate('/education/teachers')} className="mt-4">
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/education/teachers/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Teacher</h1>
            <p className="text-gray-500">Update teacher information</p>
          </div>
        </div>
        <Badge variant={formData.is_active ? 'success' : 'secondary'}>
          {formData.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <Input
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assigned Class / Section</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.assigned_class}
                  onChange={(e) => setFormData({ ...formData, assigned_class: e.target.value })}
                >
                  <option value="">-- None / Not Assigned --</option>
                  <option value="Grade 1-A">Grade 1 (Section A)</option>
                  <option value="Grade 1-B">Grade 1 (Section B)</option>
                  <option value="Grade 2-A">Grade 2 (Section A)</option>
                  <option value="Grade 2-B">Grade 2 (Section B)</option>
                  <option value="Grade 3-A">Grade 3 (Section A)</option>
                  <option value="Grade 3-B">Grade 3 (Section B)</option>
                  <option value="Grade 4-A">Grade 4 (Section A)</option>
                  <option value="Grade 4-B">Grade 4 (Section B)</option>
                  <option value="Grade 5-A">Grade 5 (Section A)</option>
                  <option value="Grade 5-B">Grade 5 (Section B)</option>
                  <option value="Grade 6-A">Grade 6 (Section A)</option>
                  <option value="Grade 6-B">Grade 6 (Section B)</option>
                  <option value="Grade 7-A">Grade 7 (Section A)</option>
                  <option value="Grade 7-B">Grade 7 (Section B)</option>
                  <option value="Grade 8-A">Grade 8 (Section A)</option>
                  <option value="Grade 8-B">Grade 8 (Section B)</option>
                  <option value="Grade 9-A">Grade 9 (Section A)</option>
                  <option value="Grade 9-B">Grade 9 (Section B)</option>
                  <option value="Grade 10-A">Grade 10 (Section A)</option>
                  <option value="Grade 10-B">Grade 10 (Section B)</option>
                  {classList.map((cls: any) => (
                    <option key={cls.id} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Experience (Years)</label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Joining Date</label>
                <Input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Qualifications & Specializations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add qualification (e.g., M.Sc, PhD)"
                    value={newQualification}
                    onChange={(e) => setNewQualification(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
                  />
                  <Button type="button" onClick={addQualification} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.qualifications.map((qual) => (
                    <Badge key={qual} variant="secondary" className="gap-1">
                      {qual}
                      <button type="button" onClick={() => removeQualification(qual)} className="ml-1 hover:text-red-500">×</button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Specializations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add specialization (e.g., Mathematics, Physics)"
                    value={newSpecialization}
                    onChange={(e) => setNewSpecialization(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                  />
                  <Button type="button" onClick={addSpecialization} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specializations.map((spec) => (
                    <Badge key={spec} variant="outline" className="gap-1">
                      {spec}
                      <button type="button" onClick={() => removeSpecialization(spec)} className="ml-1 hover:text-red-500">×</button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Teacher
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/education/teachers/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
