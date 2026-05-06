import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Phone, Users, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import admissionService from '@/services/admission.service';

export default function NewApplicationPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'M',
    address: '',
    father_name: '',
    father_phone: '',
    applying_for_class: 'Grade 1',
    academic_year: '2026-2027'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await admissionService.createApplicant(formData);
      if (response.data) {
        await admissionService.createApplication(response.data.id);
        alert('Application submitted successfully!');
        navigate('/education/admissions');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/education/admissions')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Admission Application</h1>
          <p className="text-gray-500">Fill out the form to submit a new application</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle><User className="w-5 h-5 inline mr-2" />Student Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="full_name" placeholder="Full Name *" value={formData.full_name} onChange={handleChange} className="border rounded-lg p-2" required />
              <input name="email" type="email" placeholder="Email *" value={formData.email} onChange={handleChange} className="border rounded-lg p-2" required />
              <input name="phone" placeholder="Phone *" value={formData.phone} onChange={handleChange} className="border rounded-lg p-2" required />
              <input name="date_of_birth" type="date" placeholder="Date of Birth" value={formData.date_of_birth} onChange={handleChange} className="border rounded-lg p-2" />
              <select name="gender" value={formData.gender} onChange={handleChange} className="border rounded-lg p-2">
                <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
              </select>
              <input name="father_name" placeholder="Father's Name *" value={formData.father_name} onChange={handleChange} className="border rounded-lg p-2" required />
              <input name="father_phone" placeholder="Father's Phone *" value={formData.father_phone} onChange={handleChange} className="border rounded-lg p-2" required />
              <textarea name="address" placeholder="Address" rows={2} value={formData.address} onChange={handleChange} className="border rounded-lg p-2" />
              <select name="applying_for_class" value={formData.applying_for_class} onChange={handleChange} className="border rounded-lg p-2">
                <option>Grade 1</option><option>Grade 2</option><option>Grade 3</option><option>Grade 4</option><option>Grade 5</option>
              </select>
              <input name="academic_year" placeholder="Academic Year" value={formData.academic_year} onChange={handleChange} className="border rounded-lg p-2" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600">
              {loading ? 'Submitting...' : 'Submit Application'}
              <Save className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

