
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Navigation, 
  RepeatIcon,
  Edit,
  Trash2,
  Play,
  Pause,
  Plus
} from 'lucide-react'
import { RideSchedule } from '@/lib/types'

interface ScheduledRidesManagerProps {
  onCreateSchedule?: () => void
  onEditSchedule?: (schedule: RideSchedule) => void
}

export function ScheduledRidesManager({ onCreateSchedule, onEditSchedule }: ScheduledRidesManagerProps) {
  const [schedules, setSchedules] = useState<RideSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingSchedule, setUpdatingSchedule] = useState<string | null>(null)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/rideshare/schedule')
      const data = await response.json()
      
      if (data.success) {
        setSchedules(data.data.schedules)
      }
    } catch (error) {
      console.error('Error fetching scheduled rides:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleScheduleStatus = async (scheduleId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
    setUpdatingSchedule(scheduleId)
    try {
      const response = await fetch(`/api/rideshare/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (data.success) {
        setSchedules(prev => 
          prev.map(schedule => 
            schedule.id === scheduleId 
              ? { ...schedule, status: newStatus }
              : schedule
          )
        )
      }
    } catch (error) {
      console.error('Error updating schedule:', error)
    } finally {
      setUpdatingSchedule(null)
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    setUpdatingSchedule(scheduleId)
    try {
      const response = await fetch(`/api/rideshare/schedule/${scheduleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId))
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
    } finally {
      setUpdatingSchedule(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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

  const formatRecurring = (schedule: RideSchedule) => {
    if (!schedule.isRecurring) return 'One-time'
    
    if (schedule.recurringType === 'DAILY') {
      return 'Daily'
    } else if (schedule.recurringType === 'WEEKLY') {
      return `Weekly (${schedule.recurringDays.join(', ')})`
    } else if (schedule.recurringType === 'MONTHLY') {
      return 'Monthly'
    }
    
    return 'Recurring'
  }

  const getNextRideText = (schedule: RideSchedule) => {
    if (schedule.status !== 'ACTIVE') return null
    
    if (schedule.nextRideAt) {
      const nextRide = new Date(schedule.nextRideAt)
      const now = new Date()
      const diffMs = nextRide.getTime() - now.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffDays > 0) {
        return `Next ride in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
      } else if (diffHours > 0) {
        return `Next ride in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
      } else {
        return 'Next ride soon'
      }
    }
    
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner className="h-5 w-5" />
            <span>Loading scheduled rides...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Rides
          </span>
          <Button onClick={onCreateSchedule}>
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No scheduled rides</p>
            <p className="text-sm">Create a schedule to book recurring rides</p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <Card 
              key={schedule.id} 
              className={`transition-all ${
                schedule.status === 'ACTIVE' ? 'border-green-200 bg-green-50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Schedule Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(schedule.status)}`}>
                          {schedule.status}
                        </Badge>
                        <Badge variant="outline">{schedule.rideType}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <RepeatIcon className="h-3 w-3" />
                          {formatRecurring(schedule)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Active</span>
                        <Switch
                          checked={schedule.status === 'ACTIVE'}
                          onCheckedChange={(checked) => 
                            toggleScheduleStatus(
                              schedule.id, 
                              checked ? 'ACTIVE' : 'PAUSED'
                            )
                          }
                          disabled={updatingSchedule === schedule.id}
                        />
                      </div>
                    </div>

                    {/* Route */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">
                          {schedule.pickupAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">
                          {schedule.destinationAddress}
                        </span>
                      </div>
                    </div>

                    {/* Schedule Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Next Ride</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(schedule.scheduledFor)}
                        </p>
                        {getNextRideText(schedule) && (
                          <p className="text-xs text-green-600 font-medium">
                            {getNextRideText(schedule)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Passengers</p>
                        <p className="text-sm text-gray-600">
                          {schedule.passengers} passenger{schedule.passengers !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Recurring Until */}
                    {schedule.isRecurring && schedule.recurringUntil && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Recurring Until</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(schedule.recurringUntil)}
                        </p>
                      </div>
                    )}

                    {/* Max Fare */}
                    {schedule.maxFare && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Maximum Fare</p>
                        <p className="text-sm text-gray-600">
                          ${schedule.maxFare.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {schedule.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Notes</p>
                        <p className="text-sm text-gray-600">{schedule.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onEditSchedule?.(schedule)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteSchedule(schedule.id)}
                      disabled={updatingSchedule === schedule.id}
                    >
                      {updatingSchedule === schedule.id ? (
                        <LoadingSpinner className="h-3 w-3 mr-1" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  )
}
