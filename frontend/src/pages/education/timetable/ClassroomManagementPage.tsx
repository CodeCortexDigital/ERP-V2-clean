import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Home, X, Layers, Tag, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';

interface Classroom {
  id: string;
  name: string;
  code: string;
  capacity?: number;
  description?: string;
  floor?: string;
  category?: string;
}

const resolveFloorFromName = (name: string, description: string): string => {
  const desc = (description || '').toLowerCase();
  const n = (name || '').toLowerCase();
  
  if (desc.includes('ground') || n.includes('grade 1') || n.includes('grade 2') || n.includes('grade 3') || n.includes('reception') || n.includes('admission') || n.includes('accounts') || n.includes('principal') || n.includes('medical') || n.includes('prayer') || n.includes('library') || n.includes('art') || n.includes('music') || n.includes('cafeteria')) {
    return 'ground';
  }
  if (desc.includes('1st') || desc.includes('first') || n.includes('grade 4') || n.includes('grade 5') || n.includes('grade 6') || n.includes('meeting') || n.includes('counseling') || n.includes('mathematics activity') || n.includes('reading room') || n.includes('seminar hall') || n.includes('recreation room') || n.includes('common room (girls)')) {
    return 'first';
  }
  if (desc.includes('2nd') || desc.includes('second') || n.includes('grade 7') || n.includes('grade 8') || n.includes('computer lab') || n.includes('science lab') || n.includes('language lab') || n.includes('common room (boys)') || n.includes('sports hall')) {
    return 'second';
  }
  if (desc.includes('3rd') || desc.includes('third') || n.includes('grade 9') || n.includes('grade 10') || n.includes('physics lab') || n.includes('chemistry lab') || n.includes('biology lab') || n.includes('exam') || n.includes('conference') || n.includes('record') || n.includes('server') || n.includes('store')) {
    return 'third';
  }
  if (desc.includes('outdoor') || n.includes('playground') || n.includes('basketball') || n.includes('cricket') || n.includes('football') || n.includes('gymnasium') || n.includes('auditorium') || n.includes('multipurpose hall')) {
    return 'outdoor';
  }
  return 'ground'; // default
};

const resolveCategoryFromName = (name: string): string => {
  const n = (name || '').toLowerCase();
  
  if (n.includes('grade') || n.includes('class')) {
    return 'classroom';
  }
  if (n.includes('lab') || n.includes('science laboratory') || n.includes('physics laboratory') || n.includes('chemistry laboratory') || n.includes('biology laboratory') || n.includes('activity room')) {
    return 'lab';
  }
  if (n.includes('office') || n.includes('reception') || n.includes('staff') || n.includes('meeting') || n.includes('counseling') || n.includes('record room') || n.includes('server room')) {
    return 'office';
  }
  if (n.includes('playground') || n.includes('court') || n.includes('ground') || n.includes('gym') || n.includes('sports') || n.includes('recreation') || n.includes('common')) {
    return 'sports';
  }
  if (n.includes('auditorium') || n.includes('hall') || n.includes('conference')) {
    return 'hall';
  }
  return 'other';
};

const FLOORS = [
  { id: 'all', name: 'All Floors' },
  { id: 'ground', name: 'Ground Floor' },
  { id: 'first', name: 'First Floor' },
  { id: 'second', name: 'Second Floor' },
  { id: 'third', name: 'Third Floor' },
  { id: 'outdoor', name: 'Outdoor Area' }
];

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'classroom', name: 'Classrooms' },
  { id: 'lab', name: 'Laboratories' },
  { id: 'office', name: 'Offices & Staff' },
  { id: 'sports', name: 'Sports & Recreation' },
  { id: 'hall', name: 'Assembly & Halls' },
  { id: 'other', name: 'Utility & Other' }
];

export default function ClassroomManagementPage() {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);

  // Layout View Switcher: default to list view
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter states
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('ground');
  const [category, setCategory] = useState('classroom');

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const apiRooms = await academicService.classrooms.getAll().catch(() => []);
      const customRooms = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
      const deletedIds = JSON.parse(localStorage.getItem('deleted_classroom_ids') || '[]');
      
      // Override default classroom values with user edited values if matches ID
      const customMap = new Map<string, Classroom>();
      customRooms.forEach((r: any) => {
        customMap.set(r.id, r);
      });

      const merged = apiRooms.map((r: any) => {
        if (customMap.has(r.id)) {
          return customMap.get(r.id)!;
        }
        return r;
      });

      customRooms.forEach((r: any) => {
        if (!apiRooms.some((ar: any) => ar.id === r.id)) {
          merged.push(r);
        }
      });

      const combined = merged.filter(r => !deletedIds.includes(r.id));
      
      // De-duplicate rooms by code (case-insensitive)
      const seen = new Set<string>();
      const deduped: Classroom[] = [];
      combined.forEach(r => {
        const cCode = (r.code || '').toLowerCase().trim();
        if (cCode && !seen.has(cCode)) {
          seen.add(cCode);
          
          const roomFloor = r.floor || resolveFloorFromName(r.name, r.description || '');
          const roomCategory = r.category || resolveCategoryFromName(r.name);
          
          deduped.push({
            id: r.id,
            name: r.name,
            code: r.code,
            capacity: Number(r.capacity) || 30,
            description: r.description || '',
            floor: roomFloor,
            category: roomCategory
          });
        }
      });

      // Sort alphabetically naturally
      deduped.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      setClassrooms(deduped);
    } catch (e) {
      toast.error('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (room: Classroom) => {
    setEditingRoom(room);
    setName(room.name);
    setCode(room.code);
    setCapacity(String(room.capacity || ''));
    setDescription(room.description || '');
    setFloor(room.floor || 'ground');
    setCategory(room.category || 'classroom');
    setShowForm(true);
  };

  const handleDelete = async (id: string, roomName: string) => {
    if (!confirm(`Are you sure you want to delete classroom ${roomName}?`)) return;

    try {
      await academicService.classrooms.delete(id).catch(() => {});
    } catch (e) {}

    const deletedIds = JSON.parse(localStorage.getItem('deleted_classroom_ids') || '[]');
    deletedIds.push(id);
    localStorage.setItem('deleted_classroom_ids', JSON.stringify(deletedIds));

    // Also remove from custom_classrooms
    const customRooms = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
    const updated = customRooms.filter((r: any) => r.id !== id);
    localStorage.setItem('custom_classrooms', JSON.stringify(updated));

    toast.success('Classroom deleted successfully');
    fetchClassrooms();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Name and Code are required');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      capacity: Number(capacity) || 30,
      description: description.trim(),
      floor,
      category
    };

    try {
      if (editingRoom) {
        // Edit Mode
        try {
          await academicService.classrooms.update(editingRoom.id, payload as any).catch(() => {});
        } catch (e) {}

        const customRooms = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
        const updated = customRooms.some((r: any) => r.id === editingRoom.id)
          ? customRooms.map((r: any) => r.id === editingRoom.id ? { ...r, ...payload } : r)
          : [...customRooms, { id: editingRoom.id, ...payload }];
        localStorage.setItem('custom_classrooms', JSON.stringify(updated));

        toast.success('Classroom updated successfully');
      } else {
        // Create Mode
        const newId = `room-${Date.now()}`;
        try {
          await academicService.classrooms.create(payload as any).catch(() => {});
        } catch (e) {}

        const customRooms = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
        customRooms.push({ id: newId, ...payload });
        localStorage.setItem('custom_classrooms', JSON.stringify(customRooms));

        toast.success('Classroom created successfully');
      }

      resetForm();
      fetchClassrooms();
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  const resetForm = () => {
    setEditingRoom(null);
    setName('');
    setCode('');
    setCapacity('');
    setDescription('');
    setFloor('ground');
    setCategory('classroom');
    setShowForm(false);
  };

  // Filtered classrooms list
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(room => {
      const matchFloor = selectedFloor === 'all' || room.floor === selectedFloor;
      const matchCategory = selectedCategory === 'all' || room.category === selectedCategory;
      return matchFloor && matchCategory;
    });
  }, [classrooms, selectedFloor, selectedCategory]);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Home className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/timetable')}>Timetable</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Class Rooms</span>
        </div>

        <button
          onClick={() => navigate('/education/timetable')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-slate-800">Classrooms & Facilities Directory</h1>
            <p className="text-[10px] text-slate-400 font-bold">Configure physical classrooms, labs, offices, recreation, and outdoor sports areas.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-white text-purple-650 shadow-3xs' : 'text-slate-450 hover:text-slate-700'
                }`}
                title="List View"
              >
                <List className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-white text-purple-650 shadow-3xs' : 'text-slate-450 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <Grid className="w-4.5 h-4.5" />
              </button>
            </div>

            {!showForm && (
              <Button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-sm px-4"
              >
                <Plus className="w-4 h-4" /> Add Classroom / Facility
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-800">
                {editingRoom ? `Edit Room: ${editingRoom.name}` : 'New Facility Registration'}
              </CardTitle>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Room / Facility Name *</label>
                    <Input
                      placeholder="e.g. Physics Laboratory, Grade 10-A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="text-xs h-10 rounded-xl border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Room Code *</label>
                    <Input
                      placeholder="e.g. PLAB, G10A"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="text-xs h-10 rounded-xl border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Student Seating Capacity</label>
                    <Input
                      type="number"
                      placeholder="e.g. 35"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="text-xs h-10 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Select Layout Floor *</label>
                    <select
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="ground">Ground Floor</option>
                      <option value="first">First Floor</option>
                      <option value="second">Second Floor</option>
                      <option value="third">Third Floor</option>
                      <option value="outdoor">Outdoor Area</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Select Facility Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="classroom">Classroom</option>
                      <option value="lab">Laboratory</option>
                      <option value="office">Office & Staff Room</option>
                      <option value="sports">Sports & Recreation</option>
                      <option value="hall">Assembly & Halls</option>
                      <option value="other">Utility & Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Description / Location Notes</label>
                  <Input
                    placeholder="e.g. Near Principal Office, West Wing, 2nd Floor Block B"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xs h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="text-xs h-9 rounded-xl px-4">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 rounded-xl px-6 shadow-sm">
                    {editingRoom ? 'Save Changes' : 'Create Facility'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 1. Floor-wise Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3.5">
          <div className="flex items-center gap-1.5 text-slate-800">
            <Layers className="w-4 h-4 text-purple-650" />
            <span className="text-xs font-black">Layout Floors Filter</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FLOORS.map(fl => (
              <button
                key={fl.id}
                onClick={() => setSelectedFloor(fl.id)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all border ${
                  selectedFloor === fl.id
                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-650 hover:bg-slate-100/70'
                }`}
              >
                {fl.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Category-wise Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3.5">
          <div className="flex items-center gap-1.5 text-slate-800">
            <Tag className="w-4 h-4 text-purple-650" />
            <span className="text-xs font-black">Facilities Categories Filter</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-650 hover:bg-slate-100/70'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-3xs">
            <Grid className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No matching rooms or facilities found</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Try resetting the filters or register a new facility above.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List Table View */
          <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Room / Facility Name</th>
                    <th className="p-3.5">Capacity</th>
                    <th className="p-3.5">Floor</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Location / Notes</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                  {filteredClassrooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {room.code}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{room.name}</td>
                      <td className="p-3.5 text-slate-600">{room.capacity} Students</td>
                      <td className="p-3.5 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-black capitalize tracking-wider">
                          🏢 {room.floor === 'ground' ? 'Ground' : room.floor === 'outdoor' ? 'Outdoor' : `${room.floor} Floor`}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black capitalize tracking-wider">
                          🏷️ {room.category === 'lab' ? 'Laboratory' : room.category === 'office' ? 'Office' : room.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-[10px] text-slate-400 font-normal max-w-xs truncate">
                        {room.description || '-'}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(room)}
                            className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-650 rounded transition-colors"
                            title="Edit Room"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(room.id, room.name)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-650 rounded transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* Grid Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredClassrooms.map(room => (
              <Card key={room.id} className="border border-slate-100 hover:border-purple-100 rounded-2xl shadow-3xs hover:shadow-xs bg-white transition-all overflow-hidden flex flex-col justify-between">
                <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-start justify-between bg-slate-50/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-650 flex items-center justify-center">
                      <Home className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-black text-slate-800">{room.name}</CardTitle>
                      <span className="text-[9px] font-black text-slate-400 font-mono tracking-wider uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {room.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEdit(room)}
                      className="p-1 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded transition-colors"
                      title="Edit Room"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete Room"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-2.5 text-[10px] font-semibold text-slate-655">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Capacity:</span>
                    <span className="text-slate-800 font-black">{room.capacity} Students</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-50">
                    {/* Floor Badge */}
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-black capitalize tracking-wider">
                      🏢 {room.floor === 'ground' ? 'Ground Floor' : room.floor === 'outdoor' ? 'Outdoor' : `${room.floor} Floor`}
                    </span>

                    {/* Category Badge */}
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black capitalize tracking-wider">
                      🏷️ {room.category === 'lab' ? 'Laboratory' : room.category === 'office' ? 'Office' : room.category}
                    </span>
                  </div>

                  {room.description && (
                    <div className="pt-1 border-t border-slate-50">
                      <span className="text-slate-400 block mb-0.5">Location/Notes:</span>
                      <p className="text-slate-655 leading-relaxed font-normal text-[9px]">{room.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
