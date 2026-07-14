import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, ArrowLeft, RotateCcw, Check, Upload, Trash2, FileText, ChevronDown, ChevronRight, User, X
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

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    student_name: '',
    registration_no: '',
    class_name: '',
    date_of_admission: getTodayDate(),
    discount_in_fee: '',
    mobile_sms: '',
    profile_picture: '',
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

  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);

  useEffect(() => {
    const isNew = !id || id === 'new';
    setIsNewStudent(isNew);
    
    if (isNew) {
      setLoading(false);
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
      const cRes = await academicService.getClasses().catch(() => ([]));
      let rawClasses = [];
      if (Array.isArray(cRes)) {
        rawClasses = cRes;
      } else if (cRes?.data) {
        rawClasses = Array.isArray(cRes.data) ? cRes.data : cRes.data?.results || [];
      } else if (cRes?.results) {
        rawClasses = cRes.results;
      } else {
        rawClasses = [];
      }
      
      const finalClasses = rawClasses.filter((c: any) => c && c.id && c.name);
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

      if (id && !id.startsWith('std-')) {
        const res = await studentService.getById(id).catch(() => null);
        const studentData = res?.data;
        
        if (studentData) {
          let className = studentData.class_name || 
                          studentData.current_class_name || 
                          studentData.current_class || 
                          '';
          
          if (typeof className === 'object' && className !== null) {
            className = className.name || '';
          }
          
          if (className && !uniqueClasses.find(c => c.name === className)) {
            const foundClass = uniqueClasses.find(c => c.id === studentData.current_class);
            if (foundClass) {
              className = foundClass.name;
            }
          }
          
          if (!className && studentData.current_class) {
            const foundClass = uniqueClasses.find(c => c.id === studentData.current_class);
            if (foundClass) {
              className = foundClass.name;
            }
          }
          
          const s = studentData;
          const profilePic = s.profile_picture && !s.profile_picture.includes('unsplash') 
            ? s.profile_picture 
            : '';
          
          setFormData({
            student_name:      s.full_name        ?? s.student_name     ?? '',
            registration_no:   s.student_id       ?? s.registration_no  ?? '',
            class_name:        className || '',
            date_of_admission: s.admission_date   ?? s.date_of_admission ?? getTodayDate(),
            discount_in_fee:   s.discount_in_fee  != null ? String(s.discount_in_fee) : '',
            mobile_sms:        s.phone            ?? s.mobile_sms       ?? '',
            profile_picture:   profilePic,
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

          if (profilePic) {
            setProfilePicturePreview(profilePic);
          }

          const savedDocs = localStorage.getItem(`docs_${id}`);
          if (savedDocs) {
            setUploadedDocs(JSON.parse(savedDocs));
          }
        }
      } else {
        setIsNewStudent(true);
        setFormData(prev => ({
          ...prev,
          date_of_admission: getTodayDate()
        }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load student data');
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
      setProfilePicturePreview('');
      setProfilePictureFile(null);
    } else {
      fetchClassesAndStudent();
    }
  };

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
          
          // Convert to JPEG with 80% quality
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
        setProfilePicturePreview(compressedBase64);
        setProfilePictureFile(file);
        setFormData(prev => ({ ...prev, profile_picture: compressedBase64 }));
        toast.success('Profile picture loaded successfully.');
      } catch (err) {
        console.error('Error compressing image:', err);
        toast.error('Failed to process image');
      }
    }
  };

  const handleRemoveImage = () => {
    setProfilePicturePreview('');
    setProfilePictureFile(null);
    setFormData(prev => ({ ...prev, profile_picture: '' }));
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

  const selectedClass = classes.find(c => c.name === formData.class_name);
  const classId = selectedClass?.id || null;

  // Create FormData for file upload
  const formDataToSend = new FormData();

  // Append all fields
  formDataToSend.append('full_name', formData.student_name);
  formDataToSend.append('student_id', formData.registration_no || `STU-${Date.now()}`);
  formDataToSend.append('email', `${formData.student_name.toLowerCase().replace(/\s+/g, '')}@school.edu`);
  formDataToSend.append('is_active', String(formData.status === 'Active'));
  
  if (formData.mobile_sms) formDataToSend.append('phone', formData.mobile_sms);
  if (formData.date_of_admission) formDataToSend.append('admission_date', formData.date_of_admission);
  if (classId) formDataToSend.append('current_class', classId);
  if (formData.gender) formDataToSend.append('gender', formData.gender);
  if (formData.address) formDataToSend.append('address', formData.address);
  if (formData.date_of_birth) formDataToSend.append('date_of_birth', formData.date_of_birth);
  if (formData.discount_in_fee) formDataToSend.append('discount_in_fee', formData.discount_in_fee);
  
  // Optional fields
  if (formData.identification_mark) formDataToSend.append('identification_mark', formData.identification_mark);
  if (formData.blood_group) formDataToSend.append('blood_group', formData.blood_group);
  if (formData.disease) formDataToSend.append('disease', formData.disease);
  if (formData.birth_form_id) formDataToSend.append('birth_form_id', formData.birth_form_id);
  if (formData.cast) formDataToSend.append('cast', formData.cast);
  if (formData.previous_school) formDataToSend.append('previous_school', formData.previous_school);
  if (formData.previous_id) formDataToSend.append('previous_id', formData.previous_id);
  if (formData.additional_note) formDataToSend.append('additional_note', formData.additional_note);
  if (formData.orphan_student) formDataToSend.append('orphan_student', formData.orphan_student);
  if (formData.osc) formDataToSend.append('osc', formData.osc);
  if (formData.religion) formDataToSend.append('religion', formData.religion);
  if (formData.select_family) formDataToSend.append('select_family', formData.select_family);
  if (formData.total_siblings) formDataToSend.append('total_siblings', formData.total_siblings);

  // Father fields
  if (formData.father_name) formDataToSend.append('father_name', formData.father_name);
  if (formData.father_national_id) formDataToSend.append('father_national_id', formData.father_national_id);
  if (formData.father_occupation) formDataToSend.append('father_occupation', formData.father_occupation);
  if (formData.father_education) formDataToSend.append('father_education', formData.father_education);
  if (formData.father_mobile) formDataToSend.append('father_mobile', formData.father_mobile);
  if (formData.father_profession) formDataToSend.append('father_profession', formData.father_profession);
  if (formData.father_income) formDataToSend.append('father_income', formData.father_income);

  // Mother fields
  if (formData.mother_name) formDataToSend.append('mother_name', formData.mother_name);
  if (formData.mother_national_id) formDataToSend.append('mother_national_id', formData.mother_national_id);
  if (formData.mother_occupation) formDataToSend.append('mother_occupation', formData.mother_occupation);
  if (formData.mother_education) formDataToSend.append('mother_education', formData.mother_education);
  if (formData.mother_mobile) formDataToSend.append('mother_mobile', formData.mother_mobile);
  if (formData.mother_profession) formDataToSend.append('mother_profession', formData.mother_profession);
  if (formData.mother_income) formDataToSend.append('mother_income', formData.mother_income);

  // Handle profile picture - send as file if uploaded, otherwise skip
  if (profilePictureFile) {
    // Convert base64 to Blob/File
    const response = await fetch(profilePicturePreview);
    const blob = await response.blob();
    const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
    formDataToSend.append('profile_picture', file);
  }

  // Log FormData contents for debugging
  console.log('📤 Sending FormData:');
  for (const [key, value] of formDataToSend.entries()) {
    console.log(`${key}: ${value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value}`);
  }

  try {
    let response = null;
    if (id && !isNewStudent && !id.startsWith('std-')) {
      // Use the service with FormData - you may need to modify studentService.update to accept FormData
      response = await studentService.updateWithFile(id, formDataToSend);
    } else if (isNewStudent) {
      response = await studentService.createWithFile(formDataToSend);
    }

    if (!response) {
      toast.error('Save failed — the server did not confirm the update. Check the console / backend logs.');
      setSaving(false);
      return;
    }

    toast.success(isNewStudent ? 'Student created successfully!' : 'Student record updated successfully!');
    
    setProfilePictureFile(null);
    
    setTimeout(() => {
      navigate('/education/students');
    }, 1500);
  } catch (err: any) {
    console.error('Error saving student:', err);
    
    const errorData = err.response?.data;
    console.log('📥 Error response:', errorData);
    
    if (errorData) {
      if (typeof errorData === 'object') {
        const errorMessages = [];
        for (const [field, message] of Object.entries(errorData)) {
          if (Array.isArray(message)) {
            errorMessages.push(`${field}: ${message.join(', ')}`);
          } else if (typeof message === 'string') {
            errorMessages.push(`${field}: ${message}`);
          }
        }
        if (errorMessages.length > 0) {
          toast.error(errorMessages[0]);
          console.error('Validation errors:', errorMessages);
        } else {
          toast.error('Failed to save student. Please check all fields.');
        }
      } else if (typeof errorData === 'string') {
        toast.error(errorData);
      } else {
        toast.error('Failed to save student. Please try again.');
      }
    } else if (err.message) {
      toast.error(err.message);
    } else {
      toast.error(isNewStudent ? 'Failed to create student.' : 'Failed to update student records.');
    }
  } finally {
    setSaving(false);
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
            <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">{number}</span>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">{title}</h2>
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
        {/* 1. Student Information - Always Expanded */}
        {renderSection('Student Information', 1, 'studentInfo', 
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Picture Column */}
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-3 border-r border-slate-100 pr-2">
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">PICTURE</label>
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 shadow-2xs">
                {profilePicturePreview || formData.profile_picture ? (
                  <img 
                    src={profilePicturePreview || formData.profile_picture} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <User className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                {profilePicturePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <label className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  {profilePicturePreview ? 'Change Image' : 'Choose Image'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="hidden" 
                  />
                </label>
                <span className="text-[10px] text-amber-500 font-medium">⚠️ Max size 2MB</span>
                {profilePicturePreview && (
                  <span className="text-[10px] text-emerald-500 font-medium">✅ Image loaded</span>
                )}
              </div>
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
                  {classes.length === 0 ? (
                    <option value="">No classes available</option>
                  ) : (
                    classes.map(c => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))
                  )}
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
          </div>,
          true
        )}

        {/* 2. Other Information - Collapsible */}
        {renderSection('Other Information', 2, 'otherInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ... (same as before) ... */}
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DATE OF BIRTH</label>
              <input type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">GENDER</label>
              <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">IDENTIFICATION MARK</label>
              <input type="text" value={formData.identification_mark} onChange={(e) => handleChange('identification_mark', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="e.g. Mole on left cheek" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">BLOOD GROUP</label>
              <select value={formData.blood_group} onChange={(e) => handleChange('blood_group', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select Blood Group</option>
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
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">DISEASE / MEDICAL CONDITION</label>
              <input type="text" value={formData.disease} onChange={(e) => handleChange('disease', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Any allergies or conditions" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ADDRESS</label>
              <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Full address" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">BIRTH FORM ID</label>
              <input type="text" value={formData.birth_form_id} onChange={(e) => handleChange('birth_form_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Birth certificate number" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CAST</label>
              <input type="text" value={formData.cast} onChange={(e) => handleChange('cast', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Cast/Community" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PREVIOUS SCHOOL</label>
              <input type="text" value={formData.previous_school} onChange={(e) => handleChange('previous_school', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Last school attended" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PREVIOUS STUDENT ID</label>
              <input type="text" value={formData.previous_id} onChange={(e) => handleChange('previous_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Previous school student ID" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ADDITIONAL NOTE</label>
              <input type="text" value={formData.additional_note} onChange={(e) => handleChange('additional_note', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Any additional notes" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ORPHAN STUDENT</label>
              <select value={formData.orphan_student} onChange={(e) => handleChange('orphan_student', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OSC</label>
              <input type="text" value={formData.osc} onChange={(e) => handleChange('osc', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="OSC number" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">RELIGION</label>
              <input type="text" value={formData.religion} onChange={(e) => handleChange('religion', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Religion" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FAMILY TYPE</label>
              <input type="text" value={formData.select_family} onChange={(e) => handleChange('select_family', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="e.g. Nuclear, Joint" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">TOTAL SIBLINGS</label>
              <input type="number" value={formData.total_siblings} onChange={(e) => handleChange('total_siblings', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Number of siblings" min="0" />
            </div>
          </div>
        )}

        {/* 3. Father/Guardian Information - Collapsible */}
        {renderSection('Father / Guardian Information', 3, 'fatherInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FATHER'S NAME</label>
              <input type="text" value={formData.father_name} onChange={(e) => handleChange('father_name', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Father's full name" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">NATIONAL ID</label>
              <input type="text" value={formData.father_national_id} onChange={(e) => handleChange('father_national_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="NID number" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OCCUPATION</label>
              <input type="text" value={formData.father_occupation} onChange={(e) => handleChange('father_occupation', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Occupation" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
              <input type="text" value={formData.father_education} onChange={(e) => handleChange('father_education', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Highest education" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NUMBER</label>
              <input type="text" value={formData.father_mobile} onChange={(e) => handleChange('father_mobile', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Father's mobile" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PROFESSION</label>
              <input type="text" value={formData.father_profession} onChange={(e) => handleChange('father_profession', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Profession" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ANNUAL INCOME</label>
              <input type="text" value={formData.father_income} onChange={(e) => handleChange('father_income', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Annual income" />
            </div>
          </div>
        )}

        {/* 4. Mother Information - Collapsible */}
        {renderSection('Mother Information', 4, 'motherInfo',
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOTHER'S NAME</label>
              <input type="text" value={formData.mother_name} onChange={(e) => handleChange('mother_name', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Mother's full name" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">NATIONAL ID</label>
              <input type="text" value={formData.mother_national_id} onChange={(e) => handleChange('mother_national_id', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="NID number" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">OCCUPATION</label>
              <input type="text" value={formData.mother_occupation} onChange={(e) => handleChange('mother_occupation', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Occupation" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">EDUCATION</label>
              <input type="text" value={formData.mother_education} onChange={(e) => handleChange('mother_education', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Highest education" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MOBILE NUMBER</label>
              <input type="text" value={formData.mother_mobile} onChange={(e) => handleChange('mother_mobile', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Mother's mobile" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PROFESSION</label>
              <input type="text" value={formData.mother_profession} onChange={(e) => handleChange('mother_profession', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Profession" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ANNUAL INCOME</label>
              <input type="text" value={formData.mother_income} onChange={(e) => handleChange('mother_income', e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs" placeholder="Annual income" />
            </div>
          </div>
        )}

        {/* 5. Documents Upload - Collapsible */}
        {renderSection('Documents Upload', 5, 'documents',
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-purple-300 transition-colors">
              <FileText className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-xs font-semibold text-slate-500">Drag & drop files here or click to upload</p>
              <label className="mt-3 px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload Documents
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" multiple onChange={handleDocUpload} className="hidden" />
              </label>
              <span className="mt-2 text-[10px] text-slate-400">Supported: PDF, DOC, DOCX, JPG, PNG</span>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uploaded Files ({uploadedDocs.length})</h3>
                {uploadedDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-slate-700">{doc.name}</span>
                      <span className="text-[10px] text-slate-400">({doc.size})</span>
                    </div>
                    <button type="button" onClick={() => deleteDoc(index)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
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