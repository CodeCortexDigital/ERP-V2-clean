import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { FeatureGate } from "@/hooks/useFeatureFlag"

export default function CommunicationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication</h1>
        <p className="text-gray-500">Manage messages, notifications, and WhatsApp integration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              WhatsApp automation is enabled for low-attendance alerts and overdue fee
              reminders. Configure templates and channel settings in the admin panel.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Auto triggers support attendance risk alerts and can be extended to send payment
              reminders and academic notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

