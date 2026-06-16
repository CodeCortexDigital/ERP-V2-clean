import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Mail, Edit2, Filter, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';

// Helper: clean phone number and build WhatsApp link
const getWhatsAppLink = (phone: string) => {
  if (!phone) return null;
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-().]/g, '');
  // If starts with 0, replace with Pakistan country code (+92)
  const international = cleaned.startsWith('0')
    ? '92' + cleaned.slice(1)
    : cleaned.replace(/^\+/, '');
  return `https://wa.me/${international}`;
};

// Helper: open default mail client without navigating the SPA away
const openEmail = (email: string) => {
  if (!email) return;
  window.open(`mailto:${email}`, '_self');
};

export default function TeachersManagement() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await teacherService.getAll();
      setTeachers(extractListData<Teacher>(response.data));
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeTeachers = teachers.filter(t => t.is_active);
  const departments = [...new Set(teachers.flatMap(t => t.specializations || []))].filter(Boolean);
  const totalExperience = activeTeachers.reduce((sum, t) => sum + (t.experience_years || 0), 0);
  const avgExperience = activeTeachers.length > 0 ? Math.round(totalExperience / activeTeachers.length) : 0;

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch =
      t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !selectedDepartment || (t.specializations || []).includes(selectedDepartment);

    let matchesStatus = true;
    if (selectedStatus === 'active') {
      matchesStatus = t.is_active === true;
    } else if (selectedStatus === 'inactive') {
      matchesStatus = t.is_active === false;
    } else if (!showInactive) {
      matchesStatus = t.is_active === true;
    }

    return matchesSearch && matchesDept && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedStatus('');
    setShowInactive(false);
  };

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
          <h1 className="text-2xl font-bold text-gray-800">Teachers Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage faculty and teaching staff</p>
        </div>
        <Button onClick={() => navigate('/education/teachers/add')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Total Teachers</p>
          <p className="text-2xl font-bold text-blue-700">{teachers.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Active Teachers</p>
          <p className="text-2xl font-bold text-green-700">{activeTeachers.length}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Departments</p>
          <p className="text-2xl font-bold text-purple-700">{departments.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Avg Experience</p>
          <p className="text-2xl font-bold text-yellow-700">{avgExperience} yrs</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
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

        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>

        <Button
          variant={showInactive ? 'default' : 'outline'}
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </Button>

        {(searchTerm || selectedDepartment || selectedStatus || showInactive) && (
          <Button variant="ghost" onClick={clearFilters} size="sm">
            Clear Filters
          </Button>
        )}

        <Button onClick={fetchTeachers} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Department / Specialization</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Teachers Table */}
      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Teacher ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Specialization</th>
              <th className="px-4 py-3 text-left">Qualification</th>
              <th className="px-4 py-3 text-left">Experience</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((teacher) => (
              <tr
                key={teacher.id}
                className={`border-t hover:bg-gray-50 ${!teacher.is_active ? 'bg-gray-100 opacity-75' : ''}`}
              >
                {/* Teacher ID */}
                <td className="px-4 py-3 font-mono text-sm">{teacher.employee_id || 'N/A'}</td>

                {/* Name + Email + WhatsApp (inline clickable) */}
                <td className="px-4 py-3">
                  <p
                    className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition"
                    onClick={() => navigate(`/education/teachers/${teacher.id}`)}
                  >
                    {teacher.full_name}
                  </p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {/* Email — click to open mail client */}
                    {teacher.email && (
                      <button
                        onClick={() => openEmail(teacher.email)}
                        className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition text-left group"
                        title={`Send email to ${teacher.email}`}
                      >
                        <Mail className="w-3 h-3 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{teacher.email}</span>
                      </button>
                    )}
                    {/* Phone — click to open WhatsApp */}
                    {teacher.phone && (
                      <a
                        href={getWhatsAppLink(teacher.phone) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1 transition group"
                        title={`Open WhatsApp for ${teacher.phone}`}
                      >
                        <MessageCircle className="w-3 h-3 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                        {teacher.phone}
                      </a>
                    )}
                  </div>
                </td>

                {/* Specialization */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {teacher.specializations?.slice(0, 2).map((spec, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{spec}</Badge>
                    ))}
                  </div>
                </td>

                {/* Qualification */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {teacher.qualifications?.slice(0, 2).map((qual, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{qual}</Badge>
                    ))}
                  </div>
                </td>

                {/* Experience */}
                <td className="px-4 py-3">{teacher.experience_years || 0} years</td>

                {/* Status */}
                <td className="px-4 py-3">
                  <Badge variant={teacher.is_active ? 'success' : 'secondary'}>
                    {teacher.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>

                {/* Action Buttons */}
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center items-center">
                    {/* View Profile */}
                    <button
                      onClick={() => navigate(`/education/teachers/${teacher.id}`)}
                      className="p-1.5 rounded-lg hover:bg-blue-100 transition"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => navigate(`/education/teachers/${teacher.id}/edit`)}
                      className="p-1.5 rounded-lg hover:bg-yellow-100 transition"
                      title="Edit Teacher"
                    >
                      <Edit2 className="w-4 h-4 text-yellow-600" />
                    </button>

                    {/* Email — opens default mail client without navigating SPA away */}
                    <button
                      onClick={() => openEmail(teacher.email)}
                      className="p-1.5 rounded-lg hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title={teacher.email ? `Email: ${teacher.email}` : 'No email available'}
                      disabled={!teacher.email}
                    >
                      <Mail className="w-4 h-4 text-green-600" />
                    </button>

                    {/* WhatsApp — opens wa.me in new tab */}
                    {teacher.phone ? (
                      <a
                        href={getWhatsAppLink(teacher.phone) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-emerald-100 transition inline-flex items-center justify-center"
                        title={`WhatsApp: ${teacher.phone}`}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </a>
                    ) : (
                      <button
                        className="p-1.5 rounded-lg opacity-40 cursor-not-allowed"
                        title="No phone number available"
                        disabled
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTeachers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No teachers found</p>
        </div>
      )}
    </div>
  );
}
