
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bell, 
  MapPin, 
  Star, 
  Clock, 
  TrendingUp, 
  DollarSign,
  Navigation,
  Battery,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { DriverAvailabilityStatusType } from '@/lib/types'
import DriverAssignmentCard from './driver-assignment-card'

interface DriverMatchingDashboardProps {
  driverId: string
}

export default function DriverMatchingDashboard({ driverId }: DriverMatchingDashboardProps) {
  const [isOnline, setIsOnline] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<DriverAvailabilityStatusType>('OFFLINE')
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([])
  const [stats, setStats] = useState({
    todayEarnings: 0,
    completedOrders: 0,
    onlineTime: 0,
    acceptanceRate: 0,
    avgRating: 0
  })
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [isConnected, setIsConnected] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDriverData()
    const interval = setInterval(loadPendingAssignments, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadDriverData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadAvailabilityStatus(),
        loadPendingAssignments(),
        loadPerformanceStats()
      ])
    } catch (error) {
      console.error('Error loading driver data:', error)
      setError('Failed to load driver data')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailabilityStatus = async () => {
    try {
      const response = await fetch('/api/matching/driver-availability')
      if (response.ok) {
        const data = await response.json()
        setAvailabilityStatus(data.availability?.status || 'OFFLINE')
        setIsOnline(data.driver?.isAvailable || false)
      }
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }

  const loadPendingAssignments = async () => {
    try {
      const response = await fetch('/api/matching/driver-response')
      if (response.ok) {
        const data = await response.json()
        setPendingAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const loadPerformanceStats = async () => {
    try {
      const response = await fetch('/api/matching/performance-metrics')
      if (response.ok) {
        const data = await response.json()
        const metrics = data.summary
        if (metrics) {
          setStats({
            todayEarnings: metrics.totalEarnings || 0,
            completedOrders: metrics.completedAssignments || 0,
            onlineTime: metrics.totalOnlineTime || 0,
            acceptanceRate: metrics.acceptanceRate || 0,
            avgRating: metrics.avgRating || 0
          })
        }
      }
    } catch (error) {
      console.error('Error loading performance stats:', error)
    }
  }

  const handleAvailabilityToggle = async (online: boolean) => {
    try {
      const status = online ? 'AVAILABLE' : 'OFFLINE'
      
      const response = await fetch('/api/matching/driver-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          location: await getCurrentLocation(),
          batteryLevel,
          connectionStrength: isConnected ? 100 : 0
        })
      })

      if (response.ok) {
        setIsOnline(online)
        setAvailabilityStatus(status)
        if (online) {
          loadPendingAssignments()
        }
      } else {
        const error = await response.json()
        setError(error.message || 'Failed to update availability')
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      setError('Failed to update availability')
    }
  }

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          },
          () => resolve(undefined)
        )
      } else {
        resolve(undefined)
      }
    })
  }

  const handleAssignmentResponse = async (assignmentId: string, response: 'ACCEPTED' | 'REJECTED', reason?: string) => {
    try {
      const res = await fetch('/api/matching/driver-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignmentId,
          response,
          rejectionReason: reason
        })
      })

      if (res.ok) {
        // Remove the assignment from pending list
        setPendingAssignments(prev => prev.filter(a => a.id !== assignmentId))
        
        // If accepted, update status to busy
        if (response === 'ACCEPTED') {
          setAvailabilityStatus('BUSY')
          setIsOnline(false)
        }
      } else {
        const error = await res.json()
        setError(error.message || 'Failed to respond to assignment')
      }
    } catch (error) {
      console.error('Error responding to assignment:', error)
      setError('Failed to respond to assignment')
    }
  }

  const getStatusColor = (status: DriverAvailabilityStatusType) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800'
      case 'ONLINE':
        return 'bg-blue-100 text-blue-800'
      case 'BUSY':
        return 'bg-yellow-100 text-yellow-800'
      case 'BREAK':
        return 'bg-purple-100 text-purple-800'
      case 'OFFLINE':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Availability Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Navigation className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Driver Dashboard</CardTitle>
                <p className="text-sm text-gray-600">Manage your availability and assignments</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={getStatusColor(availabilityStatus)}>
                {availabilityStatus}
              </Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleAvailabilityToggle}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Battery className={`w-5 h-5 ${batteryLevel > 20 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm font-medium">Battery</p>
                <p className="text-xs text-gray-600">{batteryLevel}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wifi className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm font-medium">Connection</p>
                <p className="text-xs text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Assignments</p>
                <p className="text-xs text-gray-600">{pendingAssignments.length} pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-lg font-bold">${stats.todayEarnings.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Today's Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-lg font-bold">{stats.completedOrders}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-lg font-bold">{formatTime(stats.onlineTime)}</p>
                <p className="text-xs text-gray-600">Online Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-lg font-bold">{stats.acceptanceRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-600">Acceptance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-lg font-bold">{stats.avgRating.toFixed(1)}</p>
                <p className="text-xs text-gray-600">Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Assignments */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Pending Assignments</h3>
        {pendingAssignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600">No pending assignments</p>
              <p className="text-sm text-gray-500 mt-1">
                {isOnline ? 'Waiting for new assignments...' : 'Go online to receive assignments'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingAssignments.map((assignment) => (
              <DriverAssignmentCard
                key={assignment.id}
                assignment={assignment}
                onResponse={handleAssignmentResponse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
