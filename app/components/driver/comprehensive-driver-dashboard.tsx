
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EnhancedAvailabilityToggle } from '@/components/driver/enhanced-availability-toggle'
import { RequestNotifications } from '@/components/driver/request-notifications'
import { EnhancedEarningsDashboard } from '@/components/driver/enhanced-earnings-dashboard'
import { NavigationIntegration } from '@/components/driver/navigation-integration'
import { DeliveryPhotoUpload } from '@/components/driver/delivery-photo-upload'
import { DriverSettings } from '@/components/driver/driver-settings'
import { ComprehensiveDriverHistory } from '@/components/driver/comprehensive-driver-history'
import { 
  Truck, 
  DollarSign, 
  Clock, 
  Star, 
  Bell,
  Settings,
  Navigation,
  Camera,
  History,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Package,
  Car,
  MapPin,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardData {
  driver: {
    id: string
    user: {
      name: string
      avatar: string
    }
    vehicleType: string
    vehicleMake: string
    vehicleModel: string
    vehicleColor: string
    vehiclePlate: string
    rating: number
    totalDeliveries: number
    totalRides: number
    isAvailable: boolean
    availabilityMode: string
    verificationStatus: string
    acceptanceRate: number
    completionRate: number
  }
  activeShift: {
    id: string
    startTime: string
    status: string
    totalEarnings: number
    totalDeliveries: number
    totalTime: number
    hoursWorked: number
  } | null
  pendingAssignments: any[]
  activeOrder: any | null
  todayStats: {
    totalEarnings: number
    totalDeliveries: number
    totalRides: number
    onlineTime: number
    avgRating: number
  }
  recentDeliveries: any[]
  weeklyStats: {
    totalEarnings: number
    totalDeliveries: number
    totalRides: number
    totalHours: number
    avgEarningsPerHour: number
  }
}

export function ComprehensiveDriverDashboard() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
      
      // Set up real-time updates
      const interval = setInterval(fetchDashboardData, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/drivers/dashboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      setDashboardData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access the driver dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No dashboard data available.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {dashboardData.driver.user?.name || 'Driver'}!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={dashboardData.driver.isAvailable ? 'default' : 'secondary'}
              className={dashboardData.driver.isAvailable ? 'bg-green-100 text-green-800' : ''}
            >
              {dashboardData.driver.availabilityMode}
            </Badge>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {dashboardData.driver.vehicleMake} {dashboardData.driver.vehicleModel}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardData.todayStats.totalEarnings)}
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
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardData.todayStats.totalDeliveries + dashboardData.todayStats.totalRides}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online Time</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatTime(dashboardData.todayStats.onlineTime)}
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
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {dashboardData.driver.rating?.toFixed(1) || 'N/A'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Acceptance Rate</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {Math.round(dashboardData.driver.acceptanceRate * 100)}%
                  </p>
                </div>
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Shift Status */}
        {dashboardData.activeShift && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Active Shift</p>
                    <p className="text-sm text-green-700">
                      Started at {new Date(dashboardData.activeShift.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(dashboardData.activeShift.totalEarnings)}
                  </p>
                  <p className="text-sm text-green-700">
                    {dashboardData.activeShift.totalDeliveries} deliveries • {formatTime(dashboardData.activeShift.totalTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="navigation" className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Availability & Requests */}
              <div className="lg:col-span-2 space-y-6">
                <EnhancedAvailabilityToggle />
                <RequestNotifications />
              </div>

              {/* Right Column - Quick Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('earnings')}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      View Earnings
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('navigation')}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Start Navigation
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('photos')}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photos
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('history')}
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </CardContent>
                </Card>

                {/* Active Order */}
                {dashboardData.activeOrder && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Package className="h-5 w-5" />
                        Active Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-blue-700">
                      <div className="space-y-2">
                        <p className="font-medium">#{dashboardData.activeOrder.orderNumber}</p>
                        <p className="text-sm">{dashboardData.activeOrder.vendor.businessName}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span>{dashboardData.activeOrder.deliveryAddress}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <EnhancedAvailabilityToggle />
          </TabsContent>

          <TabsContent value="requests">
            <RequestNotifications />
          </TabsContent>

          <TabsContent value="earnings">
            <EnhancedEarningsDashboard />
          </TabsContent>

          <TabsContent value="navigation">
            <NavigationIntegration />
          </TabsContent>

          <TabsContent value="photos">
            <DeliveryPhotoUpload 
              orderId={dashboardData.activeOrder?.id}
              onUploadComplete={() => {
                toast.success('Photo uploaded successfully')
                fetchDashboardData()
              }}
            />
          </TabsContent>

          <TabsContent value="history">
            <ComprehensiveDriverHistory />
          </TabsContent>
        </Tabs>

        {/* Settings Modal Trigger */}
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Driver Settings</h2>
                  <Button variant="ghost" onClick={() => setActiveTab('overview')}>
                    <span className="sr-only">Close</span>
                    ×
                  </Button>
                </div>
                <DriverSettings />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
