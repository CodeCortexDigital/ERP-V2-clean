import { useState, useEffect } from 'react';
import ClassSectionSelector from './ClassSectionSelector';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

interface StudentFormData {
  student_id?: string;
  full_name: string;
  email: string;
  phone: string;
  father_name?: string;
  mother_name?: string;
  guardian_phone?: string;
  current_class?: string;
  current_section?: string;
  enrollment_date?: string;
  is_active?: boolean;
}

interface StudentFormProps {
  initialData?: StudentFormData;
  onSubmit: (data: StudentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function StudentForm({ initialData, onSubmit, onCancel, loading }: StudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    full_name: '',
    email: '',
    phone: '',
    father_name: '',
    mother_name: '',
    guardian_phone: '',
    is_active: true,
    ...initialData
  });

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [sectionName, setSectionName] = useState<string>('');

  useEffect(() => {
    // If editing existing student, pre-select class and section
    if (initialData?.current_class) {
      // You would need to fetch class ID from name here
      // For now, we'll rely on the selector
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleClassChange = (classId: string, className: string) => {
    setSelectedClassId(classId);
    setClassName(className);
    setFormData({
      ...formData,
      current_class: className
    });
  };

  const handleSectionChange = (sectionId: string, sectionName: string) => {
    setSelectedSectionId(sectionId);
    setSectionName(sectionName);
    setFormData({
      ...formData,
      current_section: sectionName
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
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
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="father_name">Father Name</Label>
          <Input
            id="father_name"
            name="father_name"
            value={formData.father_name || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="mother_name">Mother Name</Label>
          <Input
            id="mother_name"
            name="mother_name"
            value={formData.mother_name || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="guardian_phone">Guardian Phone</Label>
          <Input
            id="guardian_phone"
            name="guardian_phone"
            value={formData.guardian_phone || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Class and Section Selector */}
      <ClassSectionSelector
        onClassChange={handleClassChange}
        onSectionChange={handleSectionChange}
        showSection={true}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
}
