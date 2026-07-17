import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, GraduationCap, Users, Calendar, Save, User, 
  ChevronRight, Clipboard, Plus, ShieldAlert, Sparkles, MessageSquare, 
  Heart, CheckCircle2, AlertTriangle, Clock, Send, Check, X 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';
import behaviourService from '@/services/behaviour.service';

const INCIDENT_TYPES = [
  "Late Arrival", "Uniform Issue", "Homework Missing", "Bullying", "Cheating",
  "Misconduct", "Fighting", "Property Damage", "Disrespect", "Mobile Usage", "Other"
];

interface IncidentEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  type: string;
  date: string;
  teacherName: string;
  description: string;
  actionTaken: string;
  parentNotified: boolean;
  status: 'Resolved' | 'Pending';
}

interface ParentMeetingEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  meetingDate: string;
  reason: string;
  discussion: string;
  outcome: string;
  followUpDate: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

interface CounsellingEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  counsellor: string;
  reason: string;
  recommendations: string;
  followUp: string;
  improvementNotes: string;
}

export default function ObservationsPage() {
  const navigate = useNavigate();

  // Search & Selector State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('Grade 1-A');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [activeStudent, setActiveStudent] = useState<any | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'incidents' | 'meetings' | 'counselling'>('incidents');

  // Database Logs
  const [incidents, setIncidents] = useState<IncidentEntry[]>([]);
  const [meetings, setMeetings] = useState<ParentMeetingEntry[]>([]);
  const [counsellingList, setCounsellingList] = useState<CounsellingEntry[]>([]);

  // Form states
  const [showForm, setShowForm] = useState(false);

  // Incident form fields
  const [incType, setIncType] = useState('Late Arrival');
  const [incDate, setIncDate] = useState('2026-07-04');
  const [incTeacher, setIncTeacher] = useState('Zainab Ahmed');
  const [incDesc, setIncDesc] = useState('');
  const [incAction, setIncAction] = useState('');
  const [incNotified, setIncNotified] = useState(false);
  const [incStatus, setIncStatus] = useState<'Resolved' | 'Pending'>('Pending');

  // Parent meeting form fields
  const [meetDate, setMeetDate] = useState('2026-07-04');
  const [meetReason, setMeetReason] = useState('');
  const [meetDiscussion, setMeetDiscussion] = useState('');
  const [meetOutcome, setMeetOutcome] = useState('');
  const [meetFollowUp, setMeetFollowUp] = useState('2026-07-11');
  const [meetStatus, setMeetStatus] = useState<'Scheduled' | 'Completed' | 'Cancelled'>('Scheduled');

  // Counselling form fields
  const [counselDate, setCounselDate] = useState('2026-07-04');
  const [counselorName, setCounselorName] = useState('Sister Amina (School Counsellor)');
  const [counselReason, setCounselReason] = useState('');
  const [counselRec, setCounselRec] = useState('');
  const [counselFollowUp, setCounselFollowUp] = useState('2026-07-18');
  const [counselNotes, setCounselNotes] = useState('');

  useEffect(() => {
    fetchClasses();
    loadAllLogs();
  }, []);

  useEffect(() => {
    const names = [];
    setStudents(names);
    setActiveStudent(names[0]);
  }, [selectedClass]);

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

  const loadAllLogs = async () => {
    try {
      const res = await behaviourService.getObservations({});
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
      const inc: IncidentEntry[] = [];
      const met: ParentMeetingEntry[] = [];
      const coun: CounsellingEntry[] = [];
      data.forEach((o: any) => {
        if (o.observation_type === 'incident') {
          inc.push({ id: o.id, studentId: o.student, studentName: o.student_name, className: o.class_name, type: o.title, date: o.date, teacherName: o.reported_by_name || '', description: o.description, actionTaken: o.action_taken || '', parentNotified: o.parent_notified || false, status: o.status || 'Pending' });
        } else if (o.observation_type === 'meeting') {
          met.push({ id: o.id, studentId: o.student, studentName: o.student_name, className: o.class_name, meetingDate: o.date, reason: o.title, discussion: o.description, outcome: o.outcome || '', followUpDate: o.follow_up_date || '', status: o.status || 'Scheduled' });
        } else {
          coun.push({ id: o.id, studentId: o.student, studentName: o.student_name, className: o.class_name, date: o.date, counsellor: o.reported_by_name || '', reason: o.title, recommendations: o.description, followUp: o.follow_up_date || '', improvementNotes: o.outcome || '' });
        }
      });
      setIncidents(inc);
      setMeetings(met);
      setCounsellingList(coun);
    } catch {
      // empty on failure
    }
  };

  const resetFormFields = () => {
    setIncType('Late Arrival');
    setIncDate('2026-07-04');
    setIncDesc('');
    setIncAction('');
    setIncNotified(false);
    setIncStatus('Pending');

    setMeetReason('');
    setMeetDiscussion('');
    setMeetOutcome('');
    setMeetFollowUp('2026-07-11');
    setMeetStatus('Scheduled');

    setCounselReason('');
    setCounselRec('');
    setCounselNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !selectedClassId) return;

    try {
      const basePayload: any = {
        student: activeStudent.id,
        class_ref: selectedClassId,
        date: activeTab === 'incidents' ? incDate : activeTab === 'meetings' ? meetDate : counselDate,
      };

      if (activeTab === 'incidents') {
        await behaviourService.createObservation({
          ...basePayload,
          observation_type: 'incident',
          title: incType,
          description: incDesc,
          action_taken: incAction,
          parent_notified: incNotified,
          status: incStatus,
        });
        toast.success('Incident logged successfully');
      } else if (activeTab === 'meetings') {
        await behaviourService.createObservation({
          ...basePayload,
          observation_type: 'meeting',
          title: meetReason,
          description: meetDiscussion,
          outcome: meetOutcome,
          follow_up_date: meetFollowUp,
          status: meetStatus,
        });
        toast.success('Parent meeting logged successfully');
      } else {
        await behaviourService.createObservation({
          ...basePayload,
          observation_type: 'counselling',
          title: counselReason,
          description: counselRec,
          follow_up_date: counselFollowUp,
          outcome: counselNotes,
        });
        toast.success('Counselling session logged successfully');
      }
      await loadAllLogs();
    } catch {
      toast.error('Failed to save record');
    }

    setShowForm(false);
    resetFormFields();
  };

  const handleResolveIncident = async (id: string) => {
    try {
      await behaviourService.updateObservation(id, { status: 'Resolved' });
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'Resolved' as const } : inc));
      toast.success('Incident resolved successfully');
    } catch {
      toast.error('Failed to resolve incident');
    }
  };

  // Filter logs based on active student
  const filteredIncidents = incidents.filter(i => i.studentId === activeStudent?.id);
  const filteredMeetings = meetings.filter(m => m.studentId === activeStudent?.id);
  const filteredCounselling = counsellingList.filter(c => c.studentId === activeStudent?.id);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Behaviour & Skills</span>
          <span>Observations & Incident Management</span>
        </div>

        {activeStudent && (
          <button
            onClick={() => { resetFormFields(); setShowForm(true); }}
            className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-9.5 rounded-lg shadow-2xs px-4 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> {activeTab === 'incidents' ? 'Log Incident' : activeTab === 'meetings' ? 'Schedule Meeting' : 'Log Counselling'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Left Column */}
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

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-6">
          {activeStudent ? (
            <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-purple-650 font-black uppercase tracking-wider block">Student Timeline Logs</span>
                    <CardTitle className="text-sm font-black text-slate-800 mt-1">{activeStudent.name}</CardTitle>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200/60 pb-1">
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className={`pb-2 px-1 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'incidents' 
                        ? 'border-purple-650 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Incidents ({filteredIncidents.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('meetings')}
                    className={`pb-2 px-1 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'meetings' 
                        ? 'border-purple-650 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Parent Meetings ({filteredMeetings.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('counselling')}
                    className={`pb-2 px-1 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'counselling' 
                        ? 'border-purple-650 text-purple-700' 
                        : 'border-transparent text-slate-400 hover:text-slate-655'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    Counselling ({filteredCounselling.length})
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {/* Incidents List */}
                {activeTab === 'incidents' && (
                  <div className="space-y-4">
                    {filteredIncidents.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic font-normal">No behavior incidents logged for this student.</div>
                    ) : (
                      filteredIncidents.map((inc) => (
                        <div key={inc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2 text-[10px] font-semibold text-slate-655">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-50 text-rose-700 border border-rose-100 text-[8px] font-black tracking-wider uppercase">
                                {inc.type}
                              </Badge>
                              <span className="text-[9px] text-slate-400 font-mono">{inc.date}</span>
                            </div>
                            <h4 className="text-xs font-black text-slate-800">Reported by: {inc.teacherName}</h4>
                            <p className="text-slate-550 leading-relaxed font-normal">{inc.description}</p>
                            {inc.actionTaken && (
                              <p className="bg-purple-50/50 p-2 border border-purple-100 rounded-lg text-purple-750">
                                <span className="font-bold">Action Taken: </span>{inc.actionTaken}
                              </p>
                            )}
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase">
                              <span>Parent Notified: </span>
                              <Badge className={inc.parentNotified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                                {inc.parentNotified ? 'YES' : 'NO'}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center shrink-0">
                            {inc.status === 'Pending' ? (
                              <Button
                                onClick={() => handleResolveIncident(inc.id)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-black h-8 rounded-xl px-3 flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Mark Resolved
                              </Button>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-xl">
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Meetings List */}
                {activeTab === 'meetings' && (
                  <div className="space-y-4">
                    {filteredMeetings.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic font-normal">No parent meetings scheduled or logged.</div>
                    ) : (
                      filteredMeetings.map((m) => (
                        <div key={m.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-[10px] font-semibold text-slate-655">
                          <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800">Reason: {m.reason}</span>
                              <span className="text-[9px] text-slate-400 font-mono">({m.meetingDate})</span>
                            </div>
                            <Badge className="bg-purple-100 text-purple-700 uppercase font-black text-[8px]">
                              {m.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black block">DISCUSSION LOG</span>
                            <p className="text-slate-600 font-normal leading-relaxed">{m.discussion}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black block">OUTCOME</span>
                            <p className="text-slate-700 font-bold leading-relaxed">{m.outcome}</p>
                          </div>
                          {m.followUpDate && (
                            <div className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-1">
                              <span>Next Follow-up: </span>
                              <span className="font-mono text-rose-600">{m.followUpDate}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Counselling List */}
                {activeTab === 'counselling' && (
                  <div className="space-y-4">
                    {filteredCounselling.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic font-normal">No counselling sessions registered for this student.</div>
                    ) : (
                      filteredCounselling.map((c) => (
                        <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 text-[10px] font-semibold text-slate-655">
                          <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                            <div>
                              <h4 className="text-xs font-black text-slate-800">Counsellor: {c.counsellor}</h4>
                              <span className="text-[9px] text-slate-400 font-mono">Session Date: {c.date}</span>
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[8px]">
                              Active Session
                            </Badge>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black block">REASON FOR SESSION</span>
                            <p className="text-slate-600 font-normal leading-relaxed">{c.reason}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black block">RECOMMENDATIONS</span>
                            <p className="text-purple-800 leading-relaxed">{c.recommendations}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black block">IMPROVEMENT & PROGRESS NOTES</span>
                            <p className="text-slate-600 font-normal leading-relaxed">{c.improvementNotes}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 shadow-3xs flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-xs font-bold text-slate-700">No Student Selected</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Please select a class and student from the left menu to view logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* 📝 OBSERVATIONS LOGGING MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-800">
                {activeTab === 'incidents' ? 'Log New Incident' : activeTab === 'meetings' ? 'Schedule Parent Meeting' : 'Log Counselling Session'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* INCIDENTS FORM */}
                {activeTab === 'incidents' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Incident Type *</label>
                        <select
                          value={incType}
                          onChange={(e) => setIncType(e.target.value)}
                          className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                        >
                          {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Incident Date *</label>
                        <Input
                          type="date"
                          required
                          value={incDate}
                          onChange={(e) => setIncDate(e.target.value)}
                          className="text-xs h-10 rounded-xl border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Description *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Detail the incident, context, or evidence..."
                        value={incDesc}
                        onChange={(e) => setIncDesc(e.target.value)}
                        className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Action Taken</label>
                      <Input
                        placeholder="e.g. Warning letter issued, mobile confiscated"
                        value={incAction}
                        onChange={(e) => setIncAction(e.target.value)}
                        className="text-xs h-10 rounded-xl border-slate-200"
                      />
                    </div>

                    <div className="flex items-center gap-5">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-655 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={incNotified}
                          onChange={(e) => setIncNotified(e.target.checked)}
                          className="rounded border-slate-350 text-purple-650 focus:ring-purple-500 w-4 h-4"
                        />
                        Notify Parent Immediately
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                        <select
                          value={incStatus}
                          onChange={(e) => setIncStatus(e.target.value as any)}
                          className="text-xs h-8 rounded-lg border border-slate-200 bg-white px-2 font-bold text-slate-700 focus:outline-none"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* PARENT MEETINGS FORM */}
                {activeTab === 'meetings' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Meeting Date *</label>
                        <Input
                          type="date"
                          required
                          value={meetDate}
                          onChange={(e) => setMeetDate(e.target.value)}
                          className="text-xs h-10 rounded-xl border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Follow-up Date</label>
                        <Input
                          type="date"
                          value={meetFollowUp}
                          onChange={(e) => setMeetFollowUp(e.target.value)}
                          className="text-xs h-10 rounded-xl border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Reason for Meeting *</label>
                      <Input
                        required
                        placeholder="e.g. Attendance issues, behavior drop, bullying incident"
                        value={meetReason}
                        onChange={(e) => setMeetReason(e.target.value)}
                        className="text-xs h-10 rounded-xl border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Discussion Details</label>
                      <textarea
                        rows={3}
                        placeholder="Log parent responses, student explanations, and feedback..."
                        value={meetDiscussion}
                        onChange={(e) => setMeetDiscussion(e.target.value)}
                        className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Meeting Outcome *</label>
                      <Input
                        required
                        placeholder="e.g. Parent agreed to limit device usage, monthly target set"
                        value={meetOutcome}
                        onChange={(e) => setMeetOutcome(e.target.value)}
                        className="text-xs h-10 rounded-xl border-slate-200"
                      />
                    </div>
                  </>
                )}

                {/* COUNSELLING FORM */}
                {activeTab === 'counselling' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Session Date *</label>
                        <Input
                          type="date"
                          required
                          value={counselDate}
                          onChange={(e) => setCounselDate(e.target.value)}
                          className="text-xs h-10 rounded-xl border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Counsellor Name *</label>
                        <Input
                          required
                          value={counselorName}
                          onChange={(e) => setCounselorName(e.target.value)}
                          className="text-xs h-10 rounded-xl border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Reason for Counseling *</label>
                      <Input
                        required
                        placeholder="e.g. Repeated fighting, emotional outburst"
                        value={counselReason}
                        onChange={(e) => setCounselReason(e.target.value)}
                        className="text-xs h-10 rounded-xl border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Counselling Recommendations *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Counsellor suggestions for teachers, parents..."
                        value={counselRec}
                        onChange={(e) => setCounselRec(e.target.value)}
                        className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Improvement / Progress Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Current indicators of behavioral improvement..."
                        value={counselNotes}
                        onChange={(e) => setCounselNotes(e.target.value)}
                        className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="text-xs h-9.5 rounded-xl px-4">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#6f42c1] hover:bg-[#5a32a3] text-white font-bold text-xs h-9.5 rounded-xl px-6 shadow-sm">
                    Save Record
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
