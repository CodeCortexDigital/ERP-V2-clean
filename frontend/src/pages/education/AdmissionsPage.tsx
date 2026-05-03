import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"

export default function AdmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admissions</h1>
        <p className="text-gray-500">Manage applicants and applications</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
