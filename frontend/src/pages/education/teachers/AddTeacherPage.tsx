import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Phone, BookOpen, Award, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import teacherService from '@/services/teacher.service';

export default function AddTeacherPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
    joining_date: new Date().toISOString().split('T')[0],
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await teacherService.create(formData);
      navigate('/education/teachers');
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create teacher';
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/education/teachers')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Teacher</h1>
          <p className="text-gray-500 text-sm">Enter teacher details to add to faculty</p>
        </div>
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
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="TCH-XXX"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <Input
                  name="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Dr. Ahmed Raza"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@school.edu"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Experience (Years)</label>
                <Input
                  type="number"
                  name="experience_years"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Joining Date *</label>
                <Input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Qualifications & Specializations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
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

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/education/teachers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Teacher'}
          </Button>
        </div>
      </form>
    </div>
  );
}
