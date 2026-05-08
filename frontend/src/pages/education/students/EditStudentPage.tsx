import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import studentService from '@/services/student.service';
import classService from '@/services/class.service';

export default function EditStudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    father_name: '',
    mother_name: '',
    guardian_phone: '',
    current_class: '',
    current_section: '',
    address: '',
    is_active: true
  });

  useEffect(() => {
    fetchStudent();
    fetchClasses();
  }, [id]);

  useEffect(() => {
    if (formData.current_class) {
      fetchSections();
    }
  }, [formData.current_class]);

  const fetchStudent = async () => {
    try {
      const res = await studentService.getById(id);
      const student = res.data;
      setFormData({
        full_name: student.full_name || '',
        email: student.email || '',
        phone: student.phone || '',
        father_name: student.father_name || '',
        mother_name: student.mother_name || '',
        guardian_phone: student.guardian_phone || '',
        current_class: student.current_class || '',
        current_section: student.current_section || '',
        address: student.address || '',
        is_active: student.is_active !== false
      });
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll();
      setClasses(res.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await classService.getSections(formData.current_class);
      setSections(res.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await studentService.update(id, formData);
      toast.success('Student updated successfully');
      navigate(`/education/students/${id}`);
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/education/students/${id}`)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Edit Student</h1>
            <p className="text-gray-500">Update student information</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Full Name *</label><Input name="full_name" value={formData.full_name} onChange={handleChange} required /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><Input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><Input name="phone" value={formData.phone} onChange={handleChange} /></div>
              <div><label className="block text-sm font-medium mb-1">Father's Name</label><Input name="father_name" value={formData.father_name} onChange={handleChange} /></div>
              <div><label className="block text-sm font-medium mb-1">Mother's Name</label><Input name="mother_name" value={formData.mother_name} onChange={handleChange} /></div>
              <div><label className="block text-sm font-medium mb-1">Guardian Phone</label><Input name="guardian_phone" value={formData.guardian_phone} onChange={handleChange} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Academic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Class</label>
                <select name="current_class" value={formData.current_class} onChange={handleChange} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Section</label>
                <select name="current_section" value={formData.current_section} onChange={handleChange} className="w-full border rounded-lg px-3 py-2" disabled={!formData.current_class}>
                  <option value="">Select Section</option>
                  {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} id="is_active" /><label htmlFor="is_active" className="text-sm font-medium">Active Student</label></div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
