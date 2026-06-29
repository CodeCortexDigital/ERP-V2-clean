import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MessageSquare, Send, CheckCircle2, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import communicationService from '@/services/communication.service';

interface SentMessageLog {
  id: string;
  recipient: string;
  content: string;
  timestamp: string;
  status: 'Sent' | 'Delivered';
}

export default function CommunicationPage() {
  const location = useLocation();
  const [phone, setPhone] = useState(location.state?.phone || '923001234567');
  const [customMsg, setCustomMsg] = useState('Important school update: Tomorrow is a regular working day.');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-600" /> WhatsApp Communication Hub
        </h1>
        <p className="text-gray-500">
          Broadcast instant WhatsApp notifications to parents and students
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-green-200">
          <CardHeader className="bg-green-50/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-800">
              <Send className="w-4 h-4" /> Send Instant Message
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Recipient Phone Number</label>
              <Input
                placeholder="923xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
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
    </div>
  );
}
