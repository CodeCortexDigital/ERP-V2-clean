import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Award, Printer, Trash2, ShieldAlert, Plus, Search, 
  FileText, BookOpen, Calendar, Users, X, Check, HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface SavedCertificate {
  id: string;
  template: string;
  recipientType: 'student' | 'employee';
  recipientName: string;
  recipientDetails: any;
  customText: string;
  date: string;
}

export const ALL_TEMPLATES = [
  {
    name: 'Bonafide Certificate',
    category: 'Academic',
    badge: 'OFFICIAL',
    desc: 'Official certificate confirming that the student is currently enrolled in the institution.',
    isImportant: true
  },
  {
    name: 'Study Certificate',
    category: 'Academic',
    badge: 'ACADEMIC',
    desc: 'Confirms that the student is studying in a specific class, section, and academic session.'
  },
  {
    name: 'Promotion Certificate',
    category: 'Academic',
    badge: 'ACADEMIC',
    desc: 'Certifies that the student has been promoted to the next grade.'
  },
  {
    name: 'Completion Certificate',
    category: 'Academic',
    badge: 'ACADEMIC',
    desc: 'Issued after successful completion of a course, program, or academic year.'
  },
  {
    name: 'Graduation Certificate',
    category: 'Academic',
    badge: 'OFFICIAL',
    desc: 'Awarded upon successful completion of graduation requirements.'
  },
  {
    name: 'Merit Certificate',
    category: 'Achievement',
    badge: 'MERIT',
    desc: 'Awarded for outstanding academic performance and excellence.',
    isImportant: true
  },
  {
    name: 'Excellence Certificate',
    category: 'Achievement',
    badge: 'EXCELLENCE',
    desc: 'Recognizes exceptional performance in academics or extracurricular activities.'
  },
  {
    name: 'Participation Certificate',
    category: 'Achievement',
    badge: 'EVENT',
    desc: 'Awarded for participation in school events, competitions, workshops, or seminars.'
  },
  {
    name: 'Appreciation Certificate',
    category: 'Achievement',
    badge: 'APPRECIATION',
    desc: 'Presented in recognition of valuable contribution and dedication.'
  },
  {
    name: 'Best Student Award',
    category: 'Achievement',
    badge: 'AWARD',
    desc: 'Recognizes outstanding academic achievement, discipline, and leadership.'
  },
  {
    name: 'Perfect Attendance Certificate',
    category: 'Attendance',
    badge: 'PERFECT',
    desc: 'Awarded to students with 100% attendance during the academic session.',
    isImportant: true
  },
  {
    name: 'Attendance Recognition',
    category: 'Attendance',
    badge: 'ATTENDANCE',
    desc: 'Recognizes excellent attendance throughout the academic year.'
  },
  {
    name: 'Good Conduct Certificate',
    category: 'Discipline',
    badge: 'CONDUCT',
    desc: 'Certifies exemplary behavior, discipline, and positive conduct.'
  },
  {
    name: 'Discipline Certificate',
    category: 'Discipline',
    badge: 'DISCIPLINE',
    desc: 'Recognizes consistent discipline and adherence to school rules.'
  },
  {
    name: 'Science Fair Certificate',
    category: 'Event',
    badge: 'SCIENCE',
    desc: 'Awarded for participation or achievement in the school science fair.'
  },
  {
    name: 'Debate Competition Certificate',
    category: 'Event',
    badge: 'DEBATE',
    desc: 'Recognizes participation or achievement in debate competitions.'
  },
  {
    name: 'Cultural Event Certificate',
    category: 'Event',
    badge: 'CULTURAL',
    desc: 'Awarded for participation in cultural and artistic activities.'
  },
  {
    name: 'Volunteer Certificate',
    category: 'Event',
    badge: 'SERVICE',
    desc: 'Recognizes volunteer service and community engagement.'
  },
  {
    name: 'Fee Clearance Certificate',
    category: 'Administrative',
    badge: 'FINANCE',
    desc: 'Confirms that all outstanding fees have been paid.',
    isImportant: true
  },
  {
    name: 'Transfer Certificate (TC)',
    category: 'Administrative',
    badge: 'TRANSFER',
    desc: 'Official certificate issued when a student leaves the institution and transfers to another school.',
    isImportant: true
  },
  {
    name: 'No Objection Certificate (NOC)',
    category: 'Administrative',
    badge: 'NOC',
    desc: 'Official statement indicating the institution has no objection to the student\'s request.'
  },
  {
    name: 'Enrollment Certificate',
    category: 'Administrative',
    badge: 'ENROLLMENT',
    desc: 'Confirms student enrollment for visa, scholarship, or official documentation.'
  },
  {
    name: 'Employment Certificate',
    category: 'Staff',
    badge: 'EMPLOYMENT',
    desc: 'Official verification of staff employment with the institution.'
  },
  {
    name: 'Experience Certificate',
    category: 'Staff',
    badge: 'EXPERIENCE',
    desc: 'Certifies the employee\'s service duration and professional experience.',
    isImportant: true
  },
  {
    name: 'Appreciation Certificate (Staff)',
    category: 'Staff',
    badge: 'APPRECIATION',
    desc: 'Recognizes outstanding service and dedication by staff members.'
  },
  {
    name: 'Leave Certificate',
    category: 'Administrative',
    badge: 'LEAVE',
    desc: 'Official exit/leave authorization certificate for student or staff member.'
  },
  {
    name: 'Character Certificate',
    category: 'Academic',
    badge: 'CHARACTER',
    desc: 'Moral conduct and exemplary behavior certificate for high-performing students.'
  },
  {
    name: 'Sports Certificate',
    category: 'Event',
    badge: 'SPORTS',
    desc: 'Athletic merit and sports participation recognition certificate.'
  }
];

export const getCertificateWording = (
  template: string,
  recipientName: string,
  recipientDetails: any = {},
  date: string = '',
  customText: string = ''
) => {
  const father = recipientDetails.fatherName || 'N/A';
  const regNo = recipientDetails.regNo || 'N/A';
  const className = recipientDetails.className || 'N/A';
  const dob = recipientDetails.dob || 'N/A';
  const admissionDate = recipientDetails.admissionDate || 'N/A';
  const designation = recipientDetails.role || 'Staff Member';

  switch (template) {
    case 'Bonafide Certificate':
      return `This is to certify that ${recipientName}, son/daughter of ${father}, is a bonafide student of this institution. He/She is currently enrolled and studying in class ${className} under Admission/Registration number ${regNo} for the academic session 2026-2027. To the best of our knowledge, he/she bears an exemplary conduct and character.`;

    case 'Study Certificate':
      return `This is to certify that ${recipientName}, bearing registration number ${regNo}, is a regular student of this institution enrolled in class ${className} during the current academic session. During their period of study, their behavior and attendance have been highly commendable.`;

    case 'Promotion Certificate':
      return `This certifies that ${recipientName}, enrolled in class ${className} under registration number ${regNo}, has successfully fulfilled all academic promotion criteria and has been promoted to the next higher grade with effect from ${date}.`;

    case 'Completion Certificate':
      return `This is to certify that ${recipientName} has successfully completed the prescribed course of study and syllabus requirements for class ${className} at this institution for the academic year ending ${date}.`;

    case 'Graduation Certificate':
      return `This graduation certificate is proudly presented to ${recipientName} in recognition of their successful completion of all academic requirements and graduation criteria prescribed by this institution, awarded on this day ${date}.`;

    case 'Merit Certificate':
      return `This Certificate of Merit is awarded to ${recipientName} for outstanding academic performance, scholastic distinction, and maintaining high honors in class ${className} during the academic term.`;

    case 'Excellence Certificate':
      return `This Certificate of Excellence is proudly presented to ${recipientName} in recognition of their exceptional capabilities, superb dedication, and outstanding accomplishments in both academic and extracurricular domains.`;

    case 'Participation Certificate':
      return `This is to certify that ${recipientName} has actively participated in school events, competitions, workshops, and extracurricular seminars held on ${date}, demonstrating commendable spirit and enthusiasm.`;

    case 'Appreciation Certificate':
      return `This Certificate of Appreciation is awarded to ${recipientName} in grateful recognition of their valuable contributions, exemplary dedication, and service rendered to the school community.`;

    case 'Best Student Award':
      return `The Best Student Award is proudly conferred upon ${recipientName} in recognition of their unparalleled academic record, consistent discipline, peer leadership, and exemplary general behavior.`;

    case 'Perfect Attendance Certificate':
      return `This Perfect Attendance Certificate is awarded to ${recipientName} for maintaining 100% attendance during the academic term, demonstrating remarkable consistency, discipline, and dedication to learning.`;

    case 'Attendance Recognition':
      return `This certificate is presented to ${recipientName} in recognition of their excellent and consistent attendance record throughout the academic session ending on ${date}.`;

    case 'Good Conduct Certificate':
      return `This is to certify that ${recipientName}, bearing registration number ${regNo}, has demonstrated exemplary moral conduct, outstanding discipline, and polite behavior during their tenure at this school.`;

    case 'Discipline Certificate':
      return `This certificate is presented to ${recipientName} in recognition of consistent self-discipline, model behavior, and active cooperation in maintaining a positive school environment.`;

    case 'Science Fair Certificate':
      return `This is to certify that ${recipientName} has successfully participated in the School Science Exhibition and Fair on ${date}, presenting an innovative project titled: "${customText || 'Innovative Science Project'}".`;

    case 'Debate Competition Certificate':
      return `This certificate is awarded to ${recipientName} for outstanding performance and participation in the Inter-Class Debate Competition held on ${date}.`;

    case 'Cultural Event Certificate':
      return `This certificate is presented to ${recipientName} for their outstanding performance and creative contribution to the school's Cultural and Arts Festival.`;

    case 'Volunteer Certificate':
      return `This certificate of volunteer service is proudly presented to ${recipientName} in recognition of their selfless community support, volunteer hours, and noble dedication.`;

    case 'Fee Clearance Certificate':
      return `This is to certify that student ${recipientName}, bearing admission number ${regNo}, has fully cleared all academic fees, library dues, laboratory charges, and outstanding balances to date. No dues are pending.`;

    case 'Transfer Certificate (TC)':
      return `This is to certify that ${recipientName}, son/daughter of ${father}, bearing admission number ${regNo}, was a student of class ${className}. All school dues have been cleared. He/She has been granted permission to transfer to another institution due to ${customText || 'relocation/higher studies'}. His/Her conduct has been good.`;

    case 'No Objection Certificate (NOC)':
      return `This is to certify that this institution has no objection to student ${recipientName} applying for external courses, national examinations, scholarships, or transfer boards. We wish them all the best.`;

    case 'Enrollment Certificate':
      return `This is to verify that ${recipientName} is currently enrolled as a full-time student of this academy in class ${className} for official documentation purposes.`;

    case 'Employment Certificate':
      return `This is to certify that ${recipientName} is currently employed at this institution as ${designation}. His/Her employment commenced on ${admissionDate || date}. During their tenure, they have demonstrated high professional competence.`;

    case 'Experience Certificate':
      return `This Experience Certificate is awarded to ${recipientName} in recognition of their dedicated service as ${designation} at this school. During their employment tenure, their work ethic and teaching abilities were found to be outstanding.`;

    case 'Appreciation Certificate (Staff)':
      return `This Certificate of Appreciation is proudly presented to staff member ${recipientName} for their outstanding service, dedication, and professional excellence in contribution to the academy's growth.`;

    case 'Leave Certificate':
      return `This is to certify that ${recipientName}, son/daughter of ${father}, was a bonafide student of this institute. The student, bearing admission number ${regNo}, was enrolled in ${className} at the time of leaving. Born on ${dob}, the student was admitted to this institution on ${admissionDate} and left on ${date} due to ${customText || 'personal reasons'}. During their tenure, ${recipientName}'s conduct and behavior were found to be excellent.`;

    case 'Character Certificate':
      return `This is to certify that ${recipientName}, bearing registration number ${regNo}, was enrolled in class ${className}. He/She bears an excellent character, has demonstrated a keen interest in learning, and was active in all school extra-curricular activities. We certify his/her character to be exemplary.`;

    case 'Sports Certificate':
    default:
      return `This is to certify that ${recipientName} has successfully participated in the school athletic matches on ${date} and achieved outstanding merit results. Certified on behalf of eSkooly Academy.`;
  }
};

export default function CertificatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'generate';

  // Form states
  const [selectedTemplate, setSelectedTemplate] = useState('Bonafide Certificate');
  const [recipientType, setRecipientType] = useState<'student' | 'employee'>('student');
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [customText, setCustomText] = useState('For Official Purposes');
  const [certificateDate, setCertificateDate] = useState(new Date().toISOString().split('T')[0]);

  // Template Modal Browser states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('All');
  const [modalSearch, setModalSearch] = useState('');

  // Recipient lists loaded from DB
  const [students, setStudents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Saved Certificates state
  const [savedCertificates, setSavedCertificates] = useState<SavedCertificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecipients();
    loadSavedCertificates();
  }, []);

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      const [studentsRes, staffRes] = await Promise.all([
        api.get('/auth/students/').catch(() => ({ data: [] })),
        api.get('/auth/teachers/').catch(() => ({ data: [] }))
      ]);

      // Student merging
      const rawStudents = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data as any)?.results || [];
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const defaultStudents = [
        { id: 'std-1', student_id: '001', full_name: 'Urwah', class_name: 'Grade 1-A', father_name: 'Ahmed', date_of_birth: '2019-04-12', admission_date: '2023-09-01' },
        { id: 'std-2', student_id: '002', full_name: 'Sundas Azhar', class_name: 'Grade 8-B', father_name: 'Azhar', date_of_birth: '2012-10-23', admission_date: '2020-06-29' }
      ];
      const combinedStudents = [...(rawStudents.length > 0 ? rawStudents : defaultStudents), ...customStudents];
      const deletedStudentIds = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const finalStudents = combinedStudents
        .filter(s => !deletedStudentIds.includes(s.id))
        .map(s => ({
          id: s.id || `s-${Math.random()}`,
          name: s.full_name || s.name || 'Student',
          regNo: s.student_id || s.roll_number || s.registration_no || '001',
          className: s.class_name || s.current_class_name || 'Grade 1-A',
          fatherName: s.father_name || 'Ahmed',
          dob: s.date_of_birth || '2012-10-23',
          admissionDate: s.admission_date || '2020-06-29'
        }));
      setStudents(finalStudents);

      // Staff merging
      const rawStaff = Array.isArray(staffRes.data) ? staffRes.data : (staffRes.data as any)?.results || [];
      const defaultStaff = [
        { id: 'emp-1', employee_id: '101', name: 'Zainab Bibi', role: 'Teacher' },
        { id: 'emp-2', employee_id: '102', name: 'Muhammad Ali', role: 'Senior Clerk' }
      ];
      const combinedStaff = rawStaff.length > 0 ? rawStaff : defaultStaff;
      const finalStaff = combinedStaff.map((t: any) => ({
        id: t.id || `e-${Math.random()}`,
        name: t.name || t.full_name || 'Staff Member',
        regNo: t.employee_id || 'E101',
        role: t.role || 'Teacher'
      }));
      setEmployees(finalStaff);

      if (finalStudents.length > 0) {
        setSelectedRecipientId(finalStudents[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedCertificates = () => {
    const defaultSavedList: SavedCertificate[] = [
      {
        id: '12934',
        template: 'Bonafide Certificate',
        recipientType: 'student',
        recipientName: 'Sundas Azhar',
        recipientDetails: {
          regNo: '002',
          className: 'Grade 8-B',
          fatherName: 'Azhar',
          dob: '2012-10-23',
          admissionDate: '2020-06-29'
        },
        customText: 'Official Enrolment Verification',
        date: '2026-07-06'
      }
    ];

    const localList = localStorage.getItem('local_saved_certificates');
    if (localList) {
      setSavedCertificates(JSON.parse(localList));
    } else {
      localStorage.setItem('local_saved_certificates', JSON.stringify(defaultSavedList));
      setSavedCertificates(defaultSavedList);
    }
  };

  const handleRecipientTypeChange = (type: 'student' | 'employee') => {
    setRecipientType(type);
    if (type === 'student' && students.length > 0) {
      setSelectedRecipientId(students[0].id);
    } else if (type === 'employee' && employees.length > 0) {
      setSelectedRecipientId(employees[0].id);
    }
  };

  const handleGenerate = () => {
    const list = recipientType === 'student' ? students : employees;
    const selected = list.find(r => r.id === selectedRecipientId);
    if (!selected) {
      toast.error('Please select a recipient!');
      return;
    }

    // Add to saved certificates
    const newCert: SavedCertificate = {
      id: String(Math.floor(10000 + Math.random() * 90000)),
      template: selectedTemplate,
      recipientType,
      recipientName: selected.name,
      recipientDetails: selected,
      customText,
      date: certificateDate
    };

    const updated = [newCert, ...savedCertificates];
    localStorage.setItem('local_saved_certificates', JSON.stringify(updated));
    setSavedCertificates(updated);
    toast.success('Certificate logged and saved successfully!');
  };

  const handleDelete = (id: string) => {
    const updated = savedCertificates.filter(c => c.id !== id);
    localStorage.setItem('local_saved_certificates', JSON.stringify(updated));
    setSavedCertificates(updated);
    toast.success('Certificate deleted successfully!');
  };

  const triggerPrintPreview = (cert: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked! Please allow popups to print.');
      return;
    }

    const recipientDetails = cert.recipientDetails || {};
    const textDesc = getCertificateWording(
      cert.template,
      cert.recipientName,
      recipientDetails,
      cert.date,
      cert.customText
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Certificate - ${cert.recipientName}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body {
              font-family: 'Times New Roman', serif;
              background-color: #ffffff;
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .border-outer {
              border: 15px solid #1e293b;
              padding: 10px;
              width: 100%;
              height: 100%;
              box-sizing: border-box;
            }
            .border-inner {
              border: 5px solid #d97706;
              padding: 40px;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
              box-sizing: border-box;
              position: relative;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .title {
              font-size: 42px;
              font-weight: 900;
              color: #b45309;
              text-transform: uppercase;
              letter-spacing: 3px;
              margin: 10px 0;
            }
            .sub-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 5px;
            }
            .description {
              font-size: 18px;
              line-height: 1.8;
              color: #334155;
              max-w: 800px;
              margin: 25px auto;
            }
            .footer-row {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 30px;
            }
            .seal-box {
              width: 80px;
              height: 80px;
              border: 2px dashed #cbd5e1;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 10px;
              font-weight: bold;
              color: #94a3b8;
              text-transform: uppercase;
            }
            .sign-box {
              text-align: center;
              width: 180px;
            }
            .line {
              border-bottom: 2px solid #cbd5e1;
              margin-bottom: 5px;
              color: #1e293b;
              font-weight: bold;
              font-size: 14px;
            }
            .sign {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="border-outer">
            <div class="border-inner">
              <div class="sub-title">Certificate of Excellence</div>
              <div class="title">${cert.template}</div>
              <div class="logo">eSkooly Academy</div>
              <div class="description">${textDesc}</div>
              <div class="footer-row">
                <div class="seal-box">Official Seal</div>
                <div class="sign-box">
                  <div class="line">${cert.date}</div>
                  <div class="sign">Date of Issue</div>
                </div>
                <div class="sign-box">
                  <div class="line">Principal Signature</div>
                  <div class="sign">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const activeList = recipientType === 'student' ? students : employees;
  const activeRecipient = activeList.find(r => r.id === selectedRecipientId) || activeList[0] || null;

  const livePreview = activeRecipient ? {
    template: selectedTemplate,
    recipientType,
    recipientName: activeRecipient.name,
    recipientDetails: activeRecipient,
    customText,
    date: certificateDate
  } : null;

  const filteredSaved = savedCertificates.filter(c => {
    return c.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.template.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Academic': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'Achievement': return <Award className="w-4 h-4 text-yellow-500" />;
      case 'Attendance': return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'Discipline': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'Staff': return <Users className="w-4 h-4 text-indigo-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const filteredModalTemplates = ALL_TEMPLATES.filter(t => {
    const matchesCategory = modalCategory === 'All' || t.category === modalCategory;
    const matchesSearch = t.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                          t.desc.toLowerCase().includes(modalSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (tabParam === 'templates') {
    return (
      <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-855 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Certificates</span>
            <span>Templates Library</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Certificate Templates Library ({ALL_TEMPLATES.length})
              </h3>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-56 text-xs h-9 pl-9 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              {['All', 'Academic', 'Achievement', 'Attendance', 'Discipline', 'Event', 'Administrative', 'Staff'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setModalCategory(cat)}
                  className={`px-3.5 h-7.5 rounded-lg font-bold text-[10px] uppercase transition-colors ${
                    modalCategory === cat 
                      ? 'bg-amber-500 text-white shadow-xs' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-655'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* templates grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredModalTemplates.map((t, idx) => (
                <div key={idx} className="bg-slate-50/50 border border-slate-150 hover:border-amber-400 rounded-2xl p-6 transition-all duration-350 flex flex-col justify-between h-64 shadow-2xs hover:shadow-xs group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl group-hover:scale-105 transition-transform">
                        {getCategoryIcon(t.category)}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase">{t.badge}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-855 flex items-center gap-1.5">
                        {t.name}
                        {t.isImportant && <span className="text-amber-500">⭐</span>}
                      </h4>
                      <p className="text-xs text-slate-455 font-semibold leading-relaxed line-clamp-3">{t.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTemplate(t.name);
                      navigate('/education/certificates');
                      toast.success(`Selected template: ${t.name}`);
                    }}
                    className="w-full h-9 rounded-xl border border-slate-200 hover:border-amber-500 text-slate-600 hover:text-amber-700 font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-855 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Dashboard</span>
          <span>Certificates</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/education/certificates')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              tabParam === 'generate' ? 'bg-amber-500 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => navigate('/education/certificates/templates?tab=templates')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              tabParam === 'templates' ? 'bg-amber-500 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Templates Library
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Certificate Generator
            </h3>
          </div>

          <div className="space-y-4">
            {/* 1. Template select & selector modal button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase">Select Template*</label>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="text-[9px] font-extrabold text-blue-650 hover:underline flex items-center gap-1"
                >
                  📋 Browse Category Table
                </button>
              </div>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
              >
                {ALL_TEMPLATES.map((t) => (
                  <option key={t.name} value={t.name}>
                    [{t.category}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Recipient Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Recipient Type*</label>
              <select
                value={recipientType}
                onChange={(e) => handleRecipientTypeChange(e.target.value as any)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
              >
                <option value="student">Student</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            {/* 3. Dynamic Recipient list selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">
                Select {recipientType === 'student' ? 'Student' : 'Employee'}*
              </label>
              {loading ? (
                <div className="text-xs text-slate-400 font-bold animate-pulse">Loading recipients...</div>
              ) : (
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                >
                  {(recipientType === 'student' ? students : employees).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.regNo})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 4. Custom Text */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Custom Text (Reason / Project Title)*</label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Reason or additional note"
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            {/* 5. Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Date*</label>
              <input
                type="date"
                value={certificateDate}
                onChange={(e) => setCertificateDate(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            {/* Action Trigger Button */}
            <button
              onClick={handleGenerate}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 transition-all text-white font-extrabold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 mt-2"
            >
              <Award className="w-4 h-4" />
              Generate Certificate
            </button>
          </div>
        </div>

        {/* Right Preview Section */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50">
            Certificate Preview
          </h3>

          {!livePreview ? (
            <div className="border border-dashed border-slate-200 rounded-xl h-72 flex items-center justify-center text-center p-6 text-slate-400 font-bold text-xs">
              Select a template and recipient to preview the certificate.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-4 double border-amber-600 rounded-xl p-6 bg-slate-50/50 text-center space-y-4 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">eSkooly Academy Certificate</p>
                <h4 className="text-xl font-black text-amber-700 uppercase tracking-wider">
                  {livePreview.template}
                </h4>

                <p className="text-[11px] leading-relaxed text-slate-655 max-w-lg mx-auto font-medium whitespace-pre-line px-2">
                  {getCertificateWording(
                    livePreview.template,
                    livePreview.recipientName,
                    livePreview.recipientDetails,
                    livePreview.date,
                    livePreview.customText
                  )}
                </p>

                <div className="flex justify-between items-end pt-4 text-[9px] font-bold text-slate-400">
                  <div className="w-16 h-16 border border-slate-100 bg-white flex items-center justify-center font-bold text-[8px]">QR Code</div>
                  <div className="text-center">
                    <span className="block border-b border-slate-200 pb-1 text-slate-800">{livePreview.date}</span>
                    <span className="block text-[8px] uppercase tracking-wider mt-0.5">Date of Issue</span>
                  </div>
                  <div className="text-center w-24">
                    <span className="block border-b border-slate-200 pb-1 text-slate-800">Authorized Sign</span>
                    <span className="block text-[8px] uppercase tracking-wider mt-0.5">Authorized Signature</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => triggerPrintPreview(livePreview)}
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Certificate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Certificates Log list */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Saved Certificates
          </h4>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-455 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search saved logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs h-9.5 rounded-xl border border-slate-200 bg-white pl-9 pr-4 font-semibold text-slate-700 focus:outline-none w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-semibold text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-slate-400 text-[10px]">
              <tr>
                <th className="px-6 py-3.5 text-left">Template</th>
                <th className="px-6 py-3.5 text-left">Recipient Type</th>
                <th className="px-6 py-3.5 text-left">Recipient Name</th>
                <th className="px-6 py-3.5 text-left">Custom Details</th>
                <th className="px-6 py-3.5 text-left">Issue Date</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSaved.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No matching saved certificates logs.
                  </td>
                </tr>
              ) : (
                filteredSaved.map((cert) => (
                  <tr key={cert.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-extrabold text-slate-800">{cert.template}</td>
                    <td className="px-6 py-4 uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full ${cert.recipientType === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {cert.recipientType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-bold">{cert.recipientName}</td>
                    <td className="px-6 py-4 text-slate-455 truncate max-w-xs">{cert.customText}</td>
                    <td className="px-6 py-4 font-mono">{cert.date}</td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => triggerPrintPreview(cert)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Print Certificate"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Table Modal Dialog */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Select Certificate Template
                </h4>
                <p className="text-[11px] text-slate-450 font-bold">
                  Browse and pick from 28 categorized templates.
                </p>
              </div>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Category tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['All', 'Academic', 'Achievement', 'Attendance', 'Discipline', 'Event', 'Administrative', 'Staff'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setModalCategory(cat)}
                    className={`px-3 h-7 rounded-lg font-extrabold text-[9px] uppercase tracking-wider transition-colors ${
                      modalCategory === cat 
                        ? 'bg-amber-500 text-white shadow-xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-655 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full md:w-56 text-xs h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Modal Body: Scrollable Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-150 uppercase tracking-wider text-slate-400 text-[9px] font-black">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Template Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Badge</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModalTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">
                        No matching templates. Try changing filters.
                      </td>
                    </tr>
                  ) : (
                    filteredModalTemplates.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black uppercase text-slate-600">
                            {getCategoryIcon(t.category)}
                            {t.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-800">
                          {t.name}
                          {t.isImportant && <span className="ml-1 text-amber-500" title="Most Important">⭐</span>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-455 font-semibold leading-relaxed max-w-xs">{t.desc}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            t.badge === 'OFFICIAL' ? 'bg-rose-50 text-rose-700' :
                            t.badge === 'ACADEMIC' ? 'bg-blue-50 text-blue-700' :
                            t.badge === 'MERIT' || t.badge === 'EXCELLENCE' || t.badge === 'AWARD' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {t.badge}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedTemplate(t.name);
                              setShowTemplateModal(false);
                              toast.success(`Selected template: ${t.name}`);
                            }}
                            className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Select
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>Showing {filteredModalTemplates.length} of {ALL_TEMPLATES.length} templates</span>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
