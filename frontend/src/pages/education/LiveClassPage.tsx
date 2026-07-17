import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, Plus, Trash2, CheckCircle, Eye, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { liveMeetingService, LiveMeeting } from '@/services/liveMeeting.service';

interface MeetingItem {
  id: string;
  code: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  message: string;
  status: boolean;
}

export default function LiveClassPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isStudent = role === 'student';

  // Clock state
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  // Form states
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [meetingWith, setMeetingWith] = useState('All Students');
  const [isSchedule, setIsSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [duration, setDuration] = useState('30 min');
  const [messageText, setMessageText] = useState('');

  // Tabs & Meetings lists
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'tomorrow' | 'self' | 'invitations'>('all');
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);

  useEffect(() => {
    generateRandomCode();
    loadMeetings();
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setCurrentDateStr(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }));
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ESK';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMeetingId(code);
  };

  const loadMeetings = async () => {
    try {
      const data = await liveMeetingService.getMeetings();
      const mapped: MeetingItem[] = data.map(m => ({
        id: m.id,
        code: m.code,
        title: m.title,
        date: m.date,
        time: m.time,
        duration: m.duration,
        message: m.message,
        status: m.is_active
      }));
      setMeetings(mapped);
    } catch (err) {
      console.error(err);
      setMeetings([]);
    }
  };

  const handleCreateOrJoin = async () => {
    if (!meetingTitle) {
      toast.error('Please enter a meeting title!');
      return;
    }

    try {
      const meetingWithMap: Record<string, string> = {
        'All Students': 'all',
        'Select Class': 'class',
        'Teachers Only': 'teachers'
      };

      const newMeeting = await liveMeetingService.createMeeting({
        code: meetingId,
        title: meetingTitle,
        meeting_with: meetingWithMap[meetingWith] as any || 'all',
        date: isSchedule ? scheduleDate : new Date().toISOString().split('T')[0],
        time: isSchedule ? scheduleTime : new Date().toTimeString().slice(0, 5),
        duration: isSchedule ? duration : '30 min',
        message: messageText || '',
        is_active: true
      });

      if (isSchedule) {
        toast.success('Meeting Scheduled successfully');
        setMeetingTitle('');
        generateRandomCode();
        setMessageText('');
        loadMeetings();
      } else {
        navigate(`/education/live-class/room?code=${meetingId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create meeting');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await liveMeetingService.deleteMeeting(id);
      setMeetings(prev => prev.filter(m => m.id !== id));
      toast.success('Meeting deleted successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete meeting');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const meeting = meetings.find(m => m.id === id);
      if (meeting) {
        await liveMeetingService.updateMeeting(id, { is_active: !meeting.status });
        setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: !m.status } : m));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update meeting status');
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-855 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate(isStudent ? '/student' : '/dashboard')}>Dashboard</span>
          <span>Live Class</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Host Meeting */}
        {!isStudent && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Host Meeting
            </h3>
          </div>

          <div className="space-y-4">
            {/* 1. Meeting Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Meeting Title*</label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Meeting title"
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            {/* 2. Meeting ID (Read Only Code) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Meeting ID*</label>
              <input
                type="text"
                value={meetingId}
                readOnly
                className="w-full text-xs h-10 rounded-xl border border-slate-100 bg-slate-50/50 px-3 font-mono font-bold text-slate-500 focus:outline-none cursor-not-allowed"
              />
            </div>

            {/* 3. Meeting With */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Meeting With*</label>
              <select
                value={meetingWith}
                onChange={(e) => setMeetingWith(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All Students">All Students</option>
                <option value="Select Class">Select Class</option>
                <option value="Teachers">Teachers Only</option>
              </select>
            </div>

            {/* 4. Schedule checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-700 select-none">
              <input
                type="checkbox"
                checked={isSchedule}
                onChange={(e) => setIsSchedule(e.target.checked)}
                className="rounded text-blue-650 focus:ring-blue-500 w-4 h-4 border-slate-300"
              />
              <span className="text-[11px] font-bold">I want to schedule this meeting</span>
            </label>

            {/* Conditional Schedule Fields */}
            {isSchedule && (
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Date*</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full text-[10px] h-8 rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Start Time*</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full text-[10px] h-8 rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Duration*</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full text-[10px] h-8 rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700"
                  />
                </div>
              </div>
            )}

            {/* 5. Message box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Description / Message</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your Message here, if any..."
                className="w-full text-xs h-24 rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-700 focus:outline-none resize-none"
              />
            </div>

            {/* Creation Trigger */}
            <button
              onClick={handleCreateOrJoin}
              className="w-full h-11 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-98 transition-all text-white font-extrabold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 mt-2"
            >
              {isSchedule ? 'Schedule' : 'Create & Join'}
            </button>
          </div>
        </div>
        )}

        {/* Right Panel: Calendar Clock & Meetings List */}
        <div className={`${isStudent ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
          {/* Header Time Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md flex justify-between items-center relative overflow-hidden">
            <div className="space-y-1 z-10">
              <h2 className="text-3xl font-black">{currentTime}</h2>
              <p className="text-xs text-blue-100 font-bold uppercase tracking-wider">{currentDateStr}</p>
            </div>
            <div className="z-10 text-right opacity-90">
              <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
                ● Code Cortex live class
              </span>
            </div>
            <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-white/5 skew-x-12 transform origin-bottom-right"></div>
          </div>

          {/* Meetings List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
              {(['all', 'today', 'tomorrow', 'self', 'invitations'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 h-7.5 rounded-lg font-bold text-[10px] uppercase transition-colors ${
                    activeTab === tab 
                      ? 'bg-blue-650 text-white' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-655'
                  }`}
                >
                  {tab === 'self' ? 'Self Hosted' : tab === 'invitations' ? 'Invitations' : tab}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs space-y-3">
                  <div className="w-16 h-16 border border-dashed border-slate-200 rounded-full mx-auto flex items-center justify-center text-slate-300">
                    <Video className="w-8 h-8" />
                  </div>
                  <p>No meeting found.</p>
                </div>
              ) : (
                meetings.map((m) => (
                  <div key={m.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex items-center justify-between gap-4 group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase">
                          Active Meeting
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Code: {m.code}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-850 text-sm leading-none">{m.title}</h4>
                      <p className="text-[10px] text-slate-450 font-bold leading-normal">
                        📅 {m.date} | ⏰ {m.time} | ⏳ Duration: {m.duration}
                      </p>
                      <p className="text-[10px] text-slate-400 italic leading-relaxed">{m.message}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle status */}
                      {!isStudent && (
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={m.status}
                            onChange={() => handleToggleStatus(m.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      )}

                      {/* Join Room action */}
                      <button
                        onClick={() => navigate(`/education/live-class/room?code=${m.code}`)}
                        className="h-8.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wide transition-colors"
                      >
                        Join Room
                      </button>

                      {/* Trash Delete */}
                      {!isStudent && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
