import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Mail, Phone, Edit2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import teacherService, { Teacher } from '@/services/teacher.service';

export default function TeachersManagement() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await teacherService.getAll();
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(teachers.flatMap(t => t.specializations || []))].filter(Boolean);

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = !selectedDepartment || (t.specializations || []).includes(selectedDepartment);
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && t.is_active) || 
      (selectedStatus === 'inactive' && !t.is_active);
    
    return matchesSearch && matchesDept && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedStatus('');
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
          <p className="text-2xl font-bold text-green-700">{teachers.filter(t => t.is_active).length}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Total Experience</p>
          <p className="text-2xl font-bold text-purple-700">
            {teachers.reduce((sum, t) => sum + (t.experience_years || 0), 0)} yrs
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Avg Experience</p>
          <p className="text-2xl font-bold text-yellow-700">
            {teachers.length > 0 ? Math.round(teachers.reduce((sum, t) => sum + (t.experience_years || 0), 0) / teachers.length) : 0} yrs
          </p>
        </div>
      </div>

      {/* Filters */}
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
        
        {(searchTerm || selectedDepartment || selectedStatus) && (
          <Button variant="ghost" onClick={clearFilters} size="sm">
            Clear Filters
          </Button>
        )}
        
        <Button onClick={fetchTeachers} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Advanced Filters */}
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              <tr key={teacher.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{teacher.employee_id || 'N/A'}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{teacher.full_name}</p>
                    <p className="text-xs text-gray-500">{teacher.email}</p>
                    <p className="text-xs text-gray-400">{teacher.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {teacher.specializations?.slice(0, 2).map((spec, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {teacher.qualifications?.slice(0, 2).map((qual, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{teacher.experience_years || 0} years</td>
                <td className="px-4 py-3">
                  <Badge variant={teacher.is_active ? 'success' : 'secondary'}>
                    {teacher.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <button 
                      onClick={() => navigate(`/education/teachers/${teacher.id}`)} 
                      className="p-1.5 rounded-lg hover:bg-blue-100" 
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button 
                      onClick={() => navigate(`/education/teachers/${teacher.id}/edit`)} 
                      className="p-1.5 rounded-lg hover:bg-yellow-100" 
                      title="Edit Teacher"
                    >
                      <Edit2 className="w-4 h-4 text-yellow-600" />
                    </button>
                    <button 
                      onClick={() => window.location.href = `mailto:${teacher.email}`}
                      className="p-1.5 rounded-lg hover:bg-green-100" 
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4 text-green-600" />
                    </button>
                    <button 
                      onClick={() => navigator.clipboard.writeText(teacher.phone)}
                      className="p-1.5 rounded-lg hover:bg-purple-100" 
                      title="Copy Phone Number"
                    >
                      <Phone className="w-4 h-4 text-purple-600" />
                    </button>
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
