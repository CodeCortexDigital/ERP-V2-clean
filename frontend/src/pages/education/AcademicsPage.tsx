import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Academics</h1>
        <p className="text-gray-500">Manage academic years, programs, classes, and sections</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Academic Years</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Classes & Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
