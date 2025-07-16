
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Car, 
  MapPin, 
  Clock, 
  Star,
  Filter,
  Search,
  Calendar,
  Navigation,
  ChevronRight,
  RotateCcw,
  Receipt
} from 'lucide-react'
import { Ride, RideStatus } from '@/lib/types'

interface RideHistoryListProps {
  onRideSelect?: (ride: Ride) => void
  onBookAgain?: (ride: Ride) => void
}

export function RideHistoryList({ onRideSelect, onBookAgain }: RideHistoryListProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [filteredRides, setFilteredRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 10

  useEffect(() => {
    fetchRides()
  }, [])

  useEffect(() => {
    filterAndSortRides()
  }, [rides, searchTerm, statusFilter, sortBy])

  const fetchRides = async (page = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rideshare/request?limit=${pageSize}&offset=${(page - 1) * pageSize}`)
      const data = await response.json()
      
      if (data.success) {
        if (page === 1) {
          setRides(data.data.rides)
        } else {
          setRides(prev => [...prev, ...data.data.rides])
        }
        setHasMore(data.data.rides.length === pageSize)
      }
    } catch (error) {
      console.error('Error fetching rides:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortRides = () => {
    let filtered = rides.filter(ride => {
      const matchesSearch = 
        ride.rideNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.driver?.user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || ride.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    // Sort rides
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'fare_high':
          return (b.actualFare || b.estimatedFare || 0) - (a.actualFare || a.estimatedFare || 0)
        case 'fare_low':
          return (a.actualFare || a.estimatedFare || 0) - (b.actualFare || b.estimatedFare || 0)
        default:
          return 0
      }
    })

    setFilteredRides(filtered)
  }

  const loadMoreRides = () => {
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    fetchRides(nextPage)
  }

  const handleBookAgain = (ride: Ride) => {
    onBookAgain?.(ride)
  }

  const getStatusColor = (status: RideStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800'
      case 'DRIVER_ARRIVING':
        return 'bg-orange-100 text-orange-800'
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: RideStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Pending'
      case 'ACCEPTED':
        return 'Accepted'
      case 'DRIVER_ARRIVING':
        return 'Driver Arriving'
      case 'IN_PROGRESS':
        return 'In Progress'
      case 'COMPLETED':
        return 'Completed'
      case 'CANCELLED':
        return 'Cancelled'
      default:
        return 'Unknown'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const formatDuration = (startTime: Date, endTime: Date) => {
    const duration = Math.abs(new Date(endTime).getTime() - new Date(startTime).getTime())
    const minutes = Math.floor(duration / (1000 * 60))
    
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading && rides.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner className="h-5 w-5" />
            <span>Loading ride history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Ride History
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search rides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="fare_high">Highest Fare</SelectItem>
              <SelectItem value="fare_low">Lowest Fare</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rides List */}
        <div className="space-y-4">
          {filteredRides.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No rides found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredRides.map((ride) => (
              <Card 
                key={ride.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onRideSelect?.(ride)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Ride Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">#{ride.rideNumber}</span>
                          </div>
                          <Badge className={`${getStatusColor(ride.status)}`}>
                            {getStatusText(ride.status)}
                          </Badge>
                          <Badge variant="outline">{ride.rideType}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(ride.actualFare || ride.estimatedFare || 0)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(ride.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600 truncate">
                            {ride.pickupAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-600 truncate">
                            {ride.destinationAddress}
                          </span>
                        </div>
                      </div>

                      {/* Driver Info (if available) */}
                      {ride.driver && (
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={ride.driver.user.avatar} />
                            <AvatarFallback>
                              {ride.driver.user.name?.charAt(0) || 'D'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {ride.driver.user.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-gray-600">
                                  {ride.driver.rating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {ride.driver.vehicleColor} {ride.driver.vehicleMake} {ride.driver.vehicleModel}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Trip Details */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {ride.distance && (
                          <div className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            <span>{ride.distance.toFixed(1)} km</span>
                          </div>
                        )}
                        
                        {ride.startedAt && ride.completedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDuration(ride.startedAt, ride.completedAt)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{ride.passengers} passenger{ride.passengers !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBookAgain(ride)
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Book Again
                      </Button>
                      
                      {ride.status === 'COMPLETED' && (
                        <Button size="sm" variant="outline">
                          <Receipt className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More Button */}
        {hasMore && filteredRides.length > 0 && (
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={loadMoreRides}
              disabled={loading}
            >
              {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
              Load More Rides
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
