import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Mail, Phone, Calendar, BookOpen, 
  GraduationCap, MapPin, RefreshCw, Edit, Printer, 
  Download, AlertCircle, Loader2, History
} from 'lucide-react';
import studentService from '@/services/student.service';
import { extractListData } from '@/services/api';

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStudentData();
    } else {
      toast.error('Student ID is required');
      navigate('/education/students');
    }
  }, [id]);

  const fetchStudentData = async () => {
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

      // Fetch student history - FIXED: Use the correct URL with student ID
      try {
        // ✅ CORRECT: Use the student ID in the URL
        const historyRes = await studentService.getHistory(id);
        const historyData = extractListData(historyRes?.data?.results || historyRes?.data || []);
        setHistory(historyData);
      } catch (historyError) {
        console.log('No history data available');
        setHistory([]);
      }
      
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.success('Export started!');
  };

  const handleEdit = () => {
    navigate(`/education/students/${id}/edit`);
  };

  const handleViewHistory = () => {
    // Navigate to the dedicated history page
    navigate(`/education/students/${id}/history`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading student profile...</p>
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
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/education/students')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Student Profile</h1>
            <p className="text-xs text-slate-500">
              {student.full_name} • {student.student_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStudentData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={handleViewHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-200 bg-slate-100 flex-shrink-0">
              <img 
                src={student.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=4C469D&color=fff&size=128&bold=true`} 
                alt={student.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=4C469D&color=fff&size=128&bold=true`;
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-800">{student.full_name}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1">
                <span className="text-sm text-slate-500">📋 {student.student_id}</span>
                <span className="text-sm text-slate-500">📚 {student.class_name || student.current_class || 'N/A'}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${student.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {student.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{student.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{student.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>DOB: {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Admitted: {student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Gender: {student.gender || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{student.address || 'No address'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Father Info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <User className="w-4 h-4 text-purple-600" />
            Father / Guardian
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Name:</span> {student.father_name || 'N/A'}</p>
            <p><span className="text-slate-500">National ID:</span> {student.father_national_id || 'N/A'}</p>
            <p><span className="text-slate-500">Occupation:</span> {student.father_occupation || 'N/A'}</p>
            <p><span className="text-slate-500">Education:</span> {student.father_education || 'N/A'}</p>
            <p><span className="text-slate-500">Mobile:</span> {student.father_mobile || 'N/A'}</p>
            <p><span className="text-slate-500">Income:</span> {student.father_income || 'N/A'}</p>
          </div>
        </div>

        {/* Mother Info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <User className="w-4 h-4 text-pink-600" />
            Mother
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Name:</span> {student.mother_name || 'N/A'}</p>
            <p><span className="text-slate-500">National ID:</span> {student.mother_national_id || 'N/A'}</p>
            <p><span className="text-slate-500">Occupation:</span> {student.mother_occupation || 'N/A'}</p>
            <p><span className="text-slate-500">Education:</span> {student.mother_education || 'N/A'}</p>
            <p><span className="text-slate-500">Mobile:</span> {student.mother_mobile || 'N/A'}</p>
            <p><span className="text-slate-500">Income:</span> {student.mother_income || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <BookOpen className="w-4 h-4 text-purple-600" />
          Additional Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <p><span className="text-slate-500">Blood Group:</span> {student.blood_group || 'N/A'}</p>
          <p><span className="text-slate-500">Religion:</span> {student.religion || 'N/A'}</p>
          <p><span className="text-slate-500">Cast:</span> {student.cast || 'N/A'}</p>
          <p><span className="text-slate-500">Identification Mark:</span> {student.identification_mark || 'N/A'}</p>
          <p><span className="text-slate-500">Total Siblings:</span> {student.total_siblings || '0'}</p>
          <p><span className="text-slate-500">Discount in Fee:</span> {student.discount_in_fee || '0%'}</p>
          <p><span className="text-slate-500">Previous School:</span> {student.previous_school || 'N/A'}</p>
          <p><span className="text-slate-500">Previous ID:</span> {student.previous_id || 'N/A'}</p>
          <p><span className="text-slate-500">Birth Form ID:</span> {student.birth_form_id || 'N/A'}</p>
        </div>
        {student.additional_note && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm"><span className="text-slate-500">Additional Note:</span> {student.additional_note}</p>
          </div>
        )}
      </div>
    </div>
  );
}