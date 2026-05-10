import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TrendingUp, TrendingDown, AlertCircle, AlertTriangle } from 'lucide-react'
import analyticsService from '@/services/analytics.service'

export default function AnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await analyticsService.getExecutiveDashboard()
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard Intelligence</h1>
          <p className="text-gray-500">AI-powered insights and real-time metrics</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline">
          Refresh Data
        </Button>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle>AI Assistant Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            This executive view combines attendance risk alerts, exam performance analytics, revenue forecasting, and defaulter intelligence into a single AI-powered report.
          </p>
        </CardContent>
      </Card>

      {/* Smart Insights/Alerts */}
      {dashboardData?.smart_insights && dashboardData.smart_insights.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Smart Insights & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.smart_insights.map((insight: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.priority === 'critical' ? 'border-red-500 bg-red-50' :
                  insight.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                  'border-yellow-500 bg-yellow-50'
                }`}>
                  <div className="flex gap-2 items-start">
                    {insight.type === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />}
                    {insight.type === 'warning' && <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />}
                    {insight.type === 'alert' && <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />}
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{insight.title}</div>
                      <div className="text-sm text-gray-600">{insight.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Category: {insight.category}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trends */}
      {dashboardData?.revenue_trends && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Month Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${dashboardData.revenue_trends.current_month.toFixed(2)}</div>
              <div className="flex items-center gap-1 text-xs mt-2">
                {dashboardData.revenue_trends.trend_percentage > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">+{dashboardData.revenue_trends.trend_percentage}%</span>
                  </>
                ) : dashboardData.revenue_trends.trend_percentage < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">{dashboardData.revenue_trends.trend_percentage}%</span>
                  </>
                ) : (
                  <span className="text-gray-600">No change</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">vs last month: ${dashboardData.revenue_trends.last_month.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.attendance_trends.this_week_rate}%</div>
              <div className="flex items-center gap-1 text-xs mt-2">
                {dashboardData.attendance_trends.trend_percentage > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">+{dashboardData.attendance_trends.trend_percentage}%</span>
                  </>
                ) : dashboardData.attendance_trends.trend_percentage < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">{dashboardData.attendance_trends.trend_percentage}%</span>
                  </>
                ) : (
                  <span className="text-gray-600">No change</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">This week: {dashboardData.attendance_trends.this_week_total} records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fee Recovery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.fee_recovery_trends.best_performing_class?.recovery_rate || 0}%
              </div>
              <p className="text-sm text-gray-600 mt-2">Best: {dashboardData.fee_recovery_trends.best_performing_class?.class_name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Worst: {dashboardData.fee_recovery_trends.worst_performing_class?.class_name} ({dashboardData.fee_recovery_trends.worst_performing_class?.recovery_rate}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Student Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.student_growth.current_total}</div>
              <div className="flex items-center gap-1 text-xs mt-2">
                {dashboardData.student_growth.growth_rate > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">+{dashboardData.student_growth.growth_rate}%</span>
                  </>
                ) : dashboardData.student_growth.growth_rate < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">{dashboardData.student_growth.growth_rate}%</span>
                  </>
                ) : (
                  <span className="text-gray-600">No change</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Active students this month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exam Performance */}
      {dashboardData?.exam_performance_trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.exam_performance_trends.subject_performance?.slice(0, 5).map((subject: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{subject.exam__subject__name || subject.subject}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${subject.avg_percentage || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-10 text-right">{(subject.avg_percentage || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.exam_performance_trends.class_performance?.map((cls: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{cls.student__current_class__name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${cls.avg_percentage || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-10 text-right">{(cls.avg_percentage || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fee Recovery by Class */}
      {dashboardData?.fee_recovery_trends && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Recovery by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Class</th>
                    <th className="px-4 py-2 text-right font-semibold">Total Invoices</th>
                    <th className="px-4 py-2 text-right font-semibold">Total Amount</th>
                    <th className="px-4 py-2 text-right font-semibold">Amount Paid</th>
                    <th className="px-4 py-2 text-right font-semibold">Recovery %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dashboardData.fee_recovery_trends.class_recovery?.map((recovery: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-2">{recovery.class_name}</td>
                      <td className="px-4 py-2 text-right">{recovery.total_invoices}</td>
                      <td className="px-4 py-2 text-right">${recovery.total_amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${recovery.total_paid.toFixed(2)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${
                        recovery.recovery_rate >= 70 ? 'text-green-600' :
                        recovery.recovery_rate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {recovery.recovery_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trend Chart */}
      {dashboardData?.revenue_trends && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.revenue_trends.monthly_data?.map((month: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm w-20">{month.month_name}</span>
                  <div className="flex-1 ml-4 mr-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((month.revenue / (dashboardData.revenue_trends.monthly_data[0].revenue || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold w-20 text-right">${month.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
