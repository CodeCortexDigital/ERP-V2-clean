import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Plus, Trash2, Edit3, RefreshCw, Eye, Hexagon, FileText
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';
import AddStudentPage from './students/AddStudentPage';

interface StudentItem {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  profile_picture?: string;
}

export default function StudentsListPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isNewStudentAction = location.search.includes('action=new');

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    fetchStudentsAndClasses();
  }, [location.search]);

  const handleSeedStudentsInline = (classList: any[], studentList: any[]) => {
    const boysFirst = ['Muhammad', 'Ahmed', 'Hamza', 'Bilal', 'Umar', 'Usman', 'Ali', 'Zain', 'Mustafa', 'Haris', 'Daniyal', 'Waleed', 'Shahzad', 'Zeeshan', 'Arsalan'];
    const girlsFirst = ['Ayesha', 'Fatima', 'Zainab', 'Maryam', 'Hania', 'Noor', 'Sarah', 'Alizeh', 'Sadia', 'Sana', 'Hina', 'Kiran', 'Nida', 'Laiba', 'Dua'];
    const lastNames = ['Khan', 'Ali', 'Ahmed', 'Raza', 'Siddiqui', 'Malik', 'Hussain', 'Akbar', 'Farooq', 'Tariq', 'Mahmood', 'Shah', 'Nawaz', 'Ghani', 'Kamal'];

    const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
    
    const regNumbers = [...studentList, ...customStudents].map(s => {
      const reg = s.student_id || s.registration_no || '';
      const num = parseInt(reg.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    });
    const maxReg = Math.max(0, ...regNumbers);
    let nextRegNo = maxReg > 0 ? maxReg + 1 : 100;

    const newStudents: any[] = [];
    
    const boyAvatars = [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150'
    ];
    
    const girlAvatars = [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150'
    ];

    if (classList.length === 0) return;

    classList.forEach(cls => {
      const className = cls.name;
      for (let i = 0; i < 5; i++) {
        const isBoy = i % 2 === 0;
        const firstName = isBoy 
          ? boysFirst[Math.floor(Math.random() * boysFirst.length)]
          : girlsFirst[Math.floor(Math.random() * girlsFirst.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const fullName = `${firstName} ${lastName}`;
        const regStr = String(nextRegNo).padStart(3, '0');
        nextRegNo++;

        const avatar = isBoy
          ? boyAvatars[Math.floor(Math.random() * boyAvatars.length)]
          : girlAvatars[Math.floor(Math.random() * girlAvatars.length)];

        const birthYear = 2012 + Math.floor(Math.random() * 5);
        const birthMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
        const birthDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');

        newStudents.push({
          id: `std-seed-${Date.now()}-${nextRegNo}`,
          student_id: regStr,
          full_name: fullName,
          class_name: className,
          profile_picture: avatar,
          admission_date: new Date().toISOString().split('T')[0],
          phone: `+9230${Math.floor(10 + Math.random() * 90)}${Math.floor(100000 + Math.random() * 900000)}`,
          father_name: `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
          mother_name: `${girlsFirst[Math.floor(Math.random() * girlsFirst.length)]} Bibi`,
          date_of_birth: `${birthYear}-${birthMonth}-${birthDay}`,
          gender: isBoy ? 'Male' : 'Female',
          address: 'Lahore, Pakistan',
          blood_group: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
          orphan_student: 'No',
          religion: 'Islam',
          select_family: '',
          total_siblings: '2'
        });
      }
    });

    const updatedCustom = [...customStudents, ...newStudents];
    localStorage.setItem('custom_students', JSON.stringify(updatedCustom));
    toast.success(`Successfully added ${newStudents.length} students across all ${classList.length} classes!`);
    fetchStudentsAndClasses();
  };

  const handleSeedStudents = () => {
    handleSeedStudentsInline(classes, students);
  };

  const fetchStudentsAndClasses = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        studentService.getAll().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] }))
      ]);

      const rawStudents = extractListData<any>(studentsRes.data || []);
      const rawClasses = extractListData<any>(classesRes.data || []);

      const defaultClasses = [
        { id: 'cls-1', name: 'Grade 1-A' },
        { id: 'cls-2', name: 'Grade 1-B' }
      ];

      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const combinedClassesRaw = [...(rawClasses.length > 0 ? rawClasses : defaultClasses), ...customClasses];
      const deletedClassIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      const finalClasses = combinedClassesRaw.filter(c => !deletedClassIds.includes(c.id));

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

      const defaultStudents = [
        { 
          id: 'std-1', 
          student_id: '001', 
          full_name: 'Urwah', 
          class_name: 'Grade 1-A',
          profile_picture: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150' 
        }
      ];

      // Filter out seeded dummy students from local custom_students list
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const filteredCustomStudents = customStudents.filter((s: any) => s.id && !s.id.startsWith('std-seed-'));
      localStorage.setItem('custom_students', JSON.stringify(filteredCustomStudents));

      const combinedRaw = [...(rawStudents.length > 0 ? rawStudents : defaultStudents), ...filteredCustomStudents];

      const mappedStudents = combinedRaw.map(s => ({
        id: s.id || `std-${Math.random()}`,
        student_id: s.student_id || s.registration_no || '001',
        full_name: s.full_name || s.name || 'Student',
        class_name: s.class_name || s.current_class_name || 'Grade 1-A',
        profile_picture: s.profile_picture || s.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'
      }));

      // Deduplicate students by ID
      const uniqueStudents: any[] = [];
      const seenStudentIds = new Set();
      mappedStudents.forEach(s => {
        if (s.id && !seenStudentIds.has(s.id)) {
          seenStudentIds.add(s.id);
          uniqueStudents.push(s);
        }
      });

      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const finalStudents = uniqueStudents.filter(s => !deletedIds.includes(s.id));

      setStudents(finalStudents);

      // Disable automatic seeding by setting version flag to true
      localStorage.setItem('automatic_students_seeded_v1', 'true');
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await studentService.delete(id);
    } catch (err) {
      console.log('Backend delete fallback triggered');
    }

    const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('deleted_student_ids', JSON.stringify(deletedIds));
    }

    const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
    const updatedCustom = customStudents.filter((s: any) => s.id !== id);
    localStorage.setItem('custom_students', JSON.stringify(updatedCustom));

    setStudents(prev => prev.filter(s => s.id !== id));
    toast.success(`${name} deleted permanently`);
  };

  if (isNewStudentAction) {
    return <AddStudentPage />;
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.student_id.includes(searchTerm);
    const matchesClass = !selectedClass || s.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/dashboard')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">All Students</span>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchStudentsAndClasses} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>
      </div>

      {/* Filter Bar Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SEARCH STUDENT</label>
            <Input 
              placeholder="Type student name or reg number.." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="text-xs h-11 rounded-xl border-slate-200 bg-white" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FILTER BY CLASS</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            >
              <option value="">-- Select a class --</option>
              {classes.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={() => navigate('/education/students/add')} 
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-2">
        {filteredStudents.map((std) => (
          <div key={std.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col items-center text-center space-y-3 relative hover:shadow-md transition-all">
            {/* Circular Avatar Image - Clickable to Student Report */}
            <div 
              onClick={() => navigate(`/education/students/${std.id}`)}
              className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img src={std.profile_picture} alt={std.full_name} className="w-full h-full object-cover" />
            </div>

            {/* Name & Reg No - Clickable to Student Report */}
            <div onClick={() => navigate(`/education/students/${std.id}`)} className="cursor-pointer group">
              <h3 className="font-bold text-sm text-slate-800 group-hover:text-purple-600 transition-colors">{std.full_name}</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">{std.student_id}</p>
            </div>

            {/* Bottom Row of Action Buttons */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {/* View Student Report */}
              <button 
                onClick={() => navigate(`/education/students/${std.id}`)}
                className="w-8 h-8 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors"
                title="View Student Report"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* View Admission Letter */}
              <button 
                onClick={() => navigate(`/education/students/admission-letter?id=${std.id}`)}
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                title="View Admission Letter"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Edit */}
              <button 
                onClick={() => navigate(`/education/students/${std.id}/edit`)}
                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                title="Edit Student"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button 
                onClick={() => handleDeleteStudent(std.id, std.full_name)}
                className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors"
                title="Delete Student"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Rightmost Dashed Add New Student Card */}
        <div 
          onClick={() => navigate('/education/students/add')} 
          className="bg-white rounded-2xl p-6 border-2 border-dashed border-slate-200 hover:border-purple-400 flex flex-col items-center justify-center text-center cursor-pointer min-h-[180px] transition-all group shadow-2xs"
        >
          <div className="w-12 h-12 rounded-full bg-purple-600 group-hover:bg-purple-700 text-white flex items-center justify-center shadow-md mb-2 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-xs">Add New</h3>
          <p className="text-[11px] text-slate-400">Student</p>
        </div>
      </div>
    </div>
  );
}
