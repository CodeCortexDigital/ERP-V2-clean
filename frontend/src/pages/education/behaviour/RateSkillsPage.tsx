import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, GraduationCap, Users, BookOpen, Star, Save, User, 
  ChevronRight, Laptop, Award, BrainCircuit, HeartHandshake, Compass 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';
import behaviourService from '@/services/behaviour.service';

const ACADEMIC_SKILLS = [
  "Reading", "Writing", "Listening", "Speaking", "Mathematics", "Science Skills",
  "Computer Skills", "Critical Thinking", "Problem Solving", "Presentation Skills",
  "Research Skills", "Communication Skills", "Creativity", "Logical Thinking", "Memory", "Attention"
];

const SOCIAL_SKILLS = [
  "Friendship", "Sharing", "Empathy", "Respect", "Conflict Resolution", "Communication",
  "Helping Others", "Listening to Others", "Group Participation", "Sportsmanship", "Tolerance", "Social Confidence"
];

const DIGITAL_SKILLS = [
  "Computer Usage", "Internet Safety", "Typing", "MS Office", "Google Workspace",
  "Coding", "AI Tool Usage", "Digital Creativity", "Presentation Software", "Online Collaboration"
];

const LIFE_SKILLS = [
  "Leadership", "Decision Making", "Time Management", "Problem Solving", "Adaptability",
  "Responsibility", "Organization", "Planning", "Safety Awareness", "Financial Awareness", "Independence"
];

export default function RateSkillsPage() {
  const navigate = useNavigate();

  // Search & Selector State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('Grade 1-A');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedMonth, setSelectedMonth] = useState('July');

  // Student State
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any | null>(null);

  // Tab switcher
  const [activeTab, setActiveTab] = useState<'academic' | 'social' | 'digital' | 'life'>('academic');

  // Skill Ratings state
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notObserved, setNotObserved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const names = [];
    setStudents(names);
    setActiveStudent(names[0]);
  }, [selectedClass]);

  useEffect(() => {
    if (activeStudent) {
      loadRatings();
    }
  }, [activeStudent, selectedMonth, selectedTerm, selectedSession, selectedClassId]);

  const loadRatings = async () => {
    if (!activeStudent || !selectedClassId) return;
    try {
      const res = await behaviourService.getRatings({
        student: activeStudent.id,
        class_ref: selectedClassId,
        academic_year: selectedSession,
        term: selectedTerm,
        month: selectedMonth,
      });
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
      if (data.length > 0) {
        const entry = data[0];
        setRatings(entry.ratings || {});
        setNotObserved(entry.not_observed || {});
      } else {
        const initialRatings: Record<string, number> = {};
        [...ACADEMIC_SKILLS, ...SOCIAL_SKILLS, ...DIGITAL_SKILLS, ...LIFE_SKILLS].forEach(s => { initialRatings[s] = 4; });
        setRatings(initialRatings);
        setNotObserved({});
      }
    } catch {
      const initialRatings: Record<string, number> = {};
      [...ACADEMIC_SKILLS, ...SOCIAL_SKILLS, ...DIGITAL_SKILLS, ...LIFE_SKILLS].forEach(s => { initialRatings[s] = 4; });
      setRatings(initialRatings);
      setNotObserved({});
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await academicService.getClasses().catch(() => ({ data: [] }));
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
      if (data.length > 0) {
        setClasses(data);
        setSelectedClass(data[0].name);
        setSelectedClassId(data[0].id);
      } else {
        setClasses([
          { id: '1', name: 'Grade 1-A' },
          { id: '2', name: 'Grade 1-B' },
          { id: '3', name: 'Grade 2-A' }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRatingChange = (skill: string, val: number) => {
    setRatings(prev => ({ ...prev, [skill]: val }));
    setNotObserved(prev => ({ ...prev, [skill]: false }));
  };

  const handleNotObservedToggle = (skill: string) => {
    const nextVal = !notObserved[skill];
    setNotObserved(prev => ({ ...prev, [skill]: nextVal }));
    if (nextVal) {
      setRatings(prev => ({ ...prev, [skill]: 0 }));
    } else {
      setRatings(prev => ({ ...prev, [skill]: 4 })); // fallback
    }
  };

  const getRatingLabel = (val: number, skill: string) => {
    if (notObserved[skill]) return 'Not Observed';
    if (val === 5) return 'Excellent';
    if (val === 4) return 'Very Good';
    if (val === 3) return 'Good';
    if (val === 2) return 'Fair';
    return 'Needs Improvement';
  };

  const activeSkillsList = () => {
    if (activeTab === 'academic') return ACADEMIC_SKILLS;
    if (activeTab === 'social') return SOCIAL_SKILLS;
    if (activeTab === 'digital') return DIGITAL_SKILLS;
    return LIFE_SKILLS;
  };

  const handleSave = async () => {
    if (!activeStudent || !selectedClassId) return;
    try {
      await behaviourService.createRating({
        student: activeStudent.id,
        class_ref: selectedClassId,
        domain: 'psychomotor',
        term: selectedTerm,
        month: selectedMonth,
        academic_year: selectedSession,
        ratings,
        not_observed: notObserved,
      });
      toast.success(`Skills Assessment for ${activeStudent.name} saved successfully!`);
    } catch {
      toast.error('Failed to save skills ratings');
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Behaviour & Skills</span>
          <span>Rate Skills</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        
        {/* Left Column: Selector */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs font-black text-slate-800">Selection Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-[8px] font-black text-slate-455 uppercase mb-1">Academic Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full text-xs h-9.5 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:outline-none"
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-455 uppercase mb-1">Academic Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full text-xs h-9.5 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:outline-none"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-455 uppercase mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs h-9.5 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:outline-none"
                >
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-455 uppercase mb-1">Class Name</label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    const cls = classes.find(c => c.name === e.target.value);
                    setSelectedClass(e.target.value);
                    setSelectedClassId(cls?.id || '');
                  }}
                  className="w-full text-xs h-9.5 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:outline-none"
                >
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Student Search List */}
          <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-slate-800">Select Student</CardTitle>
              <Badge className="bg-purple-100 text-purple-700 text-[8px] font-black">{students.length} Pupils</Badge>
            </CardHeader>
            <CardContent className="p-2 divide-y divide-slate-50">
              {students.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setActiveStudent(st)}
                  className={`w-full flex items-center justify-between p-3 text-left rounded-xl transition-all ${
                    activeStudent?.id === st.id 
                      ? 'bg-purple-50 text-purple-700 font-extrabold' 
                      : 'hover:bg-slate-50 text-slate-655 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <User className={`w-4 h-4 ${activeStudent?.id === st.id ? 'text-purple-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block">{st.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Roll No: {st.roll}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Skills Rating */}
        <div className="lg:col-span-3 space-y-6">
          {activeStudent ? (
            <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
              {/* Card Header with tabs */}
              <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <span className="text-[9px] text-purple-650 font-black uppercase tracking-wider block">Currently Assessing Skills</span>
                    <CardTitle className="text-sm font-black text-slate-800 mt-1">{activeStudent.name}</CardTitle>
                  </div>
                  <Button
                    onClick={handleSave}
                    className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white text-xs font-bold h-9 rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
                  >
                    <Save className="w-4 h-4" /> Save Skills
                  </Button>
                </div>

                {/* Sub-tabs switcher */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-1">
                  <button
                    onClick={() => setActiveTab('academic')}
                    className={`pb-2 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'academic' 
                        ? 'border-purple-600 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Academic Skills
                  </button>

                  <button
                    onClick={() => setActiveTab('social')}
                    className={`pb-2 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'social' 
                        ? 'border-purple-600 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    Social Skills
                  </button>

                  <button
                    onClick={() => setActiveTab('digital')}
                    className={`pb-2 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'digital' 
                        ? 'border-purple-600 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    Digital Skills
                  </button>

                  <button
                    onClick={() => setActiveTab('life')}
                    className={`pb-2 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'life' 
                        ? 'border-purple-600 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Life Skills
                  </button>
                </div>
              </CardHeader>

              {/* Card Body */}
              <CardContent className="p-5 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {activeSkillsList().map((skill) => {
                    const val = ratings[skill] || 0;
                    return (
                      <div key={skill} className="flex items-center justify-between py-2 border-b border-slate-50 gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-750 block">{skill}</span>
                          <span className={`text-[9.5px] font-black uppercase tracking-wider block mt-0.5 ${
                            notObserved[skill] 
                              ? 'text-slate-400' 
                              : val >= 4 
                              ? 'text-emerald-600' 
                              : val >= 3 
                              ? 'text-amber-600' 
                              : 'text-rose-600'
                          }`}>
                            {getRatingLabel(val, skill)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Stars */}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleRatingChange(skill, star)}
                                disabled={notObserved[skill]}
                                className={`p-0.5 transition-transform ${notObserved[skill] ? 'opacity-30 cursor-not-allowed' : 'hover:scale-115 active:scale-95'}`}
                              >
                                <Star 
                                  className={`w-4 h-4 ${
                                    !notObserved[skill] && star <= val 
                                      ? 'fill-amber-400 text-amber-400' 
                                      : 'text-slate-200'
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>

                          {/* Not Observed Checkbox */}
                          <label className="flex items-center gap-1 text-[9px] font-black text-slate-400 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notObserved[skill] || false}
                              onChange={() => handleNotObservedToggle(skill)}
                              className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 w-3 h-3"
                            />
                            N/O
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 shadow-3xs flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-xs font-bold text-slate-700">No Student Selected</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Please select a class and student from the left menu to start the skills rating assessment.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
