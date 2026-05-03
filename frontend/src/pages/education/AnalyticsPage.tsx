import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-500">Student insights, risk assessment, and recommendations</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Smart Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">AI-powered student analytics coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
