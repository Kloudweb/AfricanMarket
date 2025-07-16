
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DriverShiftControls } from '@/components/driver/driver-shift-controls'
import { PendingAssignments } from '@/components/driver/pending-assignments'
import { ActiveOrderCard } from '@/components/driver/active-order-card'
import { DriverLocationTracker } from '@/components/driver/driver-location-tracker'
import { EarningsCard } from '@/components/driver/earnings-card'
import { RecentDeliveries } from '@/components/driver/recent-deliveries'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  DollarSign, 
  Package, 
  Clock, 
  Star, 
  AlertCircle, 
  MapPin,
  Truck,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export function DriverDashboardContent() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch dashboard data
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
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Set up polling for real-time updates
  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
      
      // Poll every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000)
      
      return () => clearInterval(interval)
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Authentication Required</h3>
          <p className="text-gray-600">Please sign in to access the driver dashboard</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
        </div>
      </div>
    )
  }

  const { driver, activeShift, pendingAssignments, activeOrder, todayStats, recentDeliveries } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {driver.user?.name || 'Driver'}!
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge 
            variant={driver.isAvailable ? 'default' : 'secondary'}
            className={driver.isAvailable ? 'bg-green-100 text-green-800' : ''}
          >
            {driver.isAvailable ? 'Available' : 'Offline'}
          </Badge>
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

      {/* Shift Controls */}
      <DriverShiftControls 
        activeShift={activeShift}
        onShiftChange={fetchDashboardData}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${todayStats.totalEarnings.toFixed(2)}
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
                <p className="text-sm font-medium text-gray-600">Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.totalDeliveries}
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
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(todayStats.onlineTime / 60)}h {todayStats.onlineTime % 60}m
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
                <p className="text-2xl font-bold text-gray-900">
                  {driver.rating?.toFixed(1) || 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Active Orders and Assignments */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Order</TabsTrigger>
              <TabsTrigger value="assignments">
                Assignments ({pendingAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active">
              {activeOrder ? (
                <ActiveOrderCard 
                  order={activeOrder}
                  onOrderUpdate={fetchDashboardData}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
                      <p className="text-gray-600">
                        You don't have any active orders at the moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="assignments">
              <PendingAssignments 
                assignments={pendingAssignments}
                onAssignmentResponse={fetchDashboardData}
              />
            </TabsContent>
            
            <TabsContent value="recent">
              <RecentDeliveries deliveries={recentDeliveries} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Location Tracker and Earnings */}
        <div className="space-y-6">
          {/* Location Tracker */}
          <DriverLocationTracker 
            driver={driver}
            isOnShift={!!activeShift}
          />

          {/* Earnings Card */}
          <EarningsCard 
            todayStats={todayStats}
            activeShift={activeShift}
          />
        </div>
      </div>
    </div>
  )
}
