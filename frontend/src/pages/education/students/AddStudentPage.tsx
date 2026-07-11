import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Plus, Settings, Download, Laptop, RotateCcw, Check, ArrowLeft, ChevronDown, ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import studentService from '@/services/student.service';
import teacherService from '@/services/teacher.service';
import academicService from '@/services/academic.service';
import api, { extractListData } from '@/services/api';
import { toast } from 'sonner';

const getNextSequence = (lastId: string): string => {
  if (!lastId || lastId === 'None' || lastId.trim() === '') {
    return 'STU0001';
  }
  const match = lastId.match(/\d+/);
  if (!match) {
    return 'STU0001';
  }
  const digitStr = match[0];
  const incremented = (Number(digitStr) + 1).toString();
  const padded = incremented.padStart(4, '0');
  return `STU${padded}`;
};

export default function AddStudentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [classes, setClasses] = useState<any[]>([]);
  const [lastRegId, setLastRegId] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string>('');

  const [sections, setSections] = useState({
    studentInfo: true,
    otherInfo: false,
    fatherInfo: false,
    motherInfo: false,
    documents: false,
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const [formData, setFormData] = useState({
    student_name: '',
    registration_no: '',
    class_name: '',
    date_of_admission: today,
    discount_in_fee: '',
    mobile_sms: '',
    status: 'Active',
    date_of_birth: '',
    gender: '',
    identification_mark: '',
    blood_group: '',
    disease: '',
    address: '',
    birth_form_id: '',
    cast: '',
    previous_school: '',
    previous_id: '',
    additional_note: '',
    orphan_student: '',
    osc: '',
    religion: '',
    select_family: '',
    total_siblings: '',
    father_name: '',
    father_national_id: '',
    father_occupation: '',
    father_education: '',
    father_mobile: '',
    father_profession: '',
    father_income: '',
    mother_name: '',
    mother_national_id: '',
    mother_occupation: '',
    mother_education: '',
    mother_mobile: '',
    mother_profession: '',
    mother_income: ''
  });

  React.useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await academicService.getClasses();
        let rawClasses = [];
        if (Array.isArray(res)) {
          rawClasses = res;
        } else if (res?.data) {
          rawClasses = Array.isArray(res.data) ? res.data : res.data?.results || [];
        } else if (res?.results) {
          rawClasses = res.results;
        }
        
        const sorted = rawClasses.slice().sort((a, b) => 
          a.name?.localeCompare(b?.name, undefined, { numeric: true, sensitivity: 'base' }) || 0
        );
        
        const uniqueByName = sorted.filter((c, idx, self) =>
          self.findIndex(sc => sc.name?.toLowerCase() === c.name?.toLowerCase()) === idx
        );
        
        setClasses(uniqueByName);
        
        if (uniqueByName.length > 0 && !formData.class_name) {
          setFormData(prev => ({ ...prev, class_name: uniqueByName[0].name || '' }));
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        setClasses([]);
      }
    };
    
    loadClasses();

    api.get('/auth/students/?page_size=100').then((res) => {
      const data = res.data as any;
      const list: any[] = Array.isArray(data)
        ? data
        : (data?.results ?? data?.data ?? []);
      
      if (list.length > 0) {
        let highestRegId = '';
        let highestNum = -1;
        
        list.forEach(s => {
          const regId = (s.student_id ?? s.registration_no ?? '').toString();
          if (regId) {
            const numMatch = regId.match(/\d+/);
            if (numMatch) {
              const numVal = Number(numMatch[0]);
              if (numVal > highestNum) {
                highestNum = numVal;
                highestRegId = regId;
              }
            } else if (!highestRegId) {
              highestRegId = regId;
            }
          }
        });
        
        setLastRegId(highestRegId || '');
      } else {
        setLastRegId('');
      }
    }).catch(() => {
      setLastRegId('');
    });
  }, []);

  React.useEffect(() => {
    if (lastRegId === null) return;
    
    if (lastRegId !== '') {
      const nextId = getNextSequence(lastRegId);
      if (!formData.registration_no) {
        setFormData(prev => ({ ...prev, registration_no: nextId }));
      }
    } else {
      if (!formData.registration_no) {
        setFormData(prev => ({ ...prev, registration_no: 'STU0001' }));
      }
    }
  }, [lastRegId]);

  React.useEffect(() => {
    teacherService.getAll().then((res) => {
      const list = res.data || [];
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const activeList = list.filter((t: any) => !deletedIds.includes(t.id));
      if (activeList.length === 0) {
        setShowAddTeacherModal(true);
      }
    }).catch(() => {
      const savedExtras = localStorage.getItem('employees_extra_info');
      const count = savedExtras ? Object.keys(JSON.parse(savedExtras)).length : 0;
      if (count === 0) {
        setShowAddTeacherModal(true);
      }
    });
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          toast.success('Profile picture loaded successfully.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setFormData({
        student_name: '', registration_no: '', class_name: 'Grade 1-A', date_of_admission: today, discount_in_fee: '', mobile_sms: '', status: 'Active',
        date_of_birth: '', gender: '', identification_mark: '', blood_group: '', disease: '', address: '', birth_form_id: '', cast: '', previous_school: '', previous_id: '', additional_note: '', orphan_student: '', osc: '', religion: '', select_family: '', total_siblings: '',
        father_name: '', father_national_id: '', father_occupation: '', father_education: '', father_mobile: '', father_profession: '', father_income: '',
        mother_name: '', mother_national_id: '', mother_occupation: '', mother_education: '', mother_mobile: '', mother_profession: '', mother_income: ''
    });
    toast.info('Form reset cleared');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name) {
      toast.error('Please enter Student Name');
      return;
    }
    if (!formData.registration_no) {
      toast.error('Please enter a Registration Number');
      return;
    }

    setLoading(true);

    try {
      const checkRes = await api.get(`/auth/students/?search=${encodeURIComponent(formData.registration_no)}`);
      const checkData = checkRes.data as any;
      const checkList: any[] = Array.isArray(checkData)
        ? checkData
        : (checkData?.results ?? checkData?.data ?? []);
      const duplicate = checkList.find(
        (s: any) =>
          (s.student_id ?? '').toString().toLowerCase() ===
          formData.registration_no.toLowerCase()
      );
      if (duplicate) {
        toast.error(`Registration No "${formData.registration_no}" already exists (${duplicate.full_name}). Please use a unique number.`);
        setLoading(false);
        return;
      }
    } catch {
      // Continue if check fails
    }

    const selectedClass = classes.find(c => c.name === formData.class_name);
    const classId = selectedClass?.id || null;

    // ✅ ONLY fields that exist in the Student model
    const newStudentPayload: any = {
      student_id: formData.registration_no,
      full_name: formData.student_name,
      email: `${formData.student_name.toLowerCase().replace(/\s+/g, '')}@school.edu`,
      phone: formData.mobile_sms || '',
      father_name: formData.father_name || '',
      mother_name: formData.mother_name || '',
      date_of_birth: formData.date_of_birth || null,
      admission_date: formData.date_of_admission || new Date().toISOString().split('T')[0],
      gender: formData.gender || 'other',
      address: formData.address || '',
      is_active: formData.status === 'Active',
      current_class: classId,
      profile_picture: profilePicture || null,
      guardian_name: formData.father_name || formData.student_name,
      guardian_phone: formData.father_mobile || formData.mobile_sms || '',
    };

    // Remove null/undefined values
    Object.keys(newStudentPayload).forEach(key => {
      if (newStudentPayload[key] === undefined || newStudentPayload[key] === null) {
        delete newStudentPayload[key];
      }
    });

    console.log('📤 Creating student with payload:', newStudentPayload);

    try {
      const response = await studentService.create(newStudentPayload);
      console.log('✅ Student created:', response);
      toast.success('Student registered successfully!');
      setLoading(false);
      navigate('/education/students');
    } catch (err: any) {
      console.error('Error creating student:', err);
      const errMsg = err?.response?.data?.student_id?.[0] ||
                     err?.response?.data?.full_name?.[0] ||
                     err?.response?.data?.email?.[0] ||
                     err?.response?.data?.detail ||
                     err?.response?.data?.error ||
                     JSON.stringify(err?.response?.data) ||
                     'Failed to save student to backend.';
      toast.error(`${errMsg}`);
      setLoading(false);
    }
  };

  const renderSection = (
    title: string, 
    number: number, 
    sectionKey: keyof typeof sections, 
    children: React.ReactNode,
    isAlwaysExpanded: boolean = false
  ) => {
    const isExpanded = sections[sectionKey] || isAlwaysExpanded;

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div 
          className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${!isAlwaysExpanded ? 'border-b border-slate-100' : ''}`}
          onClick={() => !isAlwaysExpanded && toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-indigo-950 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">{number}</span>
            <h2 className="font-bold text-slate-800 text-sm tracking-wider">{title}</h2>
            {!isAlwaysExpanded && (
              <span className="text-[10px] text-slate-400 ml-2">
                {isExpanded ? '(Click to collapse)' : '(Click to expand)'}
              </span>
            )}
          </div>
          {!isAlwaysExpanded && (
            <div className="text-slate-400">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="p-6 pt-4 space-y-6">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-indigo-900 pb-12 relative">
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full mx-4 text-center space-y-5 border border-slate-100 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">Add Teacher First</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You must add at least one employee or teacher to the system before you can start adding students.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                type="button" 
                onClick={() => navigate('/education/teachers/add')}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Add Teacher Now
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/education/students')}
                className="w-full py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/students')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">Admission Form</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-purple-700 rounded-lg text-xs font-semibold transition-colors">
            <Settings className="w-3.5 h-3.5" /> Customize
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors">
            <Download className="w-3.5 h-3.5" /> Import Students
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSection('Student Information', 1, 'studentInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">STUDENT NAME *</label>
                <Input placeholder="Name of Student" value={formData.student_name} onChange={(e) => handleChange('student_name', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PICTURE</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1.5 bg-white">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                </div>
                <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">⚠️ Max size 100KB</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">REGISTRATION NO *</label>
                  <span className={`px-1.5 py-0.5 text-[9px] rounded font-mono font-bold flex items-center gap-1 ${
                    lastRegId !== null
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {lastRegId === null
                      ? <span className="flex items-center gap-1"><span className="w-2 h-2 border border-slate-400 border-t-transparent rounded-full animate-spin inline-block"/>LOADING…</span>
                      : lastRegId && lastRegId !== ''
                        ? `LAST: ${lastRegId}`
                        : 'LAST: None'
                    }
                  </span>
                </div>
                <Input
                  placeholder="Registration No"
                  value={formData.registration_no}
                  onChange={(e) => handleChange('registration_no', e.target.value)}
                  className="text-xs h-11 rounded-xl border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF ADMISSION *</label>
                <Input type="date" value={formData.date_of_admission} onChange={(e) => handleChange('date_of_admission', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">STATUS *</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => handleChange('status', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SELECT CLASS *</label>
                <select 
                  value={formData.class_name} 
                  onChange={(e) => handleChange('class_name', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                >
                  {classes.length === 0 ? (
                    <option value="">No classes available. Please add a class first.</option>
                  ) : (
                    classes.map((c) => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DISCOUNT IN FEE *</label>
                <Input placeholder="In %" value={formData.discount_in_fee} onChange={(e) => handleChange('discount_in_fee', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE FOR SMS/WHATSAPP</label>
                <Input placeholder="e.g +44xxxxxxxxxx" value={formData.mobile_sms} onChange={(e) => handleChange('mobile_sms', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>
          </div>,
          true
        )}

        {renderSection('Other Information', 2, 'otherInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF BIRTH</label>
                <Input type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">GENDER</label>
                <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ANY IDENTIFICATION MARK?</label>
                <Input placeholder="Any Identification Mark?" value={formData.identification_mark} onChange={(e) => handleChange('identification_mark', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">BLOOD GROUP</label>
                 <select value={formData.blood_group} onChange={(e) => handleChange('blood_group', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                   <option value="">Blood Group</option>
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
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DISEASE IF ANY?</label>
                <Input placeholder="Disease If Any?" value={formData.disease} onChange={(e) => handleChange('disease', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ADDRESS</label>
                <Input placeholder="Address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">STUDENT BIRTH FORM ID / NIC</label>
                <Input placeholder="Student Birth Form ID / NIC" value={formData.birth_form_id} onChange={(e) => handleChange('birth_form_id', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CAST</label>
                <Input placeholder="Cast" value={formData.cast} onChange={(e) => handleChange('cast', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PREVIOUS SCHOOL</label>
                <Input placeholder="Previous School" value={formData.previous_school} onChange={(e) => handleChange('previous_school', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PREVIOUS ID / BOARD ROLL NO</label>
                <Input placeholder="Previous ID / Board Roll No" value={formData.previous_id} onChange={(e) => handleChange('previous_id', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ANY ADDITIONAL NOTE</label>
                <Input placeholder="Any Additional Note" value={formData.additional_note} onChange={(e) => handleChange('additional_note', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ORPHAN STUDENT</label>
                <select value={formData.orphan_student} onChange={(e) => handleChange('orphan_student', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                  <option value="">Select</option><option value="No">No</option><option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OSC</label>
                <select value={formData.osc} onChange={(e) => handleChange('osc', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                  <option value="">Select</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">RELIGION</label>
                <select value={formData.religion} onChange={(e) => handleChange('religion', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                  <option value="">Religion</option><option value="Islam">Islam</option><option value="Christianity">Christianity</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SELECT FAMILY</label>
                <select value={formData.select_family} onChange={(e) => handleChange('select_family', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                  <option value="">Select</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">TOTAL SIBLINGS</label>
                <Input placeholder="Total Siblings" value={formData.total_siblings} onChange={(e) => handleChange('total_siblings', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div className="pt-2">
                <button type="button" className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold text-xs rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> Add Parents
                </button>
              </div>
            </div>
          </div>
        )}

        {renderSection('Father/Guardian Information', 3, 'fatherInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FATHER NAME</label>
                <Input placeholder="Father Name" value={formData.father_name} onChange={(e) => handleChange('father_name', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
                <Input placeholder="Education" value={formData.father_education} onChange={(e) => handleChange('father_education', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FATHER NATIONAL ID</label>
                <Input placeholder="Father National ID" value={formData.father_national_id} onChange={(e) => handleChange('father_national_id', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NO</label>
                <Input placeholder="Mobile No" value={formData.father_mobile} onChange={(e) => handleChange('father_mobile', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OCCUPATION</label>
                <Input placeholder="Occupation" value={formData.father_occupation} onChange={(e) => handleChange('father_occupation', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PROFESSION</label>
                <Input placeholder="Profession" value={formData.father_profession} onChange={(e) => handleChange('father_profession', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">INCOME</label>
                <Input placeholder="Income" value={formData.father_income} onChange={(e) => handleChange('father_income', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>
          </div>
        )}

        {renderSection('Mother Information', 4, 'motherInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOTHER NAME</label>
                <Input placeholder="Mother Name" value={formData.mother_name} onChange={(e) => handleChange('mother_name', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
                <Input placeholder="Education" value={formData.mother_education} onChange={(e) => handleChange('mother_education', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOTHER NATIONAL ID</label>
                <Input placeholder="Mother National ID" value={formData.mother_national_id} onChange={(e) => handleChange('mother_national_id', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NO</label>
                <Input placeholder="Mobile No" value={formData.mother_mobile} onChange={(e) => handleChange('mother_mobile', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OCCUPATION</label>
                <Input placeholder="Occupation" value={formData.mother_occupation} onChange={(e) => handleChange('mother_occupation', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PROFESSION</label>
                <Input placeholder="Profession" value={formData.mother_profession} onChange={(e) => handleChange('mother_profession', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">INCOME</label>
                <Input placeholder="Income" value={formData.mother_income} onChange={(e) => handleChange('mother_income', e.target.value)} className="text-xs h-11 rounded-xl border-slate-200" />
              </div>
            </div>
          </div>
        )}

        {renderSection('Documents Upload', 5, 'documents',
          <div className="bg-purple-50/60 p-8 rounded-2xl border border-purple-100 text-center flex flex-col items-center justify-center space-y-2">
            <Laptop className="w-8 h-8 text-purple-600 mb-1" />
            <h4 className="font-bold text-slate-800 text-sm">Desktop Subscription Required</h4>
            <p className="text-xs text-slate-500">Document upload is available with the Desktop Version only.</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center gap-4">
          <button type="button" onClick={handleReset} className="flex items-center gap-1.5 px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
            <Check className="w-4 h-4" /> Submit
          </button>
        </div>
      </form>
    </div>
  );
}