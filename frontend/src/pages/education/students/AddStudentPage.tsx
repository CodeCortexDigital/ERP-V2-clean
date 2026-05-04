import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Mail, Phone, Users, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import studentService from '@/services/student.service';

export default function AddStudentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    father_name: '',
    mother_name: '',
    guardian_phone: '',
    student_id: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await studentService.create(formData);
      navigate('/education/students');
    } catch (error) {
      console.error('Error creating student:', error);
      alert('Failed to create student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate('/education/students')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Student</h1>
          <p className="text-gray-500 text-sm">Enter student details to enroll</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
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
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="student_id">Student ID</Label>
                <Input
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+92 300 1234567"
                />
              </div>
            </CardContent>
          </Card>

          {/* Guardian Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Guardian Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="father_name">Father's Name</Label>
                <Input
                  id="father_name"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  placeholder="Father's full name"
                />
              </div>
              <div>
                <Label htmlFor="mother_name">Mother's Name</Label>
                <Input
                  id="mother_name"
                  name="mother_name"
                  value={formData.mother_name}
                  onChange={handleChange}
                  placeholder="Mother's full name"
                />
              </div>
              <div>
                <Label htmlFor="guardian_phone">Guardian Phone</Label>
                <Input
                  id="guardian_phone"
                  name="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={handleChange}
                  placeholder="Guardian contact number"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Student'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/education/students')}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
