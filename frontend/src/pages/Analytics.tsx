import { useState } from 'react'
import { 
  LineChartComponent, 
  BarChartComponent, 
  AreaChartComponent, 
  PieChartComponent 
} from '../components/ui/Charts'
import { Pagination, PageSizeSelect } from '../components/ui/Pagination'
import { SearchFilter, FilterBar } from '../components/ui/SearchFilter'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { exportToCSV, exportToJSON, exportToExcel } from '../lib/export'

// Sample data
const salesData = [
  { month: 'Jan', sales: 4000, profit: 2400 },
  { month: 'Feb', sales: 3000, profit: 1398 },
  { month: 'Mar', sales: 2000, profit: 9800 },
  { month: 'Apr', sales: 2780, profit: 3908 },
  { month: 'May', sales: 1890, profit: 4800 },
  { month: 'Jun', sales: 2390, profit: 3800 },
  { month: 'Jul', sales: 3490, profit: 4300 },
]

const categoryData = [
  { name: 'Electronics', value: 400 },
  { name: 'Clothing', value: 300 },
  { name: 'Food', value: 300 },
  { name: 'Books', value: 200 },
]

const employees = [
  { id: 1, name: 'John Doe', department: 'Engineering', status: 'active', salary: 75000 },
  { id: 2, name: 'Jane Smith', department: 'Marketing', status: 'active', salary: 65000 },
  { id: 3, name: 'Bob Johnson', department: 'Sales', status: 'inactive', salary: 55000 },
  { id: 4, name: 'Alice Brown', department: 'HR', status: 'active', salary: 60000 },
  { id: 5, name: 'Charlie Wilson', department: 'Engineering', status: 'active', salary: 80000 },
  { id: 6, name: 'Diana Lee', department: 'Finance', status: 'active', salary: 70000 },
  { id: 7, name: 'Edward Kim', department: 'Marketing', status: 'inactive', salary: 58000 },
  { id: 8, name: 'Fiona Garcia', department: 'Sales', status: 'active', salary: 62000 },
]

export default function AnalyticsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || emp.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize)
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Export handlers
  const handleExportCSV = () => exportToCSV(filteredEmployees, 'employees.csv')
  const handleExportJSON = () => exportToJSON(filteredEmployees, 'employees.json')
  const handleExportExcel = () => exportToExcel(filteredEmployees, 'employees.xlsx')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">View charts, filter data, and export reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="outline" onClick={handleExportJSON}>Export JSON</Button>
          <Button variant="outline" onClick={handleExportExcel}>Export Excel</Button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" onChange={(val) => console.log('Tab changed:', val)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$19,540</div>
                <Badge variant="success">+12.5%</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$30,006</div>
                <Badge variant="success">+8.2%</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <Badge variant="warning">2 inactive</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <Badge variant="info">All active</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChartComponent
              data={salesData}
              xKey="month"
              yKeys={[
                { key: 'sales', name: 'Sales', color: '#3b82f6' },
                { key: 'profit', name: 'Profit', color: '#10b981' },
              ]}
              title="Sales & Profit Trend"
            />
            <BarChartComponent
              data={salesData}
              xKey="month"
              yKeys={[
                { key: 'sales', name: 'Sales', color: '#f59e0b' },
              ]}
              title="Monthly Sales"
            />
            <AreaChartComponent
              data={salesData}
              xKey="month"
              yKeys={[
                { key: 'sales', name: 'Sales', color: '#8b5cf6' },
              ]}
              title="Sales Area"
            />
            <PieChartComponent
              data={categoryData}
              title="Sales by Category"
            />
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Employee Data</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-4 space-y-3">
                <SearchFilter
                  placeholder="Search employees..."
                  onSearch={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                />
                <FilterBar
                  filters={[
                    {
                      key: 'status',
                      label: 'Status',
                      type: 'select',
                      options: [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ],
                      placeholder: 'All Status',
                    },
                  ]}
                  values={{ status: statusFilter }}
                  onChange={(_key, value) => setStatusFilter(value as string)}
                  onReset={() => setStatusFilter('')}
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Department</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-right py-3 px-4 font-medium">Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{emp.name}</td>
                        <td className="py-3 px-4">{emp.department}</td>
                        <td className="py-3 px-4">
                          <Badge variant={emp.status === 'active' ? 'success' : 'secondary'}>
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">${emp.salary.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <PageSizeSelect
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setCurrentPage(1)
                  }}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}