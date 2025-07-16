
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Power, 
  Coffee, 
  Settings, 
  Battery, 
  Wifi, 
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface DriverAvailability {
  id: string
  availabilityMode: string
  isAvailable: boolean
  lastAvailabilityChange: string
  maxDailyHours: number
  maxWeeklyHours: number
  currentLatitude?: number
  currentLongitude?: number
}

interface AvailabilityHistory {
  id: string
  previousMode: string
  newMode: string
  changeReason: string
  timestamp: string
  batteryLevel?: number
  networkQuality?: string
}

export function EnhancedAvailabilityToggle() {
  const { data: session } = useSession()
  const [availability, setAvailability] = useState<DriverAvailability | null>(null)
  const [history, setHistory] = useState<AvailabilityHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedMode, setSelectedMode] = useState('ONLINE')
  const [reason, setReason] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const [deviceInfo, setDeviceInfo] = useState({
    batteryLevel: 0,
    networkQuality: 'GOOD',
    location: null as { lat: number; lng: number; address?: string } | null
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchAvailability()
      getCurrentLocation()
      
      // Set up polling for real-time updates
      const interval = setInterval(fetchAvailability, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/drivers/availability?includeHistory=true&days=7')
      if (!response.ok) throw new Error('Failed to fetch availability')
      
      const data = await response.json()
      setAvailability(data.availability)
      setHistory(data.history || [])
      setSelectedMode(data.availability.availabilityMode)
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setDeviceInfo(prev => ({
            ...prev,
            location: { lat: latitude, lng: longitude }
          }))
          
          // Get battery level if available
          if ('getBattery' in navigator) {
            try {
              const battery = await (navigator as any).getBattery()
              setDeviceInfo(prev => ({
                ...prev,
                batteryLevel: Math.round(battery.level * 100)
              }))
            } catch (error) {
              console.error('Error getting battery info:', error)
            }
          }
        },
        (error) => {
          console.error('Error getting location:', error)
        },
        { enableHighAccuracy: true }
      )
    }
  }

  const updateAvailability = async (mode: string, changeReason?: string) => {
    if (!availability) return

    setUpdating(true)
    try {
      const response = await fetch('/api/drivers/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          reason: changeReason || reason || 'MANUAL',
          location: deviceInfo.location,
          batteryLevel: deviceInfo.batteryLevel,
          networkQuality: deviceInfo.networkQuality
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update availability')
      }

      const data = await response.json()
      toast.success(data.message)
      
      // Update local state
      setAvailability(prev => prev ? {
        ...prev,
        availabilityMode: mode,
        isAvailable: mode === 'ONLINE',
        lastAvailabilityChange: new Date().toISOString()
      } : null)
      
      setReason('')
      fetchAvailability() // Refresh data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update availability')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (mode: string) => {
    switch (mode) {
      case 'ONLINE': return 'bg-green-100 text-green-800'
      case 'OFFLINE': return 'bg-gray-100 text-gray-800'
      case 'BREAK': return 'bg-yellow-100 text-yellow-800'
      case 'MAINTENANCE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (mode: string) => {
    switch (mode) {
      case 'ONLINE': return <CheckCircle className="h-4 w-4" />
      case 'OFFLINE': return <Power className="h-4 w-4" />
      case 'BREAK': return <Coffee className="h-4 w-4" />
      case 'MAINTENANCE': return <Settings className="h-4 w-4" />
      default: return <Power className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Driver Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!availability) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load availability status. Please try again.
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
            <Power className="h-5 w-5" />
            Driver Availability
          </div>
          <Badge className={getStatusColor(availability.availabilityMode)}>
            {getStatusIcon(availability.availabilityMode)}
            {availability.availabilityMode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                availability.isAvailable ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <span className="font-medium">
                {availability.isAvailable ? 'Available for Requests' : 'Unavailable'}
              </span>
            </div>
            <Switch
              checked={availability.availabilityMode === 'ONLINE'}
              onCheckedChange={(checked) => updateAvailability(checked ? 'ONLINE' : 'OFFLINE')}
              disabled={updating}
            />
          </div>

          {/* Device Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              <span>{deviceInfo.batteryLevel}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span>{deviceInfo.networkQuality}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{deviceInfo.location ? 'GPS Active' : 'No GPS'}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Mode Selection */}
        <div className="space-y-4">
          <Label htmlFor="mode-select">Change Status</Label>
          <Select value={selectedMode} onValueChange={setSelectedMode}>
            <SelectTrigger id="mode-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ONLINE">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Online - Ready for requests
                </div>
              </SelectItem>
              <SelectItem value="OFFLINE">
                <div className="flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Offline - Not accepting requests
                </div>
              </SelectItem>
              <SelectItem value="BREAK">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  On Break - Temporarily unavailable
                </div>
              </SelectItem>
              <SelectItem value="MAINTENANCE">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Maintenance - Vehicle service
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {selectedMode !== availability.availabilityMode && (
            <div className="space-y-3">
              <Label htmlFor="reason">Reason for change (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for status change..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
              <Button
                onClick={() => updateAvailability(selectedMode, reason)}
                disabled={updating}
                className="w-full"
              >
                {updating ? 'Updating...' : `Change Status to ${selectedMode}`}
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* History Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Recent Activity</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>

          {showHistory && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {history.length > 0 ? (
                history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.newMode)}
                      <span className="text-sm">
                        {item.previousMode} → {item.newMode}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
