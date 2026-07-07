import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Download, Search, BookOpen } from 'lucide-react';
import studentService from '@/services/student.service';
import { toast } from 'sonner';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      let studentData: any = null;

      if (id) {
        // 1. Try direct backend lookup by ID / student_id (only if it is a real database ID)
        if (!id.startsWith('std-')) {
          try {
            const res = await studentService.getById(id);
            if (res?.data) {
              studentData = res.data;
            }
          } catch {
            console.log('Backend direct lookup failed, searching student list…');
          }
        }

        // 2. If direct lookup fails, search the full list (handles STU-xxx formats)
        if (!studentData && !id.startsWith('std-')) {
          try {
            const { default: api, extractListData } = await import('@/services/api');
            const listRes = await api.get(`/auth/students/?search=${encodeURIComponent(id)}`);
            const list = extractListData<any>(listRes.data || []);
            const match = list.find(
              (s: any) =>
                s.id === id ||
                s.student_id === id ||
                String(s.id) === String(id)
            );
            if (match) studentData = match;
          } catch {
            console.log('List search fallback also failed');
          }
        }

        // 3. localStorage fallback (for custom/offline students)
        if (!studentData) {
          const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
          const found = customStudents.find(
            (s: any) => s.id === id || s.student_id === id || String(s.id) === String(id)
          );
          if (found) studentData = found;
        }
      }

      if (studentData) {
        setStudent(studentData);
      } else {
        toast.error('Student not found');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const studentData = {
    name: student?.full_name || student?.name || '--',
    regNo: student?.student_id || student?.registration_no || '--',
    doa: student?.admission_date || student?.date_of_admission || '--',
    class: student?.class_name || student?.current_class_name || student?.current_class || '--',
    family: student?.select_family || '--',
    discount: student?.discount_in_fee ? `${student.discount_in_fee} %` : '0 %',
    dob: student?.date_of_birth || '--',
    gender: student?.gender || '--',
    identification: student?.identification_mark || '--',
    bloodGroup: student?.blood_group || '--',
    disease: student?.disease || '--',
    nic: student?.birth_form_id || student?.nic || '--',
    cast: student?.cast || '--',
    prevSchool: student?.previous_school || '--',
    prevRoll: student?.previous_id || '--',
    note: student?.additional_note || '--',
    orphan: student?.orphan_student || '--',
    osc: student?.osc || '--',
    religion: student?.religion || '--',
    siblings: student?.total_siblings || '--',
    father: student?.father_name || '--',
    mother: student?.mother_name || '--',
    address: student?.address || '--',
    phone: student?.phone || student?.mobile_sms || '--',
    avatar: (student?.profile_picture && !student.profile_picture.includes('unsplash'))
      ? student.profile_picture
      : null,
  };

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Top Breadcrumb Bar matching Reference 100% */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/students')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">Student Report</span>
        </div>

        <button 
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" /> Get PDF
        </button>
      </div>

      {/* Main Grid: Left Student Column & Right 4-Section Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: Student Bio & Details matching Reference 100% */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 bg-gradient-to-br from-purple-100 to-purple-200 shadow-xs flex items-center justify-center">
              {studentData.avatar ? (
                <img src={studentData.avatar} alt={studentData.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-purple-600">
                  {studentData.name !== '--' ? studentData.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-purple-700">{studentData.name}</h2>
          </div>

          {/* Top Info Grey Card */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Registration No</p>
              <p className="font-bold text-blue-600">↪ {studentData.regNo}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Admission</p>
              <p className="font-bold text-blue-600">↪ {studentData.doa}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Class</p>
              <p className="font-bold text-blue-600">↪ {studentData.class}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Family</p>
              <p className="font-bold text-slate-400">↪ {studentData.family}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Discount in Fee</p>
              <p className="font-bold text-blue-600">↪ {studentData.discount}</p>
            </div>
          </div>

          {/* Middle Field Items */}
          <div className="space-y-3 text-xs px-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Date Of Birth</p>
              <p className="font-bold text-blue-600">↪ {studentData.dob}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
              <p className="font-bold text-blue-600">↪ {studentData.gender}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Any Identification Mark?</p>
              <p className="font-bold text-slate-400">↪ {studentData.identification}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
              <p className="font-bold text-blue-600">↪ {studentData.bloodGroup}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Disease If Any?</p>
              <p className="font-bold text-slate-400">↪ {studentData.disease}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Student Birth Form ID / NIC</p>
              <p className="font-bold text-slate-400">↪ {studentData.nic}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cast</p>
              <p className="font-bold text-slate-400">↪ {studentData.cast}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Previous School</p>
              <p className="font-bold text-blue-600">↪ {studentData.prevSchool}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Previous ID / Board Roll No</p>
              <p className="font-bold text-blue-600">↪ {studentData.prevRoll}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Any Additional Note</p>
              <p className="font-bold text-slate-400">↪ {studentData.note}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Orphan Student</p>
              <p className="font-bold text-blue-600">↪ {studentData.orphan}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">OSC</p>
              <p className="font-bold text-slate-400">↪ {studentData.osc}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Religion</p>
              <p className="font-bold text-blue-600">↪ {studentData.religion}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Siblings</p>
              <p className="font-bold text-blue-600">↪ {studentData.siblings}</p>
            </div>
          </div>

          {/* Bottom Parents Info Grey Card */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Father Name</p>
              <p className="font-bold text-blue-600">↪ {studentData.father}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Mother Name</p>
              <p className="font-bold text-blue-600">↪ {studentData.mother}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
              <p className="font-bold text-blue-600">↪ {studentData.address}</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4-Grid Dashboard matching Reference 100% */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 1: Attendance Report */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-bold text-purple-700 text-sm">Attendance Report</h3>
              </div>

              {/* P/L/A Dots Legend */}
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 mb-6">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> P</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> L</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span> A</span>
              </div>

              {/* Center Rings */}
              <div className="flex items-center justify-center gap-8 my-4">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full border-4 border-rose-400 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-rose-500">0%</span>
                    <span className="text-[9px] text-slate-400 font-bold">Overall</span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full border-4 border-rose-400 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-rose-500">0%</span>
                    <span className="text-[9px] text-slate-400 font-bold">Jun 2026</span>
                  </div>
                </div>
              </div>

              {/* Pill Badges */}
              <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-500 mt-4">
                <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200">Today <strong className="text-slate-600 font-normal">NOT MARKED</strong></span>
                <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200">Yesterday <strong className="text-slate-600 font-normal">NOT MARKED</strong></span>
              </div>
            </div>

            {/* Bottom 3 Summary Cards */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="bg-blue-600 text-white p-3 rounded-xl space-y-1">
                <p className="text-[10px] font-bold tracking-wider uppercase">PRESENTS</p>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold">→</span>
                  <span className="text-lg font-black">0</span>
                </div>
                <p className="text-[9px] opacity-80 pt-1">This Month <span className="float-right">0</span></p>
              </div>

              <div className="bg-indigo-400 text-white p-3 rounded-xl space-y-1">
                <p className="text-[10px] font-bold tracking-wider uppercase">LEAVES</p>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold">→</span>
                  <span className="text-lg font-black">0</span>
                </div>
                <p className="text-[9px] opacity-80 pt-1">This Month <span className="float-right">0</span></p>
              </div>

              <div className="bg-rose-400 text-white p-3 rounded-xl space-y-1">
                <p className="text-[10px] font-bold tracking-wider uppercase">ABSENTS</p>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold">→</span>
                  <span className="text-lg font-black">0</span>
                </div>
                <p className="text-[9px] opacity-80 pt-1">This Month <span className="float-right">0</span></p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Examination Report matching Reference 100% */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[340px]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              <h3 className="font-bold text-purple-700 text-sm">Examination Report</h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-4">
              {/* Illustration */}
              <div className="w-44 h-32 flex items-center justify-center">
                <svg className="w-full h-full text-blue-500" viewBox="0 0 200 150" fill="none">
                  <rect x="40" y="80" width="120" height="8" rx="4" fill="#E2E8F0"/>
                  <path d="M70 40h60v40H70z" fill="#3B82F6" opacity="0.2"/>
                  <circle cx="100" cy="50" r="15" fill="#3B82F6"/>
                  <path d="M85 80c0-10 15-15 15-15s15 5 15 15" stroke="#1E293B" strokeWidth="3"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Search className="w-3.5 h-3.5" /> No Record Found.</p>
            </div>
          </div>

          {/* SECTION 2: Class Tests Report matching Reference 100% */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="font-bold text-purple-700 text-sm">Class Tests Report</h3>
            </div>

            <div className="space-y-6">
              {/* English */}
              <div className="flex items-center justify-between">
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-slate-600" /> English</h4>
                  <p className="text-[10px] font-bold text-rose-500">0%</p>
                  <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className="w-0 h-full bg-rose-400"></div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">● TOTAL CLASS TESTS (0)</p>
                  <p className="text-[10px] font-bold text-purple-500">● TOTAL MARKS (0)</p>
                  <p className="text-[10px] font-bold text-blue-500">● OBTAINED MARKS (0)</p>
                </div>

                <div className="w-24 h-24 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black text-slate-800">0%</span>
                  <span className="text-[10px] font-bold text-slate-400">score</span>
                </div>
              </div>

              {/* Maths */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-slate-600" /> Maths</h4>
                  <p className="text-[10px] font-bold text-rose-500">0%</p>
                  <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className="w-0 h-full bg-rose-400"></div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">● TOTAL CLASS TESTS (0)</p>
                  <p className="text-[10px] font-bold text-purple-500">● TOTAL MARKS (0)</p>
                  <p className="text-[10px] font-bold text-blue-500">● OBTAINED MARKS (0)</p>
                </div>

                <div className="w-24 h-24 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black text-slate-800">0%</span>
                  <span className="text-[10px] font-bold text-slate-400">score</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Fee Report matching Reference 100% */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[340px]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">4</span>
              <h3 className="font-bold text-purple-700 text-sm">Fee Report</h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-4">
              {/* Illustration */}
              <div className="w-44 h-32 flex items-center justify-center">
                <svg className="w-full h-full text-purple-500" viewBox="0 0 200 150" fill="none">
                  <rect x="40" y="80" width="120" height="8" rx="4" fill="#E2E8F0"/>
                  <path d="M70 40h60v40H70z" fill="#8B5CF6" opacity="0.2"/>
                  <circle cx="100" cy="50" r="15" fill="#8B5CF6"/>
                  <path d="M85 80c0-10 15-15 15-15s15 5 15 15" stroke="#1E293B" strokeWidth="3"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Search className="w-3.5 h-3.5" /> No Record Found.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}