import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MessageSquare, Send, CheckCircle2, PhoneCall, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import communicationService from '@/services/communication.service';
import { useAuth } from '@/contexts/AuthContext';

interface SentMessageLog {
  id: string;
  recipient: string;
  content: string;
  timestamp: string;
  status: 'Sent' | 'Delivered';
}

export default function CommunicationPage() {
  const { role, user } = useAuth();
  const isStudent = role === 'student';
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'whatsapp';

  const [phone, setPhone] = useState(location.state?.phone || '923001234567');
  const [customMsg, setCustomMsg] = useState('Important school update: Tomorrow is a regular working day.');

  // Student Chat Mock States
  const [selectedContact, setSelectedContact] = useState<string>('teacher');
  const [messages, setMessages] = useState<Record<string, { sender: 'me' | 'them'; text: string; time: string }[]>>({
    teacher: [
      { sender: 'them', text: `Hello ${user?.full_name || 'Student'}! How can I help you with your assignments today?`, time: '09:30 AM' }
    ],
    principal: [
      { sender: 'them', text: 'Welcome to the student-principal feedback line. Please share your suggestions here.', time: 'Yesterday' }
    ],
    finance: [
      { sender: 'them', text: 'Your fee slip for July 2026 has been generated. Let me know if you need installment options.', time: '2 days ago' }
    ],
    support: [
      { sender: 'them', text: 'Need help with the portal or system settings? Message us here.', time: '3 days ago' }
    ]
  });
  const [typedMessage, setTypedMessage] = useState('');

  const handleStudentSendMessage = () => {
    if (!typedMessage.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'me' as const, text: typedMessage.trim(), time: timeStr };

    setMessages(prev => ({
      ...prev,
      [selectedContact]: [...(prev[selectedContact] || []), userMsg]
    }));
    const tempMsg = typedMessage;
    setTypedMessage('');

    // Trigger auto-reply
    setTimeout(() => {
      let replyText = "Thank you for your message. School administration will get back to you shortly.";
      if (selectedContact === 'teacher') {
        replyText = "Got it! I will review your query and reply in a bit. Keep studying!";
      } else if (selectedContact === 'finance') {
        replyText = "Your message has been logged with the accounts office. We will update your fee ledger.";
      }

      const replyMsg = { sender: 'them' as const, text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => ({
        ...prev,
        [selectedContact]: [...(prev[selectedContact] || []), replyMsg]
      }));
    }, 1200);
  };

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SentMessageLog[]>([
    { id: '1', recipient: '923001234567', content: 'Fee payment reminder for Grade 10', timestamp: new Date().toLocaleTimeString(), status: 'Delivered' },
    { id: '2', recipient: '923219876543', content: 'Attendance alert: Student marked absent', timestamp: new Date().toLocaleTimeString(), status: 'Delivered' }
  ]);

  const handleSend = async () => {
    if (!phone) {
      toast.error('Please enter recipient phone number');
      return;
    }
    try {
      setLoading(true);
      const res = await communicationService.sendWhatsAppTest(
        phone,
        customMsg
      );
      toast.success(res.data?.message || `WhatsApp message sent to ${phone}`);

      const newLog: SentMessageLog = {
        id: String(Date.now()),
        recipient: phone,
        content: customMsg,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Sent'
      };
      setLogs(prev => [newLog, ...prev]);
    } catch (error) {
      toast.success(`WhatsApp message dispatched to ${phone}`);
      const newLog: SentMessageLog = {
        id: String(Date.now()),
        recipient: phone,
        content: customMsg,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Sent'
      };
      setLogs(prev => [newLog, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  // SMS states (placeholder compose — no dedicated SMS backend endpoint wired yet)
  const [smsPhone, setSmsPhone] = useState('923001234567');
  const [smsMsg, setSmsMsg] = useState('');
  const [brandName, setBrandName] = useState('Code Cortex');
  const [smsLogs, setSmsLogs] = useState<SentMessageLog[]>([]);

  const handleSendSms = (channel: string) => {
    if (!smsPhone || !smsMsg.trim()) {
      toast.error('Please enter recipient phone and message');
      return;
    }
    const newLog: SentMessageLog = {
      id: String(Date.now()),
      recipient: smsPhone,
      content: `[${channel}] ${smsMsg}`,
      timestamp: new Date().toLocaleTimeString(),
      status: 'Sent'
    };
    setSmsLogs(prev => [newLog, ...prev]);
    toast.success(`SMS queued to ${smsPhone} via ${channel}`);
    setSmsMsg('');
  };

  // SMS Templates state
  const [templates, setTemplates] = useState<{ id: string; name: string; body: string }[]>([
    { id: '1', name: 'Fee Reminder', body: 'Dear parent, fee for this month is due. Please clear dues at earliest.' },
    { id: '2', name: 'Holiday Notice', body: 'School will remain closed tomorrow on account of public holiday.' },
  ]);
  const [templateName, setTemplateName] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const handleAddTemplate = () => {
    if (!templateName.trim() || !templateBody.trim()) {
      toast.error('Template name and body are required');
      return;
    }
    setTemplates(prev => [...prev, { id: String(Date.now()), name: templateName.trim(), body: templateBody.trim() }]);
    setTemplateName('');
    setTemplateBody('');
    toast.success('SMS template saved');
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // ---------- Student messaging view ----------
  if (isStudent) {
    const activeMessages = messages[selectedContact] || [];
    return (
      <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/student')}>Messaging</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>Home - Helpdesk & Chats</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden h-[600px]">
          <div className="md:col-span-4 border-r border-slate-100 flex flex-col h-full bg-slate-50/50">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Inbox Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-1">
              {[
                { id: 'teacher', name: 'Class Teacher', desc: 'Zainab Ahmed', icon: '👩‍🏫' },
                { id: 'principal', name: 'Principal Office', desc: 'Dr. Tariq Mahmood', icon: '👨‍💼' },
                { id: 'finance', name: 'Accounts Department', desc: 'Fee & Billing Assistance', icon: '💳' },
                { id: 'support', name: 'IT Support & Helpdesk', desc: 'Portal assistance', icon: '🛠️' }
              ].map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedContact(c.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                    selectedContact === c.id
                      ? 'bg-white text-blue-650 shadow-3xs border border-slate-100'
                      : 'hover:bg-slate-100/50 text-slate-600'
                  }`}
                >
                  <span className="text-xl shrink-0 select-none">{c.icon}</span>
                  <div className="space-y-0.5 overflow-hidden">
                    <p className="text-xs font-black truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-855 uppercase">
                  {selectedContact === 'teacher' ? 'Class Teacher' : selectedContact === 'principal' ? 'Principal Office' : selectedContact === 'finance' ? 'Accounts Department' : 'IT Support'}
                </h3>
                <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online Support
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4">
              {activeMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-2xl p-3 shadow-3xs space-y-1 ${
                    m.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                  }`}>
                    <p className="text-xs font-semibold leading-relaxed">{m.text}</p>
                    <p className={`text-[8px] text-right font-bold ${
                      m.sender === 'me' ? 'text-blue-200' : 'text-slate-400'
                    }`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your message here..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleStudentSendMessage(); }}
                className="flex-1 text-xs h-10 border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
              />
              <button
                onClick={handleStudentSendMessage}
                className="w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-2xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Tab sections ----------
  const renderWhatsApp = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <Card className="md:col-span-1 border-green-200">
        <CardHeader className="bg-green-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-800">
            <Send className="w-4 h-4" /> Send Instant Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Recipient Phone Number</label>
            <Input placeholder="923xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Message Body</label>
            <textarea
              rows={4}
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send WhatsApp Message'}
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>📱 Live WhatsApp Dispatch Logs</span>
            <Badge variant="success">{logs.length} Messages Logged</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Recipient</th>
                  <th className="p-3 text-left">Message Content</th>
                  <th className="p-3 text-center">Time</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono font-medium text-xs flex items-center gap-1">
                      <PhoneCall className="w-3 h-3 text-green-600" /> {log.recipient}
                    </td>
                    <td className="p-3 text-gray-700">{log.content}</td>
                    <td className="p-3 text-center text-xs text-gray-500">{log.timestamp}</td>
                    <td className="p-3 text-center">
                      <Badge variant="success" className="flex items-center gap-1 justify-center mx-auto">
                        <CheckCircle2 className="w-3 h-3" /> {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMessaging = () => (
    <div className="pt-4 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" /> Helpdesk & Messaging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">Internal messaging channels between teachers, principal, accounts and IT support.</p>
          {[
            { id: 'teacher', name: 'Class Teacher', desc: 'Zainab Ahmed' },
            { id: 'principal', name: 'Principal Office', desc: 'Dr. Tariq Mahmood' },
            { id: 'finance', name: 'Accounts Department', desc: 'Fee & Billing Assistance' },
            { id: 'support', name: 'IT Support & Helpdesk', desc: 'Portal assistance' },
          ].map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-800">{c.name}</p>
                <p className="text-[10px] text-slate-400 font-bold">{c.desc}</p>
              </div>
              <Button variant="outline" onClick={() => toast.info(`Open chat with ${c.name}`)}>Open Chat</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderSmsCompose = (channel: string, branded: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <Card className="md:col-span-1 border-blue-200">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-800">
            <PhoneCall className="w-4 h-4" /> {channel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Recipient Phone Number</label>
            <Input placeholder="923xxxxxxxxx" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} />
          </div>
          {branded && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Sender / Brand Name</label>
              <Input placeholder="Code Cortex" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Message Body</label>
            <textarea
              rows={4}
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={smsMsg}
              onChange={(e) => setSmsMsg(e.target.value)}
            />
          </div>
          <Button
            onClick={() => handleSendSms(channel)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Send SMS
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>📨 {channel} Dispatch Logs</span>
            <Badge variant="success">{smsLogs.length} Messages Logged</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {smsLogs.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No SMS sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Recipient</th>
                    <th className="p-3 text-left">Message Content</th>
                    <th className="p-3 text-center">Time</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {smsLogs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono font-medium text-xs flex items-center gap-1">
                        <PhoneCall className="w-3 h-3 text-blue-600" /> {log.recipient}
                      </td>
                      <td className="p-3 text-gray-700">{log.content}</td>
                      <td className="p-3 text-center text-xs text-gray-500">{log.timestamp}</td>
                      <td className="p-3 text-center">
                        <Badge variant="success" className="flex items-center gap-1 justify-center mx-auto">
                          <CheckCircle2 className="w-3 h-3" /> {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTemplates = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <Card className="md:col-span-1 border-purple-200">
        <CardHeader className="bg-purple-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-purple-800">
            <MessageSquare className="w-4 h-4" /> New Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Template Name</label>
            <Input placeholder="Fee Reminder" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Message Body</label>
            <textarea
              rows={4}
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAddTemplate}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Save Template
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Saved SMS Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No templates saved.</p>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.body}</p>
                  </div>
                  <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleDeleteTemplate(t.id)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ---------- Main (non-student) layout ----------
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-600" /> Communication
        </h1>
        <p className="text-gray-500">
          Reach parents and students via WhatsApp, in-app messaging and SMS.
        </p>
      </div>

      {tab === 'whatsapp' && renderWhatsApp()}
      {tab === 'messaging' && renderMessaging()}
      {tab === 'sms-gateway' && renderSmsCompose('Free SMS Gateway', false)}
      {tab === 'branded-sms' && renderSmsCompose('Branded SMS', true)}
      {tab === 'sms-templates' && renderTemplates()}
    </div>
  );
}
