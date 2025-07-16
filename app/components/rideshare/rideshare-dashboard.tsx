
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RideBookingForm } from './ride-booking-form'
import { RideTrackingCard } from './ride-tracking-card'
import { RideHistoryList } from './ride-history-list'
import { ScheduledRidesManager } from './scheduled-rides-manager'
import { 
  Car, 
  Clock, 
  MapPin, 
  Calendar,
  TrendingUp,
  Star,
  DollarSign,
  User
} from 'lucide-react'
import { Ride, RideSchedule } from '@/lib/types'

export function RideshareDashboard() {
  const { data: session } = useSession()
  const [activeRide, setActiveRide] = useState<Ride | null>(null)
  const [recentRides, setRecentRides] = useState<Ride[]>([])
  const [stats, setStats] = useState({
    totalRides: 0,
    totalSpent: 0,
    averageRating: 0,
    scheduledRides: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('book')

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      const [ridesResponse, statsResponse] = await Promise.all([
        fetch('/api/rideshare/request?limit=5'),
        fetch('/api/rideshare/stats'), // We'll need to create this endpoint
      ])

      const ridesData = await ridesResponse.json()
      if (ridesData.success) {
        const rides = ridesData.data.rides
        setRecentRides(rides)
        
        // Find active ride
        const active = rides.find((ride: Ride) => 
          ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status)
        )
        setActiveRide(active || null)

        // Calculate stats from rides
        const totalRides = rides.length
        const totalSpent = rides
          .filter((ride: Ride) => ride.status === 'COMPLETED')
          .reduce((sum: number, ride: Ride) => sum + (ride.actualFare || 0), 0)
        
        setStats({
          totalRides,
          totalSpent,
          averageRating: 4.8, // Mock data
          scheduledRides: 0, // We'll update this with actual scheduled rides
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRideRequested = (ride: Ride) => {
    setActiveRide(ride)
    setActiveTab('track')
    fetchDashboardData()
  }

  const handleRideUpdate = (updatedRide: Ride) => {
    setActiveRide(updatedRide)
    fetchDashboardData()
  }

  const handleCancelRide = async (rideId: string) => {
    try {
      const response = await fetch(`/api/rideshare/${rideId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setActiveRide(null)
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error cancelling ride:', error)
    }
  }

  const handleBookAgain = (ride: Ride) => {
    // Switch to booking tab and pre-fill form
    setActiveTab('book')
    // You can emit an event or use a callback to pre-fill the form
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  if (!session?.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Please sign in to access the rideshare dashboard</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rideshare Dashboard</h1>
        <p className="text-gray-600">Book rides, track your trips, and manage your schedule</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rides</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
              </div>
              <Car className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledRides}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Ride Alert */}
      {activeRide && (
        <div className="mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-blue-900">Active Ride</p>
                    <p className="text-sm text-blue-700">
                      Ride #{activeRide.rideNumber} - {activeRide.status}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('track')}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="book" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Book Ride
          </TabsTrigger>
          <TabsTrigger value="track" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Track Ride
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="mt-6">
          <RideBookingForm
            onRideRequested={handleRideRequested}
            onFareEstimateUpdate={() => {}}
          />
        </TabsContent>

        <TabsContent value="track" className="mt-6">
          {activeRide ? (
            <RideTrackingCard
              ride={activeRide}
              onRideUpdate={handleRideUpdate}
              onCancelRide={handleCancelRide}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active rides to track</p>
                <p className="text-sm">Book a ride to start tracking</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RideHistoryList
            onRideSelect={(ride) => {
              setActiveRide(ride)
              setActiveTab('track')
            }}
            onBookAgain={handleBookAgain}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduledRidesManager
            onCreateSchedule={() => {
              // Open schedule creation modal/form
              console.log('Create schedule')
            }}
            onEditSchedule={(schedule) => {
              // Open schedule edit modal/form
              console.log('Edit schedule:', schedule)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
