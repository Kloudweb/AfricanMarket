
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  MapPin,
  Target,
  Award,
  BarChart3,
  Download,
  RefreshCw,
  Fuel,
  CreditCard,
  Wallet
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { toast } from 'sonner'

interface EarningsData {
  period: string
  dateRange: {
    start: string
    end: string
  }
  totals: {
    totalEarnings: number
    baseEarnings: number
    bonusEarnings: number
    tipEarnings: number
    fuelAllowance: number
    deductions: number
    netEarnings: number
    totalDeliveries: number
    totalRides: number
    totalDistance: number
    totalTime: number
    avgEarningsPerHour: number
    avgEarningsPerDelivery: number
    avgEarningsPerKm: number
  }
  analytics: Array<{
    date: string
    totalEarnings: number
    netEarnings: number
    totalDeliveries: number
    totalRides: number
    totalTime: number
    peakHourEarnings: number
    offPeakEarnings: number
  }>
  recentEarnings: Array<{
    id: string
    grossAmount: number
    netAmount: number
    type: string
    createdAt: string
    order?: {
      orderNumber: string
      vendor: {
        businessName: string
      }
    }
    ride?: {
      rideNumber: string
    }
  }>
}

interface EarningsGoals {
  dailyGoal: number
  weeklyGoal: number
  monthlyGoal: number
  deliveryGoal: number
}

export function EnhancedEarningsDashboard() {
  const { data: session } = useSession()
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const [goals, setGoals] = useState<EarningsGoals>({
    dailyGoal: 150,
    weeklyGoal: 800,
    monthlyGoal: 3000,
    deliveryGoal: 20
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchEarningsData()
    }
  }, [session, period])

  const fetchEarningsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/drivers/earnings?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch earnings data')
      
      const data = await response.json()
      setEarningsData(data)
    } catch (error) {
      console.error('Error fetching earnings data:', error)
      toast.error('Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }

  const updateEarningsAnalytics = async () => {
    try {
      const response = await fetch('/api/drivers/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString() })
      })
      
      if (!response.ok) throw new Error('Failed to update analytics')
      
      toast.success('Earnings analytics updated')
      fetchEarningsData()
    } catch (error) {
      console.error('Error updating analytics:', error)
      toast.error('Failed to update analytics')
    }
  }

  const exportEarningsData = async () => {
    try {
      const response = await fetch('/api/drivers/earnings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          period, 
          format: 'csv',
          startDate: earningsData?.dateRange.start,
          endDate: earningsData?.dateRange.end
        })
      })
      
      if (!response.ok) throw new Error('Failed to export data')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `earnings_${period}_${Date.now()}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Earnings data exported')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const getGoalProgress = () => {
    if (!earningsData) return 0
    
    const { netEarnings, totalDeliveries } = earningsData.totals
    let goal = 0
    
    switch (period) {
      case 'day':
        goal = goals.dailyGoal
        break
      case 'week':
        goal = goals.weeklyGoal
        break
      case 'month':
        goal = goals.monthlyGoal
        break
      default:
        goal = goals.weeklyGoal
    }
    
    return Math.min((netEarnings / goal) * 100, 100)
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <div className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!earningsData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              Unable to load earnings data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings Dashboard
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchEarningsData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportEarningsData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(earningsData.totals.totalEarnings)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Earnings</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(earningsData.totals.netEarnings)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Per Hour</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(earningsData.totals.avgEarningsPerHour)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {earningsData.totals.totalDeliveries + earningsData.totals.totalRides}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Goal Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {period.charAt(0).toUpperCase() + period.slice(1)}ly Goal
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(earningsData.totals.netEarnings)} / {formatCurrency(
                        period === 'day' ? goals.dailyGoal :
                        period === 'week' ? goals.weeklyGoal :
                        period === 'month' ? goals.monthlyGoal : goals.weeklyGoal
                      )}
                    </span>
                  </div>
                  <Progress value={getGoalProgress()} className="h-2" />
                  <div className="text-xs text-gray-500">
                    {getGoalProgress().toFixed(1)}% of goal achieved
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsData.analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line 
                      type="monotone" 
                      dataKey="totalEarnings" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Total Earnings"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netEarnings" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Net Earnings"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            {/* Earnings Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Base Earnings</span>
                    <span className="font-medium">{formatCurrency(earningsData.totals.baseEarnings)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bonus Earnings</span>
                    <span className="font-medium text-green-600">{formatCurrency(earningsData.totals.bonusEarnings)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tips</span>
                    <span className="font-medium text-blue-600">{formatCurrency(earningsData.totals.tipEarnings)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fuel Allowance</span>
                    <span className="font-medium text-purple-600">{formatCurrency(earningsData.totals.fuelAllowance)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Deductions</span>
                    <span className="font-medium text-red-600">-{formatCurrency(earningsData.totals.deductions)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Net Earnings</span>
                    <span className="text-lg">{formatCurrency(earningsData.totals.netEarnings)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg per Delivery</span>
                    <span className="font-medium">{formatCurrency(earningsData.totals.avgEarningsPerDelivery)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg per Kilometer</span>
                    <span className="font-medium">{formatCurrency(earningsData.totals.avgEarningsPerKm)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Distance</span>
                    <span className="font-medium">{earningsData.totals.totalDistance.toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Time</span>
                    <span className="font-medium">{Math.floor(earningsData.totals.totalTime / 60)}h {earningsData.totals.totalTime % 60}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Deliveries</span>
                    <span className="font-medium">{earningsData.totals.totalDeliveries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rides</span>
                    <span className="font-medium">{earningsData.totals.totalRides}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Peak vs Off-Peak */}
            <Card>
              <CardHeader>
                <CardTitle>Peak vs Off-Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={earningsData.analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="peakHourEarnings" fill="#10b981" name="Peak Hours" />
                    <Bar dataKey="offPeakEarnings" fill="#6b7280" name="Off-Peak Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Earnings Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Daily Goal</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{formatCurrency(goals.dailyGoal)}</span>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Weekly Goal</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{formatCurrency(goals.weeklyGoal)}</span>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monthly Goal</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{formatCurrency(goals.monthlyGoal)}</span>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Daily Deliveries</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{goals.deliveryGoal}</span>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goal Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Daily Target</span>
                    <Badge variant={getGoalProgress() >= 100 ? "default" : "secondary"}>
                      {getGoalProgress().toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={getGoalProgress()} className="h-2" />
                  
                  <div className="text-sm text-gray-600 mt-2">
                    {getGoalProgress() >= 100 ? 
                      "🎉 Goal achieved! Great work!" : 
                      `${formatCurrency((period === 'day' ? goals.dailyGoal : goals.weeklyGoal) - earningsData.totals.netEarnings)} left to reach goal`
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {earningsData.recentEarnings.map((earning) => (
                    <div key={earning.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {earning.order ? `Order #${earning.order.orderNumber}` : 
                             earning.ride ? `Ride #${earning.ride.rideNumber}` : 
                             'Earning'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {earning.order?.vendor?.businessName || 'Ride Service'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(earning.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(earning.netAmount)}</p>
                        <p className="text-sm text-gray-600">
                          Gross: {formatCurrency(earning.grossAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
