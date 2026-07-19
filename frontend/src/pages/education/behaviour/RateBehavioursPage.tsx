import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, Calendar, GraduationCap, Users,
  BookOpen, Edit3, Trash2, X, Clipboard, Star, Award, ShieldAlert,
  Sparkles, CheckCircle2, ChevronRight, Save, User
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { CanAccess } from '@/components/auth/CanAccess';
import academicService from '@/services/academic.service';
import behaviourService from '@/services/behaviour.service';
import studentService from '@/services/student.service';

const BEHAVIOUR_CATEGORIES = [
  "Discipline", "Respect", "Attendance Behaviour", "Punctuality", "Responsibility",
  "Honesty", "Class Participation", "Homework Completion", "Following Instructions", "Self Control",
  "Leadership", "Teamwork", "Cooperation", "Helping Others", "Positive Attitude",
  "Confidence", "Classroom Conduct", "Respect for Property", "Cleanliness", "Personal Hygiene"
];

const REWARDS_LIST = [
  "Star Student", "Best Discipline", "Best Attendance", "Best Leader", "Best Reader",
  "Sports Star", "Creative Student", "Helping Student", "Most Improved", "Perfect Attendance"
];

const IMPROVEMENT_PLANS = [
  "Extra Reading", "Behaviour Monitoring", "Parent Meeting", "Counselling",
  "Peer Learning", "Leadership Activity", "Weekly Feedback", "Positive Reinforcement"
];

export default function RateBehavioursPage() {
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
  const [searchQuery, setSearchQuery] = useState('');

  // Ratings State
  const [ratings, setRatings] = useState<Record<string, number>>({}); 
  const [notObserved, setNotObserved] = useState<Record<string, boolean>>({});

  // Rewards & Plan State
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

  // AI Recommendations Simulation
  const [aiTeacherRec, setAiTeacherRec] = useState('');
  const [aiParentRec, setAiParentRec] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId) {
        setStudents([]);
        setActiveStudent(null);
        return;
      }
      try {
        const res = await studentService.getByClass(selectedClassId).catch(() => ({ data: [] }));
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
        const mapped = data
          .filter((s: any) => !s.current_class_id || String(s.current_class_id) === String(selectedClassId))
          .map((s: any) => ({
            id: s.id,
            name: s.full_name || s.name || 'Unknown',
            roll: s.roll_number || s.roll_no || s.admission_number || s.student_id || '—',
            classId: s.current_class_id,
          }));
        setStudents(mapped);
        setActiveStudent(mapped[0] || null);
      } catch {
        setStudents([]);
        setActiveStudent(null);
      }
    };
    fetchStudents();
  }, [selectedClassId]);

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
        setSelectedRewards(entry.rewards || []);
        setSelectedPlans(entry.plans || []);
        setAiTeacherRec(entry.ai_teacher_rec || '');
        setAiParentRec(entry.ai_parent_rec || '');
      } else {
        const initialRatings: Record<string, number> = {};
        BEHAVIOUR_CATEGORIES.forEach(c => { initialRatings[c] = 4; });
        setRatings(initialRatings);
        setNotObserved({});
        setSelectedRewards([]);
        setSelectedPlans([]);
        setAiTeacherRec('');
        setAiParentRec('');
      }
    } catch {
      const initialRatings: Record<string, number> = {};
      BEHAVIOUR_CATEGORIES.forEach(c => { initialRatings[c] = 4; });
      setRatings(initialRatings);
      setNotObserved({});
      setSelectedRewards([]);
      setSelectedPlans([]);
      setAiTeacherRec('');
      setAiParentRec('');
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

  const handleRatingChange = (cat: string, val: number) => {
    setRatings(prev => ({ ...prev, [cat]: val }));
    setNotObserved(prev => ({ ...prev, [cat]: false }));
  };

  const handleNotObservedToggle = (cat: string) => {
    const nextVal = !notObserved[cat];
    setNotObserved(prev => ({ ...prev, [cat]: nextVal }));
    if (nextVal) {
      setRatings(prev => ({ ...prev, [cat]: 0 }));
    } else {
      setRatings(prev => ({ ...prev, [cat]: 4 })); // fallback to 4
    }
  };

  const getRatingLabel = (val: number, cat: string) => {
    if (notObserved[cat]) return 'Not Observed';
    if (val === 5) return 'Excellent';
    if (val === 4) return 'Very Good';
    if (val === 3) return 'Good';
    if (val === 2) return 'Fair';
    return 'Needs Improvement';
  };

  const toggleReward = (rew: string) => {
    setSelectedRewards(prev => 
      prev.includes(rew) ? prev.filter(r => r !== rew) : [...prev, rew]
    );
  };

  const togglePlan = (p: string) => {
    setSelectedPlans(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const generateAIRecommendations = () => {
    setLoadingAI(true);
    toast.loading('Analyzing student ratings to formulate personalized goals...');
    setTimeout(() => {
      const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / BEHAVIOUR_CATEGORIES.length;
      if (avg >= 4.2) {
        setAiTeacherRec("Continue giving Rimsai leadership roles in group projects. Encourage peer tutoring to maximize communication skills.");
        setAiParentRec("Keep up the outstanding motivation at home. Share stories of inspiring historical leaders to fuel Rimsai's drive.");
      } else if (avg >= 3.0) {
        setAiTeacherRec("Include Rimsai in structured cooperative class assignments. Focus on active participation and punctuality validation.");
        setAiParentRec("Support homework scheduling at home. Provide positive reinforcement for tasks completed ahead of the due date.");
      } else {
        setAiTeacherRec("Introduce structured behavior monitoring reports. Consider scheduling counselling sessions to focus on classroom conduct.");
        setAiParentRec("Initiate weekly check-ins with teachers. Set minor behavioral goals at home with clear, consistent positive feedback.");
      }
      toast.dismiss();
      toast.success('AI Recommendations generated successfully!');
      setLoadingAI(false);
    }, 1200);
  };

  const handleSave = async () => {
    if (!activeStudent || !selectedClassId) return;
    try {
      await behaviourService.createRating({
        student: activeStudent.id,
        class_ref: selectedClassId,
        domain: 'affective',
        term: selectedTerm,
        month: selectedMonth,
        academic_year: selectedSession,
        ratings,
        not_observed: notObserved,
        rewards: selectedRewards,
        plans: selectedPlans,
        ai_teacher_rec: aiTeacherRec,
        ai_parent_rec: aiParentRec,
      });
      toast.success(`Behaviour Assessment for ${activeStudent.name} saved successfully!`);
    } catch {
      toast.error('Failed to save ratings');
    }
  };

  const filteredStudents = students.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (st.name || '').toLowerCase().includes(q) ||
      (st.roll || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Behaviour & Skills</span>
          <span>Rate Behaviours</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        
        {/* Left Column: Student Selection */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs font-black text-slate-800">Selection Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-[8px] font-black text-slate-450 uppercase mb-1">Academic Session</label>
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
              <Badge className="bg-purple-100 text-purple-700 text-[8px] font-black">{filteredStudents.length} Pupils</Badge>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or roll no..."
                  className="w-full text-xs h-9 rounded-xl border border-slate-200 bg-white pl-8 pr-3 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-semibold p-3 text-center">No students found.</p>
                ) : (
                  filteredStudents.map((st) => (
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Behaviour Assessments Grid */}
        <div className="lg:col-span-3 space-y-6">
          {activeStudent ? (
            <>
              {/* Assessment Panel */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                  <div>
                    <span className="text-[9px] text-purple-600 font-black uppercase tracking-wider block">Currently Assessing</span>
                    <CardTitle className="text-sm font-black text-slate-800 mt-1">{activeStudent.name} (Roll: {activeStudent.roll})</CardTitle>
                  </div>
                  <CanAccess module="behaviour" action="add">
                    <Button
                      onClick={handleSave}
                      className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white text-xs font-bold h-9 rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
                    >
                      <Save className="w-4 h-4" /> Save Ratings
                    </Button>
                  </CanAccess>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {BEHAVIOUR_CATEGORIES.map((cat) => {
                      const val = ratings[cat] || 0;
                      return (
                        <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-50 gap-4">
                          <div>
                            <span className="text-xs font-bold text-slate-750 block">{cat}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider block mt-0.5 ${
                              notObserved[cat] 
                                ? 'text-slate-400' 
                                : val >= 4 
                                ? 'text-emerald-600' 
                                : val >= 3 
                                ? 'text-amber-600' 
                                : 'text-rose-600'
                            }`}>
                              {getRatingLabel(val, cat)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Stars */}
                            <CanAccess module="behaviour" action="add">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleRatingChange(cat, star)}
                                    disabled={notObserved[cat]}
                                    className={`p-0.5 transition-transform ${notObserved[cat] ? 'opacity-30 cursor-not-allowed' : 'hover:scale-115 active:scale-95'}`}
                                  >
                                    <Star 
                                      className={`w-4 h-4 ${
                                        !notObserved[cat] && star <= val 
                                          ? 'fill-amber-400 text-amber-400' 
                                          : 'text-slate-200'
                                      }`} 
                                    />
                                  </button>
                                ))}
                              </div>
                            </CanAccess>

                            {/* Not Observed Checkbox */}
                            <label className="flex items-center gap-1 text-[9px] font-black text-slate-400 select-none cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notObserved[cat] || false}
                                onChange={() => handleNotObservedToggle(cat)}
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

              {/* Rewards & Improvement Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rewards / Star Pupil Selection */}
                <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-xs font-black text-slate-800">Special Domain Rewards</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-[10px] text-slate-400 font-semibold mb-4 leading-normal">Select merit badges or achievements to assign for this month's behaviour performance.</p>
                    <div className="flex flex-wrap gap-2">
                      {REWARDS_LIST.map((rew) => {
                        const isSelected = selectedRewards.includes(rew);
                        return (
                          <button
                            key={rew}
                            onClick={() => toggleReward(rew)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all ${
                              isSelected 
                                ? 'bg-purple-100 text-purple-800 shadow-2xs border border-purple-200' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-550 border border-slate-150'
                            }`}
                          >
                            {rew}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Behavior Action Plan / Recommendations */}
                <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <CardTitle className="text-xs font-black text-slate-800">Improvement / Action Plans</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-[10px] text-slate-400 font-semibold mb-4 leading-normal">Assign target action items if student behavior requires monitoring or encouragement.</p>
                    <div className="flex flex-wrap gap-2">
                      {IMPROVEMENT_PLANS.map((plan) => {
                        const isSelected = selectedPlans.includes(plan);
                        return (
                          <button
                            key={plan}
                            onClick={() => togglePlan(plan)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all ${
                              isSelected 
                                ? 'bg-rose-100 text-rose-800 shadow-2xs border border-rose-200' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-550 border border-slate-150'
                            }`}
                          >
                            {plan}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Auto-Generated Recommendations */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-650" />
                    <CardTitle className="text-xs font-black text-slate-800">AI Recommendation Engine</CardTitle>
                  </div>
                  <Button
                    onClick={generateAIRecommendations}
                    disabled={loadingAI}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] font-black h-8.5 rounded-xl px-4 flex items-center gap-1 shadow-2xs border border-purple-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Generate AI Recommendations
                  </Button>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-[10px] font-semibold text-slate-650">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">TEACHER RECOMMENDATIONS</span>
                      {aiTeacherRec ? (
                        <p className="text-slate-700 leading-relaxed font-normal">{aiTeacherRec}</p>
                      ) : (
                        <span className="text-slate-400 italic block font-normal">Click Generate above to draft teacher targets...</span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">PARENT RECOMMENDATIONS / GOALS</span>
                      {aiParentRec ? (
                        <p className="text-slate-700 leading-relaxed font-normal">{aiParentRec}</p>
                      ) : (
                        <span className="text-slate-400 italic block font-normal">Click Generate above to draft parent objectives...</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 shadow-3xs flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-xs font-bold text-slate-700">No Student Selected</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Please select a class and student from the left menu to start the behaviour rating assessment.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
