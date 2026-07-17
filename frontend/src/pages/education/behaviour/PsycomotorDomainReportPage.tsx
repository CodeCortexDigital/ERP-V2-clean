import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, GraduationCap, Users, Calendar, Save, User, 
  ChevronRight, Clipboard, Award, ShieldAlert, Sparkles, Heart, 
  CheckCircle2, AlertTriangle, Clock, Printer, Download, TrendingUp, 
  Activity, Star, BarChart3, LineChart, FileText, Check, X 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';
import behaviourService from '@/services/behaviour.service';

const PSYCHOMOTOR_FIELDS = [
  "Handwriting", "Drawing", "Fine Motor Skills", "Gross Motor Skills", "Sports",
  "Laboratory Skills", "Craft Skills", "Coordination", "Practical Work",
  "Typing", "Keyboard Skills", "Mouse Control"
];

const MOCK_INSIGHTS = [
  "80% of students with attendance below 75% also have declining behaviour ratings.",
  "Students participating actively in sports show 20% higher teamwork and coordination scores.",
  "Homework completion rates strongly correlate with academic skills and critical thinking.",
  "Students with repeated late arrivals show declining classroom conduction scores."
];

interface PsychomotorData {
  ratings: Record<string, number>;
  trendDirection: 'Improving' | 'Stable' | 'Declining';
  trendDetails: { month: string; score: number }[];
  timeline: { title: string; date: string; desc: string; icon: string }[];
  averageScore: number;
}

export default function PsycomotorDomainReportPage() {
  const navigate = useNavigate();

  // Search Selector
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('Grade 1-A');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any | null>(null);

  // Psychomotor ratings
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reportData, setReportData] = useState<PsychomotorData | null>(null);

  // Certificate Modal State
  const [showCert, setShowCert] = useState(false);
  const [certType, setCertType] = useState('Behaviour Certificate');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const names = [];
    setStudents(names);
    setActiveStudent(names[0]);
  }, [selectedClass]);

  useEffect(() => {
    if (activeStudent && selectedClassId) {
      loadRatings();
    }
  }, [activeStudent, selectedClassId]);

  const loadRatings = async () => {
    if (!activeStudent || !selectedClassId) return;
    try {
      const res = await behaviourService.getRatings({
        student: activeStudent.id,
        class_ref: selectedClassId,
        domain: 'psychomotor',
      });
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
      let initialRatings: Record<string, number> = {};
      if (data.length > 0) {
        initialRatings = data[0].ratings || {};
      } else {
        PSYCHOMOTOR_FIELDS.forEach(f => {
          initialRatings[f] = activeStudent.id === 's-1' ? 5 : activeStudent.id === 's-3' ? 3 : 4;
        });
      }
      setRatings(initialRatings);
      generateReportData(initialRatings);
    } catch {
      const initialRatings: Record<string, number> = {};
      PSYCHOMOTOR_FIELDS.forEach(f => {
        initialRatings[f] = activeStudent.id === 's-1' ? 5 : activeStudent.id === 's-3' ? 3 : 4;
      });
      setRatings(initialRatings);
      generateReportData(initialRatings);
    }
  };

  const generateReportData = (r: Record<string, number>) => {
    const sum = Object.values(r).reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / (PSYCHOMOTOR_FIELDS.length * 5)) * 100);
    if (activeStudent.id === 's-1') {
      setReportData({
        ratings: r, averageScore: avg, trendDirection: 'Improving',
        trendDetails: [{ month: 'April', score: 78 }, { month: 'May', score: 82 }, { month: 'June', score: 88 }, { month: 'July', score: avg }],
        timeline: [
          { title: 'Fine Motor Skills Workshop', date: '2026-05-10', desc: 'Advanced drawing and handwriting assessment', icon: 'star' },
          { title: 'Sports Day Achievement', date: '2026-06-15', desc: 'Outstanding coordination and gross motor skills', icon: 'activity' },
        ]
      });
    } else if (activeStudent.id === 's-3') {
      setReportData({
        ratings: r, averageScore: avg, trendDirection: 'Declining',
        trendDetails: [{ month: 'April', score: 60 }, { month: 'May', score: 55 }, { month: 'June', score: 50 }, { month: 'July', score: avg }],
        timeline: [
          { title: 'Motor Skills Assessment', date: '2026-05-20', desc: 'Below average in fine motor skills', icon: 'alert' },
          { title: 'Sports Participation Review', date: '2026-06-22', desc: 'Low engagement in physical activities', icon: 'clock' },
        ]
      });
    } else {
      setReportData({
        ratings: r, averageScore: avg, trendDirection: 'Stable',
        trendDetails: [{ month: 'April', score: 72 }, { month: 'May', score: 74 }, { month: 'June', score: 73 }, { month: 'July', score: avg }],
        timeline: [
          { title: 'Typing Skills Improvement', date: '2026-05-15', desc: 'Noticeable improvement in typing speed', icon: 'star' },
        ]
      });
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
        setClasses([{ id: '1', name: 'Grade 1-A' }, { id: '2', name: 'Grade 1-B' }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRatingChange = (field: string, val: number) => {
    const updated = { ...ratings, [field]: val };
    setRatings(updated);
    if (reportData) {
      const sum = Object.values(updated).reduce((a, b) => a + b, 0);
      const score = Math.round((sum / (PSYCHOMOTOR_FIELDS.length * 5)) * 100);
      setReportData(prev => prev ? { ...prev, ratings: updated, averageScore: score } : null);
    }
  };

  const handleSaveRatings = async () => {
    if (!activeStudent || !selectedClassId) return;
    try {
      await behaviourService.createRating({
        student: activeStudent.id,
        class_ref: selectedClassId,
        domain: 'psychomotor',
        ratings,
      });
      toast.success(`Psychomotor Domain ratings saved successfully!`);
    } catch {
      toast.error('Failed to save ratings');
    }
  };

  const handlePrintCertificate = () => {
    setShowCert(false);
    toast.success(`Opening print dialogue for ${certType} awarded to ${activeStudent?.name}...`);
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Behaviour & Skills</span>
          <span>Psychomotor Domain Rating Report</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Left selector */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs font-black text-slate-800">Class Selection</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          {/* Student list */}
          <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-slate-800">Select Student</CardTitle>
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
                      <span className="text-[9px] text-slate-400 font-bold block">Roll No: {st.roll}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right dashboard content */}
        <div className="lg:col-span-3 space-y-6">
          {activeStudent && reportData ? (
            <>
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-100 bg-white p-4 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-455 font-black uppercase">Psychomotor Skill Index</span>
                    <span className="text-xl font-black text-slate-800 mt-1.5 block">{reportData.averageScore}%</span>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </Card>

                <Card className="border border-slate-100 bg-white p-4 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-455 font-black uppercase">Behavior Trend</span>
                    <span className={`text-xl font-black mt-1.5 block ${
                      reportData.trendDirection === 'Improving' ? 'text-emerald-600' : 'text-slate-800'
                    }`}>{reportData.trendDirection}</span>
                  </div>
                  <TrendingUp className={`w-8 h-8 ${
                    reportData.trendDirection === 'Improving' ? 'text-emerald-500' : 'text-slate-400'
                  }`} />
                </Card>

                <Card className="border border-slate-100 bg-white p-4 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-455 font-black uppercase">Printable Certificates</span>
                    <button
                      onClick={() => setShowCert(true)}
                      className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white text-[9.5px] font-black h-7.5 px-3 rounded-lg mt-2 flex items-center gap-1 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" /> Award Certificate
                    </button>
                  </div>
                  <Award className="w-8 h-8 text-amber-500" />
                </Card>
              </div>

              {/* Behavior Monthly Trend Chart simulation */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-purple-650" />
                  <CardTitle className="text-xs font-black text-slate-800">Monthly Behaviour Trends & Ratings</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {reportData.trendDetails.map((t) => (
                      <div key={t.month} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">{t.month}</span>
                        <div className="flex justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= t.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Behavior Observation Timeline (Phase 14) */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-650" />
                  <CardTitle className="text-xs font-black text-slate-800">Behaviour Progress Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-6 relative pl-10 border-l border-purple-100 ml-5 space-y-6">
                  {reportData.timeline.map((item, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Circle Dot */}
                      <span className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-850">{item.title}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({item.date})</span>
                      </div>
                      <p className="text-[9.5px] font-semibold text-slate-500">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Psychomotor Assessment ratings list */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                  <div>
                    <span className="text-[9px] text-purple-650 font-black uppercase tracking-wider block">Phase 6</span>
                    <CardTitle className="text-sm font-black text-slate-800 mt-1">Psychomotor Domain Ratings</CardTitle>
                  </div>
                  <Button
                    onClick={handleSaveRatings}
                    className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white text-xs font-bold h-9 rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
                  >
                    <Save className="w-4 h-4" /> Save Skill Matrix
                  </Button>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {PSYCHOMOTOR_FIELDS.map((field) => {
                      const val = ratings[field] || 4;
                      return (
                        <div key={field} className="flex items-center justify-between py-2 border-b border-slate-50 gap-4">
                          <span className="text-xs font-bold text-slate-700">{field}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                              {val === 5 ? 'Excellent' : val === 4 ? 'Very Good' : val === 3 ? 'Good' : 'Needs Imp.'}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => handleRatingChange(field, star)}
                                  className="hover:scale-115 transition-transform"
                                >
                                  <Star className={`w-4 h-4 ${star <= val ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insight Correlations Card */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-655" />
                  <CardTitle className="text-xs font-black text-slate-800">Behavior Cross-Correlation AI Insights</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-[10px] font-semibold text-slate-655">
                  {MOCK_INSIGHTS.map((ins, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <p className="text-slate-655 font-normal leading-relaxed text-[10.5px]">
                        {ins}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 shadow-3xs flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-xs font-bold text-slate-700">No Student Selected</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Please select a student on the left sidebar to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* 📜 CERTIFICATE MODAL */}
      {showCert && activeStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-800">Generate Merit Certificate</h3>
              <button onClick={() => setShowCert(false)} className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Certificate Select Options */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Select Certificate Category</label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="Behaviour Certificate">Student Behaviour Certificate</option>
                  <option value="Leadership Certificate">Student Leadership Certificate</option>
                  <option value="Perfect Attendance">Perfect Attendance Certificate</option>
                  <option value="Student of the Month">Student of the Month Merit</option>
                  <option value="Most Improved Student">Most Improved Student Achievement</option>
                </select>
              </div>

              {/* Certificate Visual Mock Preview */}
              <div className="border-[8px] border-amber-400 p-6 rounded-lg bg-amber-50/15 text-center space-y-4 select-none relative shadow-xs">
                <div className="absolute top-4 left-4 w-8 h-8 rounded-full border border-amber-300 flex items-center justify-center opacity-30">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-serif text-lg font-black text-slate-850 tracking-wider">CERTIFICATE OF MERIT</h4>
                <p className="text-[10px] text-slate-450 italic">This achievement is proudfully awarded to</p>
                <h2 className="text-lg font-bold font-serif text-[#6f42c1] underline decoration-amber-400 decoration-2 underline-offset-4">{activeStudent.name}</h2>
                <p className="text-[9px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  for demonstrating outstanding excellence and exceptional performance in <span className="font-bold">{certType}</span>.
                </p>
                <div className="flex justify-between items-end pt-4 text-[8px] text-slate-400 font-bold border-t border-amber-100/50 mt-4 px-8">
                  <div>
                    <span className="block border-b border-slate-300 pb-1 w-20 mx-auto">Class Instructor</span>
                  </div>
                  <div>
                    <span className="block border-b border-slate-300 pb-1 w-20 mx-auto">School Principal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCert(false)} className="text-xs h-9 rounded-xl px-4">
                Cancel
              </Button>
              <Button
                onClick={handlePrintCertificate}
                className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white font-bold text-xs h-9 rounded-xl px-6 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
