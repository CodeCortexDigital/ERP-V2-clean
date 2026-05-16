import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Eye, CheckCircle, XCircle, Clock, UserPlus, RefreshCw } from 'lucide-react';
import admissionService from '@/services/admission.service';
import { extractListData } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

export default function AdmissionsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await admissionService.getApplications();
      setApplications(extractListData(response.data));
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await admissionService.updateApplicationStatus(id, status);
      await fetchApplications();
      alert(`Application ${status}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const convertToStudent = async (id: string) => {
    if (!confirm('Convert this application to a student? They will be added to the students list.')) return;
    
    setActionLoading(id);
    try {
      const response = await admissionService.convertToStudent(id);
      alert(response.data.message);
      await fetchApplications();
      navigate('/education/students');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to convert to student');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'reviewing': return <Badge variant="info"><RefreshCw className="w-3 h-3 mr-1" />Reviewing</Badge>;
      case 'approved': return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'enrolled': return <Badge variant="success"><UserPlus className="w-3 h-3 mr-1" />Enrolled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionButtons = (app: any) => {
    switch (app.status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <button onClick={() => updateStatus(app.id, 'reviewing')} disabled={actionLoading === app.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">Start Review</button>
            <button onClick={() => updateStatus(app.id, 'rejected')} disabled={actionLoading === app.id} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">Reject</button>
          </div>
        );
      case 'reviewing':
        return (
          <div className="flex gap-2">
            <button onClick={() => updateStatus(app.id, 'approved')} disabled={actionLoading === app.id} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200">Approve</button>
            <button onClick={() => updateStatus(app.id, 'rejected')} disabled={actionLoading === app.id} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">Reject</button>
          </div>
        );
      case 'approved':
        return (
          <button onClick={() => convertToStudent(app.id)} disabled={actionLoading === app.id} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200 flex items-center gap-1">
            <UserPlus className="w-3 h-3" /> Convert to Student
          </button>
        );
      default:
        return <span className="text-xs text-gray-400">-</span>;
    }
  };

  const visibleApplications = applications.filter((a: any) => a.status !== 'enrolled');

  const stats = {
    total: applications.length,
    pending: applications.filter((a: any) => a.status === 'pending').length,
    reviewing: applications.filter((a: any) => a.status === 'reviewing').length,
    approved: applications.filter((a: any) => a.status === 'approved').length,
    enrolled: applications.filter((a: any) => a.status === 'enrolled').length,
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Admissions</h1><p className="text-gray-500">Manage student applications</p></div>
        <Button onClick={() => navigate('/education/admissions/new')} className="bg-blue-600 hover:bg-blue-700">+ New Application</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-gray-600">Total</p><p className="text-xl font-bold text-blue-700">{stats.total}</p></div>
        <div className="bg-yellow-50 rounded-xl p-3"><p className="text-xs text-gray-600">Pending</p><p className="text-xl font-bold text-yellow-700">{stats.pending}</p></div>
        <div className="bg-cyan-50 rounded-xl p-3"><p className="text-xs text-gray-600">Reviewing</p><p className="text-xl font-bold text-cyan-700">{stats.reviewing}</p></div>
        <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-gray-600">Approved</p><p className="text-xl font-bold text-green-700">{stats.approved}</p></div>
        <div className="bg-emerald-50 rounded-xl p-3"><p className="text-xs text-gray-600">Enrolled</p><p className="text-xl font-bold text-emerald-700">{stats.enrolled}</p></div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr><th className="p-3 text-left">App #</th><th className="p-3 text-left">Student Name</th><th className="p-3 text-left">Contact</th><th className="p-3 text-left">Applying For</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Submitted</th><th className="p-3 text-center">Actions</th></tr>
              </thead>
              <tbody>
                {visibleApplications.map((app: any) => (
                  <tr key={app.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs font-medium">{app.application_no}</td>
                    <td className="p-3"><p className="font-medium">{app.applicant?.full_name || 'N/A'}</p><p className="text-xs text-gray-400">{app.applicant?.email}</p></td>
                    <td className="p-3 text-gray-600">{app.applicant?.phone}</td>
                    <td className="p-3">{app.applicant?.applying_for_class}</td>
                    <td className="p-3">{getStatusBadge(app.status)}</td>
                    <td className="p-3 text-xs text-gray-500">{formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}</td>
                    <td className="p-3 text-center">{getActionButtons(app)}</td>
                  </tr>
                ))}
                {visibleApplications.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-500">No applications yet. Click "New Application" to get started.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


