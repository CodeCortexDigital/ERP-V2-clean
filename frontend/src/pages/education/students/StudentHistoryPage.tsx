import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, BookOpen, CreditCard, Users, Award,
  MessageSquare, FileText, Clock, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Filter, Search,
  Download, Printer, RefreshCw, User, Phone, MapPin,
  GraduationCap, DollarSign, Activity, Clock as ClockIcon,
  Loader2
} from 'lucide-react';
import studentService from '@/services/student.service';
import { extractListData } from '@/services/api';

interface HistoryItem {
  id: string;
  type: string;
  action: string;
  description: string;
  previous_value: any;
  new_value: any;
  performed_by: string;
  created_at: string;
  icon?: React.ReactNode;
  color?: string;
}

type FilterType = 'all' | 'academic' | 'fees' | 'attendance' | 'exams' | 'behavior' | 'communication' | 'profile' | 'documents';

export default function StudentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    academic: 0,
    fees: 0,
    attendance: 0,
    exams: 0,
    behavior: 0,
    communication: 0,
    profile: 0,
    documents: 0
  });

  useEffect(() => {
    if (id) {
      fetchStudentHistory();
    } else {
      toast.error('Student ID is required');
      navigate('/education/students');
    }
  }, [id]);

  const fetchStudentHistory = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await studentService.getById(id).catch(() => null);
      if (studentRes?.data) {
        setStudent(studentRes.data);
      } else {
        toast.error('Student not found');
        navigate('/education/students');
        return;
      }

      // Fetch student history - CORRECTED: Use studentService or direct API call with ID
      let historyData = [];
      try {
        // Try using studentService first
        const historyRes = await studentService.getHistory(id);
        historyData = extractListData(historyRes?.data?.results || historyRes?.data || []);
        console.log('📚 History data from API:', historyData);
      } catch (apiError) {
        console.log('History API error, using fallback:', apiError);
        // Use fallback sample data
        historyData = generateSampleHistory(studentRes?.data);
      }
      
      // Process and format history items
      const processedHistory = historyData.map((item: any) => {
        const type = item.action_type || item.type || 'general';
        const [icon, color] = getTypeIcon(type);
        return {
          id: item.id || `hist-${Date.now()}-${Math.random()}`,
          type: type,
          action: item.action || item.title || 'Activity',
          description: item.description || '',
          previous_value: item.previous_value || null,
          new_value: item.new_value || null,
          performed_by: item.performed_by_name || item.performed_by || 'System',
          created_at: item.created_at || item.timestamp || new Date().toISOString(),
          icon,
          color
        };
      });

      // If no history from API, generate sample history for demo
      const finalHistory = processedHistory.length > 0 ? processedHistory : generateSampleHistory(studentRes?.data);
      
      setHistory(finalHistory);
      calculateStats(finalHistory);
      setFilteredHistory(finalHistory);
      
    } catch (error) {
      console.error('Error fetching student history:', error);
      toast.error('Failed to load student history');
      
      // Generate sample history for demo if API fails
      const sampleHistory = generateSampleHistory(student);
      setHistory(sampleHistory);
      calculateStats(sampleHistory);
      setFilteredHistory(sampleHistory);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string): [React.ReactNode, string] => {
    const icons: Record<string, [React.ReactNode, string]> = {
      'promotion': [<TrendingUp className="w-4 h-4" />, 'bg-emerald-100 text-emerald-600'],
      'fee_payment': [<CreditCard className="w-4 h-4" />, 'bg-green-100 text-green-600'],
      'fee_default': [<AlertCircle className="w-4 h-4" />, 'bg-red-100 text-red-600'],
      'attendance': [<Calendar className="w-4 h-4" />, 'bg-blue-100 text-blue-600'],
      'exam': [<Award className="w-4 h-4" />, 'bg-purple-100 text-purple-600'],
      'grade': [<BookOpen className="w-4 h-4" />, 'bg-indigo-100 text-indigo-600'],
      'behavior': [<Users className="w-4 h-4" />, 'bg-orange-100 text-orange-600'],
      'communication': [<MessageSquare className="w-4 h-4" />, 'bg-cyan-100 text-cyan-600'],
      'profile': [<User className="w-4 h-4" />, 'bg-slate-100 text-slate-600'],
      'document': [<FileText className="w-4 h-4" />, 'bg-amber-100 text-amber-600'],
      'admission': [<GraduationCap className="w-4 h-4" />, 'bg-purple-100 text-purple-600'],
      'fee_discount': [<DollarSign className="w-4 h-4" />, 'bg-yellow-100 text-yellow-600'],
      'section_change': [<Users className="w-4 h-4" />, 'bg-blue-100 text-blue-600'],
    };
    return icons[type] || [<Clock className="w-4 h-4" />, 'bg-slate-100 text-slate-600'];
  };

  const calculateStats = (items: HistoryItem[]) => {
    const newStats = {
      total: items.length,
      academic: items.filter(i => ['promotion', 'grade', 'section_change'].includes(i.type)).length,
      fees: items.filter(i => ['fee_payment', 'fee_default', 'fee_discount'].includes(i.type)).length,
      attendance: items.filter(i => i.type === 'attendance').length,
      exams: items.filter(i => i.type === 'exam').length,
      behavior: items.filter(i => i.type === 'behavior').length,
      communication: items.filter(i => i.type === 'communication').length,
      profile: items.filter(i => i.type === 'profile').length,
      documents: items.filter(i => i.type === 'document').length
    };
    setStats(newStats);
  };

  const generateSampleHistory = (studentData: any): HistoryItem[] => {
    const name = studentData?.full_name || studentData?.name || 'Student';
    const regNo = studentData?.student_id || 'STU0001';
    const now = new Date();
    
    return [
      {
        id: '1',
        type: 'admission',
        action: 'Student Admitted',
        description: `${name} was admitted to the school.`,
        previous_value: null,
        new_value: { class: 'Grade 1A', registration: regNo },
        performed_by: 'Admin',
        created_at: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <GraduationCap className="w-4 h-4" />,
        color: 'bg-purple-100 text-purple-600'
      },
      {
        id: '2',
        type: 'promotion',
        action: 'Promoted to Grade 2A',
        description: `${name} successfully promoted to Grade 2A.`,
        previous_value: { class: 'Grade 1A' },
        new_value: { class: 'Grade 2A' },
        performed_by: 'Academic Admin',
        created_at: new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'bg-emerald-100 text-emerald-600'
      },
      {
        id: '3',
        type: 'fee_payment',
        action: 'Fee Payment Received',
        description: `Monthly tuition fee of PKR 5,000 received.`,
        previous_value: { balance: 'PKR 5,000' },
        new_value: { balance: 'PKR 0' },
        performed_by: 'Finance Department',
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <CreditCard className="w-4 h-4" />,
        color: 'bg-green-100 text-green-600'
      },
      {
        id: '4',
        type: 'exam',
        action: 'Exam Results Published',
        description: `Mid-term exam results: Maths: 85%, English: 78%, Science: 92%`,
        previous_value: null,
        new_value: { maths: 85, english: 78, science: 92 },
        performed_by: 'Exam Department',
        created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <Award className="w-4 h-4" />,
        color: 'bg-purple-100 text-purple-600'
      },
      {
        id: '5',
        type: 'behavior',
        action: 'Behavior Rating',
        description: `Rated ${name} as "Excellent" in teamwork.`,
        previous_value: { rating: 'Good' },
        new_value: { rating: 'Excellent' },
        performed_by: 'Class Teacher',
        created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <Users className="w-4 h-4" />,
        color: 'bg-orange-100 text-orange-600'
      },
      {
        id: '6',
        type: 'profile',
        action: 'Profile Updated',
        description: `Contact information updated.`,
        previous_value: { phone: '+92 300 9876543' },
        new_value: { phone: '+92 300 1234567' },
        performed_by: 'Parent',
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        icon: <User className="w-4 h-4" />,
        color: 'bg-slate-100 text-slate-600'
      }
    ];
  };

  const handleFilterChange = (filterType: FilterType) => {
    setFilter(filterType);
    let filtered = history;
    
    if (filterType !== 'all') {
      const typeMap: Record<FilterType, string[]> = {
        'all': [],
        'academic': ['promotion', 'grade', 'section_change'],
        'fees': ['fee_payment', 'fee_default', 'fee_discount'],
        'attendance': ['attendance'],
        'exams': ['exam'],
        'behavior': ['behavior'],
        'communication': ['communication'],
        'profile': ['profile'],
        'documents': ['document']
      };
      filtered = history.filter(item => typeMap[filterType].includes(item.type));
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredHistory(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    let filtered = history;
    
    if (filter !== 'all') {
      const typeMap: Record<FilterType, string[]> = {
        'all': [],
        'academic': ['promotion', 'grade', 'section_change'],
        'fees': ['fee_payment', 'fee_default', 'fee_discount'],
        'attendance': ['attendance'],
        'exams': ['exam'],
        'behavior': ['behavior'],
        'communication': ['communication'],
        'profile': ['profile'],
        'documents': ['document']
      };
      filtered = history.filter(item => typeMap[filter].includes(item.type));
    }
    
    if (term) {
      filtered = filtered.filter(item => 
        item.action.toLowerCase().includes(term.toLowerCase()) ||
        item.description.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    setFilteredHistory(filtered);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatValue = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
    }
    return String(value);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.success('Export started!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading student history...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700">Student Not Found</h3>
          <p className="text-sm text-slate-500">The student you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/education/students')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12 print:bg-white print:p-0">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/education/students/${id}`)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Student History</h1>
            {student && (
              <p className="text-xs text-slate-500">
                {student.full_name} • {student.student_id}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStudentHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100">
            <img 
              src={student.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=4C469D&color=fff&size=128&bold=true`} 
              alt={student.full_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=4C469D&color=fff&size=128&bold=true`;
              }}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{student.full_name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>📋 {student.student_id}</span>
              <span>📚 {student.class_name || student.current_class || 'N/A'}</span>
              <span>📅 {student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${student.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {student.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 print:hidden">
        <StatCard label="Total" value={stats.total} icon={<Clock className="w-4 h-4" />} color="bg-purple-50 text-purple-600" />
        <StatCard label="Academic" value={stats.academic} icon={<BookOpen className="w-4 h-4" />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Fees" value={stats.fees} icon={<CreditCard className="w-4 h-4" />} color="bg-green-50 text-green-600" />
        <StatCard label="Attendance" value={stats.attendance} icon={<Calendar className="w-4 h-4" />} color="bg-blue-50 text-blue-600" />
        <StatCard label="Exams" value={stats.exams} icon={<Award className="w-4 h-4" />} color="bg-purple-50 text-purple-600" />
        <StatCard label="Other" value={stats.total - stats.academic - stats.fees - stats.attendance - stats.exams} icon={<Activity className="w-4 h-4" />} color="bg-slate-50 text-slate-600" />
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterButton label="All" active={filter === 'all'} onClick={() => handleFilterChange('all')} />
            <FilterButton label="Academic" active={filter === 'academic'} onClick={() => handleFilterChange('academic')} />
            <FilterButton label="Fees" active={filter === 'fees'} onClick={() => handleFilterChange('fees')} />
            <FilterButton label="Attendance" active={filter === 'attendance'} onClick={() => handleFilterChange('attendance')} />
            <FilterButton label="Exams" active={filter === 'exams'} onClick={() => handleFilterChange('exams')} />
            <FilterButton label="Behavior" active={filter === 'behavior'} onClick={() => handleFilterChange('behavior')} />
            <FilterButton label="Communication" active={filter === 'communication'} onClick={() => handleFilterChange('communication')} />
            <FilterButton label="Profile" active={filter === 'profile'} onClick={() => handleFilterChange('profile')} />
            <FilterButton label="Documents" active={filter === 'documents'} onClick={() => handleFilterChange('documents')} />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-purple-600" />
            Activity Timeline
            <span className="text-xs font-normal text-slate-400 ml-2">
              ({filteredHistory.length} events)
            </span>
          </h3>
        </div>

        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No history found</p>
              <p className="text-xs">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            filteredHistory.map((item, index) => (
              <TimelineItem 
                key={item.id || index}
                item={item}
                formatDate={formatDate}
                formatValue={formatValue}
                isLast={index === filteredHistory.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-black text-slate-800">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
        active 
          ? 'bg-purple-600 text-white shadow-sm' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function TimelineItem({ 
  item, 
  formatDate, 
  formatValue,
  isLast 
}: { 
  item: HistoryItem; 
  formatDate: (date: string) => string;
  formatValue: (value: any) => string;
  isLast: boolean;
}) {
  return (
    <div className={`p-4 hover:bg-slate-50/50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-2 rounded-full flex-shrink-0 ${item.color || 'bg-slate-100 text-slate-600'}`}>
          {item.icon || <Clock className="w-4 h-4" />}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-slate-800">{item.action}</h4>
              {item.description && (
                <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
              )}
              {(item.previous_value || item.new_value) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px]">
                  {item.previous_value && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="font-medium">Before:</span>
                      <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                        {formatValue(item.previous_value)}
                      </span>
                    </span>
                  )}
                  {item.previous_value && item.new_value && (
                    <TrendingDown className="w-3 h-3 text-slate-400" />
                  )}
                  {item.new_value && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="font-medium">After:</span>
                      <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                        {formatValue(item.new_value)}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end text-right flex-shrink-0">
              <span className="text-[10px] font-medium text-slate-400">
                {formatDate(item.created_at)}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5">
                By: {item.performed_by}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}