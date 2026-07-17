import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Settings2, ArrowLeft, RotateCcw, Check, UserCheck, UserX, Upload, X, User } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import teacherService from '@/services/teacher.service';

export default function EditTeacherPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      try {
        const compressedBase64 = await compressImage(file);
        setProfilePicture(compressedBase64);
        setProfilePictureFile(file);
      } catch (err) {
        console.error('Error compressing image:', err);
        toast.error('Failed to process image');
      }
    }
  };

  const handleRemoveImage = () => {
    setProfilePicture('');
    setProfilePictureFile(null);
  };

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

  const [teacherData, setTeacherData] = useState<any>(null);

  useEffect(() => {
    fetchTeacherData();
  }, [id]);

  const fetchTeacherData = async () => {
    try {
      const res = await teacherService.getById(id!);
      const teacher = res.data;

      setTeacherData(teacher);
      setIsActive(teacher.is_active === true);
      setProfilePicture(teacher.profile_picture || '');

      const monthlySalary = teacher.monthly_salary != null && teacher.monthly_salary !== ''
        ? String(teacher.monthly_salary).replace(/[^0-9.]/g, '')
        : '';

      // Convert backend date string to date format for date input
      let dateOfBirthValue = '';
      if (teacher.date_of_birth) {
        try {
          dateOfBirthValue = new Date(teacher.date_of_birth).toISOString().split('T')[0];
        } catch (e) {
          dateOfBirthValue = teacher.date_of_birth;
        }
      }

      setFormData({
        fullName: teacher.full_name || '',
        phone: teacher.phone || '',
        role: teacher.role || teacher.specializations?.[0] || '',
        joiningDate: teacher.joining_date || new Date().toISOString().split('T')[0],
        monthlySalary,
        fatherName: teacher.father_husband_name || '',
        gender: teacher.gender || '',
        experience: String(teacher.experience_years || ''),
        nationalId: teacher.national_id || '',
        religion: teacher.religion || '',
        email: teacher.email || '',
        education: teacher.education || teacher.qualifications?.[0] || '',
        bloodGroup: teacher.blood_group || '',
        dateOfBirth: dateOfBirthValue,
        homeAddress: teacher.home_address || teacher.address || '',
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      await teacherService.toggleStatus(id!, !isActive);
      setIsActive(!isActive);
      toast.success(`Employee ${!isActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setTogglingStatus(false);
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
    if (!formData.email) {
      toast.error('Email is required.');
      return;
    }

    setSaving(true);

try {
      const formDataToSend = new FormData();
      formDataToSend.append('employee_id', teacherData?.employee_id || '');
      formDataToSend.append('full_name', formData.fullName.trim());
      formDataToSend.append('email', formData.email || teacherData?.email || '');
      formDataToSend.append('phone', formData.phone || '');
      formDataToSend.append('joining_date', formData.joiningDate);
      formDataToSend.append('qualifications', JSON.stringify([formData.education || 'N/A']));
      formDataToSend.append('specializations', JSON.stringify([formData.role]));
      formDataToSend.append('education', formData.education || '');
      formDataToSend.append('role', formData.role || '');
      if (formData.monthlySalary) formDataToSend.append('monthly_salary', String(formData.monthlySalary));
      formDataToSend.append('father_husband_name', formData.fatherName || '');
      formDataToSend.append('gender', formData.gender?.toLowerCase() || '');
      formDataToSend.append('national_id', formData.nationalId || '');
      formDataToSend.append('religion', formData.religion || '');
      formDataToSend.append('blood_group', formData.bloodGroup || '');
      formDataToSend.append('home_address', formData.homeAddress || '');
      formDataToSend.append('experience_years', String(parseInt(formData.experience) || 0));
      formDataToSend.append('date_of_birth', formData.dateOfBirth || '');

      if (profilePictureFile) {
        formDataToSend.append('profile_picture', profilePictureFile);
      } else if (profilePicture === '') {
        formDataToSend.append('profile_picture', '');
      }

      await teacherService.update(id!, formDataToSend);

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

        <div className="flex items-center gap-2">
          {/* ✅ Active/Inactive Toggle Button */}
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            {isActive ? (
              <><UserCheck className="w-3.5 h-3.5" /> Active</>
            ) : (
              <><UserX className="w-3.5 h-3.5" /> Inactive</>
            )}
          </button>
          <button type="button" className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors">
            <Settings2 className="w-3.5 h-3.5" /> Customize
          </button>
        </div>
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

            <div className="flex flex-col items-center justify-center space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50">
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">PICTURE</label>
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-white shadow-2xs flex items-center justify-center">
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-0.5 -right-0.5 bg-red-505 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <label className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors shadow-2xs flex items-center gap-1">
                <Upload className="w-3 h-3 text-slate-500" />
                {profilePicture ? 'Change' : 'Choose'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
              </label>
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
                value={formData.gender?.toLowerCase() || ''} 
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold"
              >
                <option value="">-- Select --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
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