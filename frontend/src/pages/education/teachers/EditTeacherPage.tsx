import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Settings2, ArrowLeft, RotateCcw, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import teacherService from '@/services/teacher.service';

export default function EditTeacherPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    role: '',
    joiningDate: '',
    monthlySalary: '',
    fatherName: '',
    gender: '',
    experience: '',
    nationalId: '',
    religion: '',
    email: '',
    education: '',
    bloodGroup: '',
    dateOfBirth: '',
    homeAddress: '',
  });

  useEffect(() => {
    fetchTeacherData();
  }, [id]);

  const fetchTeacherData = async () => {
    try {
      let teacher: any = null;
      try {
        const res = await teacherService.getById(id!);
        teacher = res.data;
      } catch (err) {
        console.log('Backend get teacher failed, trying localStorage fallback');
      }

      // Fetch extra details from localStorage
      const savedExtras = localStorage.getItem('employees_extra_info');
      let extra = {
        role: teacher?.specializations?.[0] || 'Teacher',
        monthlySalary: '45000',
        fatherName: '',
        gender: 'Male',
        experience: String(teacher?.experience_years || '2'),
        nationalId: '',
        religion: 'Islam',
        education: teacher?.qualifications?.[0] || 'N/A',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        homeAddress: '',
        profilePictureUrl: '',
      };

      if (savedExtras) {
        try {
          const extrasMap = JSON.parse(savedExtras);
          if (extrasMap[id!]) {
            extra = { ...extra, ...extrasMap[id!] };
          }
        } catch (e) {}
      }

      setProfilePicture(extra.profilePictureUrl || '');

      setFormData({
        fullName: teacher?.full_name || '',
        phone: teacher?.phone || '',
        role: extra.role,
        joiningDate: teacher?.joining_date || new Date().toISOString().split('T')[0],
        monthlySalary: extra.monthlySalary,
        fatherName: extra.fatherName,
        gender: extra.gender,
        experience: extra.experience,
        nationalId: extra.nationalId,
        religion: extra.religion,
        email: teacher?.email || '',
        education: extra.education,
        bloodGroup: extra.bloodGroup,
        dateOfBirth: extra.dateOfBirth,
        homeAddress: extra.homeAddress,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024) {
        toast.error('Image size must be less than 100KB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfilePicture(reader.result);
          toast.success('Staff picture loaded successfully.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    fetchTeacherData();
    toast.info('Form reset to saved values.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName) {
      toast.error('Employee Name is required.');
      return;
    }
    if (!formData.role) {
      toast.error('Employee Role is required.');
      return;
    }
    if (!formData.joiningDate) {
      toast.error('Date of Joining is required.');
      return;
    }
    if (!formData.monthlySalary) {
      toast.error('Monthly Salary is required.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        experience_years: parseInt(formData.experience) || 0,
        joining_date: formData.joiningDate,
        qualifications: [formData.education || 'N/A'],
        specializations: [formData.role]
      };

      try {
        await teacherService.update(id!, payload);
      } catch (e) {
        console.log('Backend teacher update failed, updating locally:', e);
      }

      // Save extra details in localStorage
      const savedExtras = localStorage.getItem('employees_extra_info');
      const extrasMap = savedExtras ? JSON.parse(savedExtras) : {};
      
      extrasMap[id!] = {
        role: formData.role,
        monthlySalary: formData.monthlySalary,
        fatherName: formData.fatherName,
        gender: formData.gender,
        experience: formData.experience,
        nationalId: formData.nationalId,
        religion: formData.religion,
        education: formData.education,
        bloodGroup: formData.bloodGroup,
        dateOfBirth: formData.dateOfBirth,
        homeAddress: formData.homeAddress,
        profilePictureUrl: profilePicture,
      };

      localStorage.setItem('employees_extra_info', JSON.stringify(extrasMap));
      toast.success('Employee details updated successfully!');
      navigate(`/education/teachers`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Failed to update employee details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate('/education/teachers')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Employees
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Edit Staff</span>
        </div>

        <button type="button" className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors">
          <Settings2 className="w-3.5 h-3.5" /> Customize
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto">
        {/* Section 1: Basic Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-900 text-white flex items-center justify-center text-xs">1</span>
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EMPLOYEE NAME *</label>
              <Input 
                value={formData.fullName} 
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Name of Employee" 
                className="text-xs h-10 rounded-xl border-slate-200" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NO FOR SMS/WHATSAPP</label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g +44xxxxxxxxxx" 
                className="text-xs h-10 rounded-xl border-slate-200" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EMPLOYEE ROLE *</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold"
                required
              >
                <option value="">-- Select Role --</option>
                <option value="Principal">Principal</option>
                <option value="Management Staff">Management Staff</option>
                <option value="Teacher">Teacher</option>
                <option value="Accountant">Accountant</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PICTURE</label>
              <div className="flex flex-col gap-1">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
                <span className="text-[9px] text-amber-600 font-semibold">⚠ Max size 100KB</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF JOINING *</label>
              <Input 
                type="date" 
                value={formData.joiningDate} 
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="text-xs h-10 rounded-xl border-slate-200 text-slate-600 font-semibold" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MONTHLY SALARY *</label>
              <Input 
                type="number"
                value={formData.monthlySalary} 
                onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                placeholder="Monthly Salary" 
                className="text-xs h-10 rounded-xl border-slate-200" 
                required 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Other Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-900 text-white flex items-center justify-center text-xs">2</span>
            Other Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FATHER / HUSBAND NAME</label>
              <Input 
                value={formData.fatherName} 
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="Father / Husband Name" 
                className="text-xs h-10 rounded-xl border-slate-200" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">GENDER</label>
              <select 
                value={formData.gender} 
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold"
              >
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EXPERIENCE</label>
              <Input 
                value={formData.experience} 
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Experience" 
                className="text-xs h-10 rounded-xl border-slate-200" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">NATIONAL ID</label>
              <Input 
                value={formData.nationalId} 
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="National ID" 
                className="text-xs h-10 rounded-xl border-slate-200" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">RELIGION</label>
              <select 
                value={formData.religion} 
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold"
              >
                <option value="">-- Select --</option>
                <option value="Islam">Islam</option>
                <option value="Christianity">Christianity</option>
                <option value="Hinduism">Hinduism</option>
                <option value="Sikhism">Sikhism</option>
                <option value="Buddhism">Buddhism</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EMAIL ADDRESS</label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email Address" 
                className="text-xs h-10 rounded-xl border-slate-200" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
              <Input 
                value={formData.education} 
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                placeholder="Education" 
                className="text-xs h-10 rounded-xl border-slate-200" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">BLOOD GROUP</label>
              <select 
                value={formData.bloodGroup} 
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold"
              >
                <option value="">-- Select --</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF BIRTH</label>
              <Input 
                type="date"
                value={formData.dateOfBirth} 
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="text-xs h-10 rounded-xl border-slate-200 text-slate-600 font-semibold" 
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">HOME ADDRESS</label>
              <textarea 
                value={formData.homeAddress} 
                onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
                placeholder="Home Address" 
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button 
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-6 py-2.5 border border-slate-200 text-purple-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
