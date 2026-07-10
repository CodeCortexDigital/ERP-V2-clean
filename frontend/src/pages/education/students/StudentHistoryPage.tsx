import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, History, Clock, User, Mail, Phone, Calendar,
  Activity, RefreshCw, Loader2, AlertCircle, FileText
} from 'lucide-react';
import studentService from '@/services/student.service';
import { extractListData } from '@/services/api';

interface HistoryItem {
  id: string;
  action_type: string;
  action: string;
  description: string;
  timestamp: string;
  user: string;
  previous_value?: any;
  new_value?: any;
}

export default function StudentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchHistoryData();
    } else {
      toast.error('Student ID is required');
      navigate('/education/students');
    }
  }, [id]);

  const fetchHistoryData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await studentService.getById(id).catch(() => null);
      if (studentRes?.data) {
        setStudent(studentRes.data);
      }

      // Fetch student history
      const historyRes = await studentService.getHistory(id).catch(() => ({ data: { results: [] } }));
      const historyData = extractListData(historyRes?.data?.results || historyRes?.data || []);
      setHistory(historyData);

      // Fetch history summary
      try {
        const summaryRes = await studentService.getHistorySummary(id);
        setSummary(summaryRes?.data || {});
      } catch {
        setSummary({});
      }

    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading history...</p>
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
            onClick={() => navigate(`/education/students/${id}`)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Student History
            </h1>
            <p className="text-xs text-slate-500">
              {student?.full_name || 'Student'} • {student?.student_id || 'N/A'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchHistoryData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{summary?.total_actions || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {summary?.last_action ? formatDate(summary.last_action).split(',')[0] : 'N/A'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Last Activity</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {Object.keys(summary?.action_counts || {}).length || 0}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Action Types</p>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Activity Log
          </h3>
          <span className="text-xs text-slate-400">{history.length} records</span>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">
                        {item.action || item.action_type || 'Action'}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.user || 'System'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{item.description || 'No description'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDate(item.timestamp)}
                    </p>
                    {(item.previous_value || item.new_value) && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-purple-600 cursor-pointer hover:text-purple-700">
                          View Details
                        </summary>
                        <div className="mt-1 p-2 bg-slate-50 rounded text-xs font-mono text-slate-600 overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify({
                              previous: item.previous_value,
                              new: item.new_value
                            }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-sm font-bold text-slate-700">No History Records</h3>
            <p className="text-xs text-slate-500 mt-1">
              No activity has been logged for this student yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}