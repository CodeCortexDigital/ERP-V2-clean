import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-gray-500">Manage fee structures, invoices, and payments</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fee Structures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
