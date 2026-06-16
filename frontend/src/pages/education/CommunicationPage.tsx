import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import communicationService from '@/services/communication.service';

export default function CommunicationPage() {
  const location = useLocation();
  const [phone, setPhone] = useState(location.state?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    try {
      setLoading(true);

      await communicationService.sendWhatsAppTest(
        phone,
        'Test message from ERP'
      );

      alert('WhatsApp message sent');

    } catch (error) {
      console.error(error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication</h1>
        <p className="text-gray-500">
          WhatsApp communication testing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Test WhatsApp</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="923xxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Button
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Test Message'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
