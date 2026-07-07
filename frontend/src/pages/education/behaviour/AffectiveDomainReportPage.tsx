import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, GraduationCap, Users, Calendar, Save, User, 
  ChevronRight, Clipboard, Award, ShieldAlert, Sparkles, MessageSquare, 
  Heart, CheckCircle2, AlertTriangle, Clock, Printer, Download, Share2, 
  Send, BarChart4, FileSpreadsheet, Check, Star 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';

const AFFECTIVE_DOMAIN_FIELDS = [
  "Interest in Learning", "Motivation", "Self Confidence", "Emotional Stability",
  "Patience", "Responsibility", "Respect", "Integrity", "Self Awareness",
  "Appreciation", "Curiosity", "Self Motivation"
];

interface AffectiveData {
  ratings: Record<string, number>;
  attendancePercent: number;
  lateArrivals: number;
  leaves: number;
  absentees: number;
  homeworkSubmitted: number;
  homeworkMissing: number;
  lateSubmissions: number;
  behaviourScore: number;
  grade: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  predictions: string[];
  alerts: string[];
}

export default function AffectiveDomainReportPage() {
  const navigate = useNavigate();

  // Search & Selector State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('Grade 1-A');
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedMonth, setSelectedMonth] = useState('July');

  // Student State
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any | null>(null);

  // Affective Report Data
  const [reportData, setReportData] = useState<AffectiveData | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  // AI Output Simulation
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const names = [
      { id: 's-1', name: 'Maryam Fatima', roll: '101' },
      { id: 's-2', name: 'Zainab Ahmed', roll: '102' },
      { id: 's-3', name: 'Ali Khan', roll: '103' },
      { id: 's-4', name: 'Muhammad Rizwan', roll: '104' },
      { id: 's-5', name: 'Ayesha Siddiqua', roll: '105' }
    ];
    setStudents(names);
    setActiveStudent(names[0]);
  }, [selectedClass]);

  useEffect(() => {
    if (activeStudent) {
      // Calculate/load data for the active student
      const key = `affective_ratings_${selectedSession}_${selectedTerm}_${selectedMonth}_${activeStudent.id}`;
      const saved = localStorage.getItem(key);
      
      let initialRatings: Record<string, number> = {};
      
      if (saved) {
        initialRatings = JSON.parse(saved).ratings;
      } else {
        AFFECTIVE_DOMAIN_FIELDS.forEach(f => {
          initialRatings[f] = activeStudent.id === 's-1' ? 5 : activeStudent.id === 's-3' ? 2 : 4;
        });
      }
      setRatings(initialRatings);
      setShowAiSummary(false);
      setAiSummary('');

      // Generate standard mock stats based on student profile
      if (activeStudent.id === 's-1') {
        // High performer Maryam
        setReportData({
          ratings: initialRatings,
          attendancePercent: 96,
          lateArrivals: 1,
          leaves: 2,
          absentees: 0,
          homeworkSubmitted: 18,
          homeworkMissing: 0,
          lateSubmissions: 0,
          behaviourScore: 95,
          grade: 'A+',
          riskLevel: 'Low',
          predictions: ['Likely Top Performer', 'Leadership Potential', 'Creative Talent'],
          alerts: ['Excellent improvement in class participation!', 'Perfect Attendance Target near']
        });
      } else if (activeStudent.id === 's-3') {
        // High risk Ali Khan
        setReportData({
          ratings: initialRatings,
          attendancePercent: 72,
          lateArrivals: 8,
          leaves: 4,
          absentees: 6,
          homeworkSubmitted: 9,
          homeworkMissing: 9,
          lateSubmissions: 5,
          behaviourScore: 48,
          grade: 'D',
          riskLevel: 'High',
          predictions: ['Needs Academic Support', 'Needs Counselling'],
          alerts: ['CRITICAL: Attendance below 75% limit!', 'Homework missing rate exceeds 50%', 'Multiple Late Arrivals logged']
        });
      } else {
        // Average student
        setReportData({
          ratings: initialRatings,
          attendancePercent: 88,
          lateArrivals: 3,
          leaves: 3,
          absentees: 1,
          homeworkSubmitted: 15,
          homeworkMissing: 2,
          lateSubmissions: 1,
          behaviourScore: 78,
          grade: 'B',
          riskLevel: 'Medium',
          predictions: ['STEM Potential', 'Sports Potential'],
          alerts: ['Minor homework submission alerts']
        });
      }
    }
  }, [activeStudent, selectedMonth, selectedTerm, selectedSession]);

  const fetchClasses = async () => {
    try {
      const res = await academicService.getClasses().catch(() => ({ data: [] }));
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
      if (data.length > 0) {
        setClasses(data);
        setSelectedClass(data[0].name);
      } else {
        setClasses([{ id: '1', name: 'Grade 1-A' }, { id: '2', name: 'Grade 1-B' }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRatingChange = (field: string, val: number) => {
    const updatedRatings = { ...ratings, [field]: val };
    setRatings(updatedRatings);
    if (reportData) {
      // Recalculate average behaviour score
      const sum = Object.values(updatedRatings).reduce((a, b) => a + b, 0);
      const score = Math.round((sum / (AFFECTIVE_DOMAIN_FIELDS.length * 5)) * 100);
      let grade = 'C';
      if (score >= 90) grade = 'A+';
      else if (score >= 80) grade = 'A';
      else if (score >= 70) grade = 'B';
      else if (score >= 60) grade = 'C';
      else grade = 'D';

      setReportData(prev => prev ? { ...prev, ratings: updatedRatings, behaviourScore: score, grade } : null);
    }
  };

  const handleSaveRatings = () => {
    if (!activeStudent || !reportData) return;
    const key = `affective_ratings_${selectedSession}_${selectedTerm}_${selectedMonth}_${activeStudent.id}`;
    localStorage.setItem(key, JSON.stringify({
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      class: selectedClass,
      ratings,
      reportData
    }));
    toast.success(`Affective Domain ratings saved successfully!`);
  };

  const triggerAISummary = () => {
    if (!activeStudent || !reportData) return;
    setGeneratingAI(true);
    toast.loading('AI is correlating behavior score, attendance, and homework patterns...');
    setTimeout(() => {
      if (reportData.riskLevel === 'Low') {
        setAiSummary(`${activeStudent.name} is an exceptionally motivated and attentive student. Displays excellent discipline, emotional stability, and self-confidence. Attendance is outstanding at ${reportData.attendancePercent}%, driving strong classroom conduct. Strong indicators of leadership talent and collaborative teamwork. Continue offering advanced creative challenges.`);
      } else if (reportData.riskLevel === 'High') {
        setAiSummary(`${activeStudent.name} is demonstrating declining classroom engagement, which correlates strongly with a critical attendance drop of ${reportData.attendancePercent}%. Multiple homework assignments (${reportData.homeworkMissing}) are missing. Displays lower self-control and interest in learning. Risk level is HIGH. Urgently schedule a counselling session and set target parent communication.`);
      } else {
        setAiSummary(`${activeStudent.name} shows stable learning behavior, with good cooperation and responsibility. Homework submissions are general with slight late rates. Self-motivation and emotional stability are solid. Suggest scheduling a leadership activity next term to boost confidence.`);
      }
      toast.dismiss();
      setShowAiSummary(true);
      setGeneratingAI(false);
    }, 1200);
  };

  const triggerParentCommunication = (channel: 'SMS' | 'WhatsApp' | 'Email') => {
    if (!activeStudent) return;
    toast.success(`Merit report card notification sent to parent of ${activeStudent.name} via ${channel}`);
  };

  const triggerExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    if (!activeStudent) return;
    toast.success(`Generating student behavior analytics report package in ${format} format...`);
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Behaviour & Skills</span>
          <span>Affective Domain Rating Report</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Left Column Selection */}
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
                <label className="block text-[8px] font-black text-slate-455 uppercase mb-1">Class Name</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full text-xs h-9.5 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:outline-none"
                >
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Student List */}
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

        {/* Right Column Intelligence Dashboard */}
        <div className="lg:col-span-3 space-y-6">
          {activeStudent && reportData ? (
            <>
              {/* Top Summary Bar Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-slate-100 shadow-3xs bg-white p-4 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-black uppercase">Overall Behaviour Score</span>
                  <span className="text-xl font-black text-slate-800 mt-2">{reportData.behaviourScore}%</span>
                </Card>

                <Card className="border border-slate-100 shadow-3xs bg-white p-4 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-black uppercase">Behavior Grade</span>
                  <span className="text-xl font-black text-[#6f42c1] mt-2">{reportData.grade}</span>
                </Card>

                <Card className="border border-slate-100 shadow-3xs bg-white p-4 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-black uppercase">Attendance Rate</span>
                  <span className={`text-xl font-black mt-2 ${reportData.attendancePercent < 75 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {reportData.attendancePercent}%
                  </span>
                </Card>

                <Card className="border border-slate-100 shadow-3xs bg-white p-4 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-black uppercase">Risk Classification</span>
                  <Badge className={`mt-2 font-black uppercase text-[9px] tracking-wider w-fit px-3 py-1 ${
                    reportData.riskLevel === 'Low' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : reportData.riskLevel === 'Medium' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {reportData.riskLevel} Risk
                  </Badge>
                </Card>
              </div>

              {/* Alerts and System Warnings */}
              {reportData.alerts.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-250 rounded-2xl p-4 text-[10px] font-semibold text-amber-850 space-y-2 flex flex-col">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>System Alerts & Notifications</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700 font-normal">
                    {reportData.alerts.map((al, idx) => <li key={idx}>{al}</li>)}
                  </ul>
                </div>
              )}

              {/* Main Affective Domain rating form card */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                  <div>
                    <span className="text-[9px] text-purple-650 font-black uppercase tracking-wider block">Phase 5</span>
                    <CardTitle className="text-sm font-black text-slate-800 mt-1">Affective Domain Ratings</CardTitle>
                  </div>
                  <Button
                    onClick={handleSaveRatings}
                    className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white text-xs font-bold h-9 rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
                  >
                    <Save className="w-4 h-4" /> Save Report Card
                  </Button>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {AFFECTIVE_DOMAIN_FIELDS.map((field) => {
                      const val = ratings[field] || 4;
                      return (
                        <div key={field} className="flex items-center justify-between py-2 border-b border-slate-50 gap-4">
                          <span className="text-xs font-bold text-slate-750">{field}</span>
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

              {/* Attendance and Homework Analysis Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance block */}
                <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                    <BarChart4 className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-xs font-black text-slate-800">Attendance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-[10px] font-semibold text-slate-655">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-400 text-[8.5px] block font-black uppercase">Late Arrivals</span>
                        <span className="text-slate-800 text-sm font-black mt-1 block">{reportData.lateArrivals}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-400 text-[8.5px] block font-black uppercase">Approved Leaves</span>
                        <span className="text-slate-800 text-sm font-black mt-1 block">{reportData.leaves}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-400 text-[8.5px] block font-black uppercase">Absentees</span>
                        <span className={`text-slate-800 text-sm font-black mt-1 block ${reportData.absentees > 3 ? 'text-rose-600' : ''}`}>
                          {reportData.absentees}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50/30 border border-purple-100 rounded-xl space-y-1">
                      <span className="text-[9px] text-purple-650 font-black uppercase block">Behaviour Correlation</span>
                      <p className="text-slate-650 font-normal leading-relaxed text-[9.5px]">
                        {reportData.attendancePercent >= 90 
                          ? 'Excellent attendance metrics correlate strongly with Maryam\'s high discipline and focus.'
                          : 'Critical absenteeism acts as a direct root cause for decreased class participation and lower homework completion rates.'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Homework block */}
                <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                    <Clipboard className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-xs font-black text-slate-800">Homework & Task Tracker</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-[10px] font-semibold text-slate-655">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-400 text-[8.5px] block font-black uppercase">Submitted</span>
                        <span className="text-emerald-600 text-sm font-black mt-1 block">{reportData.homeworkSubmitted}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-400 text-[8.5px] block font-black uppercase">Missing</span>
                        <span className={`text-sm font-black mt-1 block ${reportData.homeworkMissing > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {reportData.homeworkMissing}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-400 text-[8.5px] block font-black uppercase">Late</span>
                        <span className="text-amber-600 text-sm font-black mt-1 block">{reportData.lateSubmissions}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] text-slate-400 font-black uppercase mr-1">Predictive Archetype Tags:</span>
                      {reportData.predictions.map(pred => (
                        <Badge key={pred} className="bg-purple-100 text-purple-800 text-[8.5px] font-black tracking-wider uppercase border border-purple-200">
                          {pred}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Behaviour Analysis Generator Card */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-650 animate-pulse" />
                    <CardTitle className="text-xs font-black text-slate-800">AI Behavior summary Engine</CardTitle>
                  </div>
                  <Button
                    onClick={triggerAISummary}
                    disabled={generatingAI}
                    className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white text-xs font-bold h-9 rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" /> Generate AI Analysis
                  </Button>
                </CardHeader>
                <CardContent className="p-5">
                  {showAiSummary ? (
                    <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-xl space-y-3.5 text-[10px] font-semibold text-slate-655 leading-relaxed">
                      <div className="flex items-center gap-1 text-purple-650 font-bold border-b border-slate-150 pb-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>AI REPORT SUMMARY MATRIX</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-normal text-[10.5px]">
                        {aiSummary}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 italic text-xs font-normal">
                      Click the button in header to construct natural language assessment.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Communication and Export Card */}
              <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-purple-600" />
                  <CardTitle className="text-xs font-black text-slate-800">Communication & Export Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 border-r border-slate-150 pr-4">
                    <button
                      onClick={() => triggerParentCommunication('SMS')}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-black h-8.5 px-3.5 rounded-xl border border-purple-200 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Send SMS
                    </button>
                    <button
                      onClick={() => triggerParentCommunication('WhatsApp')}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-black h-8.5 px-3.5 rounded-xl border border-emerald-200 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" /> Send WhatsApp
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerExport('PDF')}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-655 text-[9px] font-black h-8.5 px-3.5 rounded-xl border border-slate-150 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download PDF
                    </button>
                    <button
                      onClick={() => triggerExport('Excel')}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-655 text-[9px] font-black h-8.5 px-3.5 rounded-xl border border-slate-150 flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-slate-455" /> Export Excel
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 shadow-3xs flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-xs font-bold text-slate-700">No Student Selected</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Select class and student to compute domains assessment report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
