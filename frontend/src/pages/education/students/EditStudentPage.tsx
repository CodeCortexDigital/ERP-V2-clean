import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, ArrowLeft, RotateCcw, Check, Upload, Trash2, FileText
} from 'lucide-react';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

interface UploadedDoc {
  name: string;
  size: string;
}

export default function EditStudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isNewStudent, setIsNewStudent] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    // 1. Student Information
    student_name: '',
    registration_no: '',
    class_name: '',
    date_of_admission: getTodayDate(),
    discount_in_fee: '',
    mobile_sms: '',
    profile_picture: '',
    status: 'Active',

    // 2. Other Information
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

    // 3. Father Information
    father_name: '',
    father_national_id: '',
    father_occupation: '',
    father_education: '',
    father_mobile: '',
    father_profession: '',
    father_income: '',

    // 4. Mother Information
    mother_name: '',
    mother_national_id: '',
    mother_occupation: '',
    mother_education: '',
    mother_mobile: '',
    mother_profession: '',
    mother_income: ''
  });

  useEffect(() => {
    // Check if this is a new student (no id parameter or id is 'new')
    const isNew = !id || id === 'new';
    setIsNewStudent(isNew);
    
    if (isNew) {
      setLoading(false);
      // Set today's date for new student
      setFormData(prev => ({
        ...prev,
        date_of_admission: getTodayDate()
      }));
    } else {
      fetchClassesAndStudent();
    }
  }, [id]);

  const fetchClassesAndStudent = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const cRes = await academicService.getClasses().catch(() => ({ data: [] }));
      const rawClasses = extractListData<any>(cRes.data || []);
      const defaultClasses = [
        { id: 'cls-1', name: 'Grade 1-A' },
        { id: 'cls-2', name: 'Grade 1-B' }
      ];
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const combinedClasses = [...(rawClasses.length > 0 ? rawClasses : defaultClasses), ...customClasses];
      const deletedClassIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      const finalClasses = combinedClasses.filter(c => !deletedClassIds.includes(c.id));
      
      // Deduplicate classes by ID or name
      const uniqueClasses: any[] = [];
      const seenClassIds = new Set();
      finalClasses.forEach(c => {
        const cid = c.id || c.name;
        if (cid && !seenClassIds.has(cid)) {
          seenClassIds.add(cid);
          uniqueClasses.push(c);
        }
      });
      setClasses(uniqueClasses);

      if (id) {
        let studentData = null;

        // Only fetch from backend if it is a real database ID
        if (!id.startsWith('std-')) {
          const res = await studentService.getById(id).catch(() => null);
          studentData = res?.data;
        }

        // Fallback to local storage
        if (!studentData) {
          const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
          studentData = customStudents.find((s: any) => s.id === id || s.student_id === id);
        }

        if (studentData) {
          // Map backend/localStorage fields
          const s = studentData;
          setFormData({
            student_name:      s.full_name        ?? s.student_name     ?? '',
            registration_no:   s.student_id       ?? s.registration_no  ?? '',
            class_name:        s.class_name       ?? s.current_class_name ?? s.current_class ?? '',
            date_of_admission: s.admission_date   ?? s.date_of_admission ?? getTodayDate(),
            discount_in_fee:   s.discount_in_fee  != null ? String(s.discount_in_fee) : '',
            mobile_sms:        s.phone            ?? s.mobile_sms       ?? '',
            profile_picture:   (s.profile_picture && !s.profile_picture.includes('unsplash'))
                                 ? s.profile_picture : '',
            status:            s.is_active === false ? 'Inactive' : 'Active',

            date_of_birth:       s.date_of_birth       ?? '',
            gender:              s.gender              ?? '',
            identification_mark: s.identification_mark ?? '',
            blood_group:         s.blood_group         ?? '',
            disease:             s.disease             ?? '',
            address:             s.address             ?? '',
            birth_form_id:       s.birth_form_id       ?? '',
            cast:                s.cast                ?? '',
            previous_school:     s.previous_school     ?? '',
            previous_id:         s.previous_id         ?? '',
            additional_note:     s.additional_note     ?? '',
            orphan_student:      s.orphan_student      ?? '',
            osc:                 s.osc                 ?? '',
            religion:            s.religion            ?? '',
            select_family:       s.select_family       ?? '',
            total_siblings:      s.total_siblings      != null ? String(s.total_siblings) : '',

            father_name:         s.father_name         ?? '',
            father_national_id:  s.father_national_id  ?? '',
            father_occupation:   s.father_occupation   ?? '',
            father_education:    s.father_education    ?? '',
            father_mobile:       s.father_mobile       ?? '',
            father_profession:   s.father_profession   ?? '',
            father_income:       s.father_income       != null ? String(s.father_income) : '',

            mother_name:         s.mother_name         ?? '',
            mother_national_id:  s.mother_national_id  ?? '',
            mother_occupation:   s.mother_occupation   ?? '',
            mother_education:    s.mother_education    ?? '',
            mother_mobile:       s.mother_mobile       ?? '',
            mother_profession:   s.mother_profession   ?? '',
            mother_income:       s.mother_income       != null ? String(s.mother_income) : '',
          });

          // Load documents if stored
          const savedDocs = localStorage.getItem(`docs_${id}`);
          if (savedDocs) {
            setUploadedDocs(JSON.parse(savedDocs));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    toast.info('Form reset to last saved state');
    if (isNewStudent) {
      setFormData(prev => ({
        ...prev,
        student_name: '',
        registration_no: '',
        class_name: '',
        date_of_admission: getTodayDate(),
        discount_in_fee: '',
        mobile_sms: '',
        profile_picture: '',
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
      }));
    } else {
      fetchClassesAndStudent();
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
          handleChange('profile_picture', reader.result);
          toast.success('Profile picture updated locally.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs: UploadedDoc[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newDocs.push({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`
        });
      }
      const updated = [...uploadedDocs, ...newDocs];
      setUploadedDocs(updated);
      if (id) {
        localStorage.setItem(`docs_${id}`, JSON.stringify(updated));
      }
      toast.success('Document uploaded successfully.');
    }
  };

  const deleteDoc = (index: number) => {
    const updated = uploadedDocs.filter((_, i) => i !== index);
    setUploadedDocs(updated);
    if (id) {
      localStorage.setItem(`docs_${id}`, JSON.stringify(updated));
    }
    toast.success('Document removed.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name) {
      toast.error('Please enter Student Name');
      return;
    }

    setSaving(true);

    const payload = {
      full_name: formData.student_name,
      student_id: formData.registration_no || `STU-${Date.now()}`,
      email: `${formData.student_name.toLowerCase().replace(/\s+/g, '')}@school.edu`,
      phone: formData.mobile_sms,
      father_name: formData.father_name,
      mother_name: formData.mother_name,
      address: formData.address,
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
      admission_date: formData.date_of_admission,
      class_name: formData.class_name,
      profile_picture: formData.profile_picture,
      discount_in_fee: formData.discount_in_fee, // Include discount in payload
      is_active: formData.status === 'Active',
      // Additional fields for full save
      identification_mark: formData.identification_mark,
      blood_group: formData.blood_group,
      disease: formData.disease,
      birth_form_id: formData.birth_form_id,
      cast: formData.cast,
      previous_school: formData.previous_school,
      previous_id: formData.previous_id,
      additional_note: formData.additional_note,
      orphan_student: formData.orphan_student,
      osc: formData.osc,
      religion: formData.religion,
      select_family: formData.select_family,
      total_siblings: formData.total_siblings,
      father_national_id: formData.father_national_id,
      father_occupation: formData.father_occupation,
      father_education: formData.father_education,
      father_mobile: formData.father_mobile,
      father_profession: formData.father_profession,
      father_income: formData.father_income,
      mother_national_id: formData.mother_national_id,
      mother_occupation: formData.mother_occupation,
      mother_education: formData.mother_education,
      mother_mobile: formData.mother_mobile,
      mother_profession: formData.mother_profession,
      mother_income: formData.mother_income
    };

    try {
      // Try backend patch or create
      let response = null;
      if (id && !isNewStudent && !id.startsWith('std-')) {
        response = await studentService.update(id, payload).catch(() => null);
      } else if (isNewStudent) {
        // For new student, use create endpoint
        response = await studentService.create(payload).catch(() => null);
      }

      // Sync local storage custom_students list
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const studentId = id && !isNewStudent ? id : `STU-${Date.now()}`;
      const targetIndex = customStudents.findIndex((s: any) => s.id === studentId || s.student_id === studentId);
      
      const customObj = {
        id: studentId,
        student_id: formData.registration_no || studentId,
        full_name: formData.student_name,
        class_name: formData.class_name,
        is_active: formData.status === 'Active',
        profile_picture: formData.profile_picture,
        admission_date: formData.date_of_admission,
        phone: formData.mobile_sms,
        father_name: formData.father_name,
        mother_name: formData.mother_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        identification_mark: formData.identification_mark,
        blood_group: formData.blood_group,
        disease: formData.disease,
        birth_form_id: formData.birth_form_id,
        cast: formData.cast,
        previous_school: formData.previous_school,
        previous_id: formData.previous_id,
        additional_note: formData.additional_note,
        orphan_student: formData.orphan_student,
        osc: formData.osc,
        religion: formData.religion,
        select_family: formData.select_family,
        total_siblings: formData.total_siblings,
        discount_in_fee: formData.discount_in_fee, // Save discount
        father_national_id: formData.father_national_id,
        father_occupation: formData.father_occupation,
        father_education: formData.father_education,
        father_mobile: formData.father_mobile,
        father_profession: formData.father_profession,
        father_income: formData.father_income,
        mother_national_id: formData.mother_national_id,
        mother_occupation: formData.mother_occupation,
        mother_education: formData.mother_education,
        mother_mobile: formData.mother_mobile,
        mother_profession: formData.mother_profession,
        mother_income: formData.mother_income
      };

      if (targetIndex !== -1) {
        customStudents[targetIndex] = customObj;
      } else {
        customStudents.push(customObj);
      }
      localStorage.setItem('custom_students', JSON.stringify(customStudents));

      toast.success(isNewStudent ? 'Student created successfully!' : 'Student record updated successfully!');
      setTimeout(() => {
        navigate('/education/students');
      }, 1000);
    } catch (err) {
      toast.error(isNewStudent ? 'Failed to create student.' : 'Failed to update student records.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RotateCcw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:hidden">
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/students')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">{isNewStudent ? 'Add Student' : 'Edit Student'}</span>
        </div>

        <button 
          onClick={() => navigate('/education/students')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. Student Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center">1</span>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Student Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Picture Column */}
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-3 border-r border-slate-100 pr-2">
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">PICTURE</label>
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 shadow-2xs">
                <img src={formData.profile_picture || '/default-avatar.png'} alt="Profile preview" className="w-full h-full object-cover" />
              </div>
              <label className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Choose Image
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <span className="text-[10px] text-amber-500 font-medium">⚠️ Max size 100KB</span>
            </div>

            {/* Inputs Column 1 */}
            <div className="md:col-span-1.5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">STUDENT NAME *</label>
                <input 
                  type="text" 
                  value={formData.student_name} 
                  onChange={(e) => handleChange('student_name', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" 
                  required 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">REGISTRATION NO</label>
                <input 
                  type="text" 
                  value={formData.registration_no} 
                  onChange={(e) => handleChange('registration_no', e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" 
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF ADMISSION *</label>
                <input 
                  type="date" 
                  value={formData.date_of_admission} 
                  onChange={(e) => handleChange('date_of_admission', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" 
                />
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

            {/* Inputs Column 2 */}
            <div className="md:col-span-1.5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SELECT CLASS *</label>
                <select 
                  value={formData.class_name} 
                  onChange={(e) => handleChange('class_name', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DISCOUNT IN FEE</label>
                <input 
                  type="text" 
                  value={formData.discount_in_fee} 
                  onChange={(e) => handleChange('discount_in_fee', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" 
                  placeholder="Enter discount amount"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NO. FOR SMS/WHATSAPP</label>
                <input 
                  type="text" 
                  placeholder="e.g +44xxxxxxxxxx" 
                  value={formData.mobile_sms} 
                  onChange={(e) => handleChange('mobile_sms', e.target.value)} 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Other Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center">2</span>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Other Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF BIRTH</label>
              <input type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">STUDENT BIRTH FORM ID / NIC</label>
              <input type="text" placeholder="Student Birth Form ID / NIC" value={formData.birth_form_id} onChange={(e) => handleChange('birth_form_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ORPHAN STUDENT</label>
              <select value={formData.orphan_student} onChange={(e) => handleChange('orphan_student', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="NO">NO</option>
                <option value="YES">YES</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">GENDER</label>
              <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CAST</label>
              <input type="text" placeholder="Cast" value={formData.cast} onChange={(e) => handleChange('cast', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OSC</label>
              <select value={formData.osc} onChange={(e) => handleChange('osc', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select</option>
                <option value="OSC">OSC</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ANY IDENTIFICATION MARK?</label>
              <input type="text" placeholder="Any Identification Mark?" value={formData.identification_mark} onChange={(e) => handleChange('identification_mark', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PREVIOUS SCHOOL</label>
              <input type="text" placeholder="Previous School" value={formData.previous_school} onChange={(e) => handleChange('previous_school', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">RELIGION</label>
              <select value={formData.religion} onChange={(e) => handleChange('religion', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select Religion</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Hindu">Hindu</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">BLOOD GROUP</label>
              <select value={formData.blood_group} onChange={(e) => handleChange('blood_group', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="O+">O+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="A-">A-</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PREVIOUS ID / BOARD ROLL NO</label>
              <input type="text" placeholder="Previous ID / Board Roll No" value={formData.previous_id} onChange={(e) => handleChange('previous_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SELECT FAMILY</label>
              <select value={formData.select_family} onChange={(e) => handleChange('select_family', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DISEASE IF ANY?</label>
              <input type="text" placeholder="Disease If Any?" value={formData.disease} onChange={(e) => handleChange('disease', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ANY ADDITIONAL NOTE</label>
              <input type="text" placeholder="Any Additional Note" value={formData.additional_note} onChange={(e) => handleChange('additional_note', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">TOTAL SIBLINGS</label>
              <input type="text" placeholder="Total Siblings" value={formData.total_siblings} onChange={(e) => handleChange('total_siblings', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ADDRESS</label>
            <input type="text" placeholder="Address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
          </div>
        </div>

        {/* 3. Father/Guardian Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center">3</span>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Father/Guardian Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FATHER NAME</label>
              <input type="text" placeholder="Father Name" value={formData.father_name} onChange={(e) => handleChange('father_name', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FATHER NATIONAL ID</label>
              <input type="text" placeholder="Father National ID" value={formData.father_national_id} onChange={(e) => handleChange('father_national_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OCCUPATION</label>
              <input type="text" placeholder="Occupation" value={formData.father_occupation} onChange={(e) => handleChange('father_occupation', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
              <input type="text" placeholder="Education" value={formData.father_education} onChange={(e) => handleChange('father_education', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NO</label>
              <input type="text" placeholder="Mobile No" value={formData.father_mobile} onChange={(e) => handleChange('father_mobile', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PROFESSION</label>
              <input type="text" placeholder="Profession" value={formData.father_profession} onChange={(e) => handleChange('father_profession', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">INCOME</label>
              <input type="text" placeholder="Income" value={formData.father_income} onChange={(e) => handleChange('father_income', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
          </div>
        </div>

        {/* 4. Mother Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center">4</span>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Mother Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOTHER NAME</label>
              <input type="text" placeholder="Mother Name" value={formData.mother_name} onChange={(e) => handleChange('mother_name', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOTHER NATIONAL ID</label>
              <input type="text" placeholder="Mother National ID" value={formData.mother_national_id} onChange={(e) => handleChange('mother_national_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OCCUPATION</label>
              <input type="text" placeholder="Occupation" value={formData.mother_occupation} onChange={(e) => handleChange('mother_occupation', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
              <input type="text" placeholder="Education" value={formData.mother_education} onChange={(e) => handleChange('mother_education', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NO</label>
              <input type="text" placeholder="Mobile No" value={formData.mother_mobile} onChange={(e) => handleChange('mother_mobile', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PROFESSION</label>
              <input type="text" placeholder="Profession" value={formData.mother_profession} onChange={(e) => handleChange('mother_profession', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">INCOME</label>
              <input type="text" placeholder="Income" value={formData.mother_income} onChange={(e) => handleChange('mother_income', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>
          </div>
        </div>

        {/* 5. Documents Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center">5</span>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Documents Upload</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Upload className="w-8 h-8 text-purple-500 mb-2" />
              <p className="text-xs font-bold text-slate-700 mb-1">Drag and drop or browse files to upload</p>
              <p className="text-[10px] text-slate-400 font-medium mb-3">PDF, JPG, PNG or DOC (Max 5MB)</p>
              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors flex items-center gap-1.5">
                Choose Files
                <input type="file" multiple onChange={handleDocUpload} className="hidden" />
              </label>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Uploaded Documents ({uploadedDocs.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.size}</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => deleteDoc(idx)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Reset & Update */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <button 
            type="button" 
            onClick={handleReset} 
            className="h-11 px-6 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" /> Reset
          </button>
          
          <button 
            type="submit" 
            disabled={saving} 
            className="h-11 px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {saving ? (isNewStudent ? 'Creating...' : 'Updating...') : (isNewStudent ? 'Create' : 'Update')}
          </button>
        </div>

      </form>
    </div>
  );
}