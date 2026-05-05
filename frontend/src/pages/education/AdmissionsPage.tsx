import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Eye, Edit2, Trash2, CheckCircle, XCircle, 
  Clock, RefreshCw, Search, Filter, ChevronLeft, ChevronRight,
  GraduationCap, Mail, Phone, Calendar, MapPin, BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import admissionsService, { Applicant } from '@/services/admissions.service';
import studentService from '@/services/student.service';

export default function AdmissionsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    applying_for: '',
    date_of_birth: '',
    gender: 'male',
    address: '',
    city: '',
    previous_institution: '',
    previous_qualification: '',
    previous_percentage: ''
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const response = await admissionsService.getAll();
      setApplicants(response.data);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await admissionsService.updateStatus(id, status);
      fetchApplicants();
      alert(`Application ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleConvertToStudent = async (applicant: Applicant) => {
    if (!confirm(`Convert ${applicant.full_name} to a student?`)) return;
    
    try {
      const response = await admissionsService.convertToStudent(applicant.id);
      alert(`✅ ${applicant.full_name} has been converted to a student!`);
      fetchApplicants();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error converting to student:', error);
      alert('Failed to convert. Please try again.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete application for ${name}?`)) return;
    
    try {
      await admissionsService.delete(id);
      fetchApplicants();
      alert('Application deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await admissionsService.create(formData);
      alert('Application submitted successfully!');
      setShowForm(false);
      setFormData({
        first_name: '', last_name: '', email: '', phone: '', applying_for: '',
        date_of_birth: '', gender: 'male', address: '', city: '',
        previous_institution: '', previous_qualification: '', previous_percentage: ''
      });
      fetchApplicants();
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'new': return <Badge className="bg-blue-100 text-blue-700">🆕 New</Badge>;
      case 'reviewed': return <Badge className="bg-yellow-100 text-yellow-700">👀 Reviewed</Badge>;
      case 'accepted': return <Badge className="bg-green-100 text-green-700">✅ Accepted</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700">❌ Rejected</Badge>;
      case 'enrolled': return <Badge className="bg-purple-100 text-purple-700">🎓 Enrolled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.applicant_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedApplicants = filteredApplicants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
  const totalApplicants = filteredApplicants.length;
  const newCount = applicants.filter(a => a.status === 'new').length;
  const acceptedCount = applicants.filter(a => a.status === 'accepted').length;
  const enrolledCount = applicants.filter(a => a.status === 'enrolled').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admissions Management</h1>
          <p className="text-gray-500">Manage applicants and convert to students</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          New Application
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Total Applications</p>
          <p className="text-2xl font-bold text-blue-700">{totalApplicants}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">New Applications</p>
          <p className="text-2xl font-bold text-yellow-700">{newCount}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Accepted</p>
          <p className="text-2xl font-bold text-green-700">{acceptedCount}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Enrolled</p>
          <p className="text-2xl font-bold text-purple-700">{enrolledCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="enrolled">Enrolled</option>
        </select>
        <Button onClick={fetchApplicants} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Applicants Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Applying For</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Applied On</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApplicants.map((applicant) => (
                <tr key={applicant.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{applicant.applicant_id}</td>
                  <td className="px-4 py-3 font-medium">{applicant.full_name}</td>
                  <td className="px-4 py-3">{applicant.email}</td>
                  <td className="px-4 py-3">{applicant.applying_for}</td>
                  <td className="px-4 py-3">{getStatusBadge(applicant.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(applicant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => { setSelectedApplicant(applicant); setShowDetailModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-100"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      {applicant.status === 'accepted' && (
                        <button
                          onClick={() => handleConvertToStudent(applicant)}
                          className="p-1.5 rounded-lg hover:bg-green-100"
                          title="Convert to Student"
                        >
                          <GraduationCap className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(applicant.id, applicant.full_name)}
                        className="p-1.5 rounded-lg hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredApplicants.length)} of {filteredApplicants.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 text-sm bg-gray-100 rounded-lg">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Applicant Detail Modal */}
      {showDetailModal && selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Application Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Applicant ID</p>
                  <p className="font-mono">{selectedApplicant.applicant_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedApplicant.status)}
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-sm text-gray-500">Full Name</p><p>{selectedApplicant.full_name}</p></div>
                  <div><p className="text-sm text-gray-500">Email</p><p>{selectedApplicant.email}</p></div>
                  <div><p className="text-sm text-gray-500">Phone</p><p>{selectedApplicant.phone}</p></div>
                  <div><p className="text-sm text-gray-500">Applying For</p><p>{selectedApplicant.applying_for}</p></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={selectedApplicant.status}
                onChange={(e) => handleStatusUpdate(selectedApplicant.id, e.target.value)}
              >
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
              {selectedApplicant.status === 'accepted' && (
                <Button onClick={() => handleConvertToStudent(selectedApplicant)} className="bg-green-600">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Convert to Student
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">New Application</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="First Name" className="border rounded-lg px-3 py-2" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
                <input type="text" placeholder="Last Name" className="border rounded-lg px-3 py-2" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
              </div>
              <input type="email" placeholder="Email" className="w-full border rounded-lg px-3 py-2" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              <input type="tel" placeholder="Phone" className="w-full border rounded-lg px-3 py-2" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
              <input type="text" placeholder="Applying For (e.g., Grade 1, Computer Science)" className="w-full border rounded-lg px-3 py-2" value={formData.applying_for} onChange={(e) => setFormData({...formData, applying_for: e.target.value})} required />
              <input type="date" placeholder="Date of Birth" className="w-full border rounded-lg px-3 py-2" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
              <select className="w-full border rounded-lg px-3 py-2" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
              <input type="text" placeholder="Previous Institution" className="w-full border rounded-lg px-3 py-2" value={formData.previous_institution} onChange={(e) => setFormData({...formData, previous_institution: e.target.value})} />
              <input type="text" placeholder="Previous Qualification" className="w-full border rounded-lg px-3 py-2" value={formData.previous_qualification} onChange={(e) => setFormData({...formData, previous_qualification: e.target.value})} />
              <input type="number" step="0.01" placeholder="Previous Percentage" className="w-full border rounded-lg px-3 py-2" value={formData.previous_percentage} onChange={(e) => setFormData({...formData, previous_percentage: e.target.value})} />
              <textarea placeholder="Address (Optional)" className="w-full border rounded-lg px-3 py-2" rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              <input type="text" placeholder="City" className="w-full border rounded-lg px-3 py-2" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Submit Application</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredApplicants.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No applications found</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">Add New Application</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
