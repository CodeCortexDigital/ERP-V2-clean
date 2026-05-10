import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, MapPin, Calendar, Users, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';
import studentService, { Student } from '@/services/student.service';
import classService, { SchoolClass, Section } from '@/services/class.service';
import api from '@/services/api';

export default function EditStudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    student_id: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    father_name: '',
    mother_name: '',
    guardian_name: '',
    guardian_phone: '',
    emergency_contact: '',
    current_class: '',
    current_section: '',
    admission_date: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    is_active: true
  });

  useEffect(() => {
    fetchStudentData();
    fetchClasses();
  }, [id]);

  const fetchStudentData = async () => {
    if (!id) return;
    try {
      const res = await studentService.getById(id);
      const student: Student = res.data;
      
      const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };
      
      setFormData({
        full_name: student.full_name || '',
        student_id: student.student_id || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: formatDate(student.date_of_birth),
        gender: student.gender || '',
        father_name: student.father_name || '',
        mother_name: student.mother_name || '',
        guardian_name: student.guardian_name || '',
        guardian_phone: student.guardian_phone || '',
        emergency_contact: student.emergency_contact || '',
        current_class: student.current_class || '',
        current_section: student.current_section || '',
        admission_date: formatDate(student.admission_date),
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        postal_code: student.postal_code || '',
        is_active: student.is_active !== undefined ? student.is_active : true
      });
      
      if (student.current_class) {
        fetchSections(student.current_class);
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to load student data');
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

  const fetchSections = async (classId: string) => {
    try {
      const res = await classService.getSections(classId);
      setSections(res.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  const handleClassChange = (classId: string) => {
    setFormData({ ...formData, current_class: classId, current_section: '' });
    if (classId) {
      fetchSections(classId);
    } else {
      setSections([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const submitData: any = {
        full_name: formData.full_name,
        student_id: formData.student_id,
        email: formData.email || '',
        phone: formData.phone || '',
        father_name: formData.father_name || '',
        mother_name: formData.mother_name || '',
        guardian_phone: formData.guardian_phone || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        postal_code: formData.postal_code || '',
        current_class: formData.current_class || null,
        current_section: formData.current_section || null,
        is_active: formData.is_active
      };
      
      if (formData.date_of_birth) {
        submitData.date_of_birth = formData.date_of_birth;
      }
      if (formData.admission_date) {
        submitData.admission_date = formData.admission_date;
      }
      if (formData.gender) {
        submitData.gender = formData.gender;
      }
      if (formData.guardian_name) {
        submitData.guardian_name = formData.guardian_name;
      }
      if (formData.emergency_contact) {
        submitData.emergency_contact = formData.emergency_contact;
      }
      
      console.log('Submitting data to backend:', submitData);
      
      const response = await api.patch(`/auth/students/${id}/`, submitData);
      console.log('Backend response:', response.data);
      
      toast.success('Student updated successfully!');
      setTimeout(() => {
        navigate(`/education/students/${id}`);
      }, 1000);
    } catch (error: any) {
      console.error('Error updating student:', error);
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
        const errorMsg = typeof error.response.data === 'object' 
          ? JSON.stringify(error.response.data) 
          : error.response.data;
        toast.error(errorMsg);
      } else {
        toast.error('Failed to update student');
      }
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
        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input 
                value={formData.full_name} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Student ID *</Label>
              <Input 
                value={formData.student_id} 
                onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input 
                type="date" 
                value={formData.date_of_birth} 
                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <select 
                className="w-full border rounded-lg px-3 py-2"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label>Guardian Phone</Label>
              <Input 
                value={formData.guardian_phone} 
                onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
              />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input 
                value={formData.emergency_contact} 
                onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Family Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Family Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Father's Name</Label>
              <Input 
                value={formData.father_name} 
                onChange={(e) => setFormData({...formData, father_name: e.target.value})}
              />
            </div>
            <div>
              <Label>Mother's Name</Label>
              <Input 
                value={formData.mother_name} 
                onChange={(e) => setFormData({...formData, mother_name: e.target.value})}
              />
            </div>
            <div>
              <Label>Guardian Name</Label>
              <Input 
                value={formData.guardian_name} 
                onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Class</Label>
              <select 
                className="w-full border rounded-lg px-3 py-2"
                value={formData.current_class}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Section</Label>
              <select 
                className="w-full border rounded-lg px-3 py-2"
                value={formData.current_section}
                onChange={(e) => setFormData({...formData, current_section: e.target.value})}
                disabled={!formData.current_class}
              >
                <option value="">Select Section</option>
                {sections.map((s: any) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Admission Date</Label>
              <Input 
                type="date" 
                value={formData.admission_date} 
                onChange={(e) => setFormData({...formData, admission_date: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Street Address</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="House #, Street, Area"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input 
                  value={formData.state} 
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input 
                  value={formData.postal_code} 
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Status</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <span>Active Student</span>
            </label>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}