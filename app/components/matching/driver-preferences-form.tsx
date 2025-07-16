
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  MapPin, 
  Clock, 
  Bell, 
  DollarSign, 
  Car, 
  Package,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { ServiceType } from '@/lib/types'

interface DriverPreferencesFormProps {
  driverId: string
  onSave?: () => void
}

export default function DriverPreferencesForm({ driverId, onSave }: DriverPreferencesFormProps) {
  const [preferences, setPreferences] = useState<any>({
    serviceTypes: ['BOTH'],
    maxDistance: 15,
    maxOrderValue: null,
    minOrderValue: null,
    preferredCuisines: [],
    avoidCuisines: [],
    acceptCashOnDelivery: true,
    acceptLargeOrders: true,
    acceptBulkOrders: true,
    acceptScheduledOrders: true,
    acceptSharedRides: true,
    acceptLongRides: true,
    acceptAirportRides: true,
    maxPassengers: 4,
    preferredAreas: [],
    avoidAreas: [],
    workingHours: null,
    breakDuration: 30,
    maxConsecutiveHours: 8,
    enablePushNotifications: true,
    enableSmsNotifications: true,
    enableEmailNotifications: false,
    notificationSound: 'default',
    vibrationEnabled: true,
    autoAcceptOrders: false,
    autoAcceptThreshold: null,
    responseTimeLimit: 30
  })

  const [workingHours, setWorkingHours] = useState<any[]>([])
  const [serviceAreas, setServiceAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cuisineOptions = [
    'Italian', 'Chinese', 'Indian', 'Mexican', 'Thai', 'Japanese', 'American', 
    'Mediterranean', 'French', 'Greek', 'Korean', 'Vietnamese', 'Caribbean'
  ]

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]

  useEffect(() => {
    loadPreferences()
  }, [driverId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/matching/driver-preferences')
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          setPreferences({ ...preferences, ...data.preferences })
        }
        setWorkingHours(data.workingHours || [])
        setServiceAreas(data.serviceAreas || [])
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      setError('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/matching/driver-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        setSuccess('Preferences saved successfully!')
        onSave?.()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setError('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const saveWorkingHours = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/matching/working-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workingHours })
      })

      if (response.ok) {
        setSuccess('Working hours saved successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save working hours')
      }
    } catch (error) {
      console.error('Error saving working hours:', error)
      setError('Failed to save working hours')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: string, value: any) => {
    setPreferences((prev: any) => ({ ...prev, [key]: value }))
  }

  const toggleServiceType = (type: ServiceType) => {
    const current = preferences.serviceTypes || []
    if (current.includes(type)) {
      updatePreference('serviceTypes', current.filter((t: ServiceType) => t !== type))
    } else {
      updatePreference('serviceTypes', [...current, type])
    }
  }

  const addToArray = (key: string, value: string) => {
    if (value.trim()) {
      const current = preferences[key] || []
      if (!current.includes(value)) {
        updatePreference(key, [...current, value])
      }
    }
  }

  const removeFromArray = (key: string, value: string) => {
    const current = preferences[key] || []
    updatePreference(key, current.filter((item: string) => item !== value))
  }

  const updateWorkingHour = (dayIndex: number, field: string, value: any) => {
    const updated = [...workingHours]
    if (!updated[dayIndex]) {
      updated[dayIndex] = {
        dayOfWeek: dayIndex,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      }
    }
    updated[dayIndex][field] = value
    setWorkingHours(updated)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Driver Preferences</h1>
            <p className="text-gray-600">Customize your delivery and ride preferences</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Preferences Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="w-5 h-5" />
                <span>Service Types</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>What services do you provide?</Label>
                <div className="flex flex-wrap gap-2">
                  {(['FOOD_DELIVERY', 'RIDESHARE', 'BOTH'] as ServiceType[]).map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={preferences.serviceTypes?.includes(type)}
                        onCheckedChange={() => toggleServiceType(type)}
                      />
                      <Label htmlFor={type} className="text-sm">
                        {type.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxDistance">Maximum Distance (km)</Label>
                  <Input
                    id="maxDistance"
                    type="number"
                    min="1"
                    max="50"
                    value={preferences.maxDistance || ''}
                    onChange={(e) => updatePreference('maxDistance', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPassengers">Maximum Passengers</Label>
                  <Input
                    id="maxPassengers"
                    type="number"
                    min="1"
                    max="8"
                    value={preferences.maxPassengers || ''}
                    onChange={(e) => updatePreference('maxPassengers', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minOrderValue">Minimum Order Value ($)</Label>
                  <Input
                    id="minOrderValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={preferences.minOrderValue || ''}
                    onChange={(e) => updatePreference('minOrderValue', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxOrderValue">Maximum Order Value ($)</Label>
                  <Input
                    id="maxOrderValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={preferences.maxOrderValue || ''}
                    onChange={(e) => updatePreference('maxOrderValue', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Delivery Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Accept Cash on Delivery</Label>
                  <Switch
                    checked={preferences.acceptCashOnDelivery}
                    onCheckedChange={(checked) => updatePreference('acceptCashOnDelivery', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Accept Large Orders</Label>
                  <Switch
                    checked={preferences.acceptLargeOrders}
                    onCheckedChange={(checked) => updatePreference('acceptLargeOrders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Accept Bulk Orders</Label>
                  <Switch
                    checked={preferences.acceptBulkOrders}
                    onCheckedChange={(checked) => updatePreference('acceptBulkOrders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Accept Scheduled Orders</Label>
                  <Switch
                    checked={preferences.acceptScheduledOrders}
                    onCheckedChange={(checked) => updatePreference('acceptScheduledOrders', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Cuisines</Label>
                <div className="flex flex-wrap gap-2">
                  {cuisineOptions.map(cuisine => (
                    <Badge
                      key={cuisine}
                      variant={preferences.preferredCuisines?.includes(cuisine) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (preferences.preferredCuisines?.includes(cuisine)) {
                          removeFromArray('preferredCuisines', cuisine)
                        } else {
                          addToArray('preferredCuisines', cuisine)
                        }
                      }}
                    >
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="w-5 h-5" />
                <span>Rideshare Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Accept Shared Rides</Label>
                  <Switch
                    checked={preferences.acceptSharedRides}
                    onCheckedChange={(checked) => updatePreference('acceptSharedRides', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Accept Long Rides</Label>
                  <Switch
                    checked={preferences.acceptLongRides}
                    onCheckedChange={(checked) => updatePreference('acceptLongRides', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Accept Airport Rides</Label>
                  <Switch
                    checked={preferences.acceptAirportRides}
                    onCheckedChange={(checked) => updatePreference('acceptAirportRides', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Push Notifications</Label>
                  <Switch
                    checked={preferences.enablePushNotifications}
                    onCheckedChange={(checked) => updatePreference('enablePushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>SMS Notifications</Label>
                  <Switch
                    checked={preferences.enableSmsNotifications}
                    onCheckedChange={(checked) => updatePreference('enableSmsNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Email Notifications</Label>
                  <Switch
                    checked={preferences.enableEmailNotifications}
                    onCheckedChange={(checked) => updatePreference('enableEmailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Vibration</Label>
                  <Switch
                    checked={preferences.vibrationEnabled}
                    onCheckedChange={(checked) => updatePreference('vibrationEnabled', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseTimeLimit">Response Time Limit (seconds)</Label>
                <Input
                  id="responseTimeLimit"
                  type="number"
                  min="10"
                  max="120"
                  value={preferences.responseTimeLimit || ''}
                  onChange={(e) => updatePreference('responseTimeLimit', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto-Accept Orders</Label>
                  <Switch
                    checked={preferences.autoAcceptOrders}
                    onCheckedChange={(checked) => updatePreference('autoAcceptOrders', checked)}
                  />
                </div>

                {preferences.autoAcceptOrders && (
                  <div className="space-y-2">
                    <Label htmlFor="autoAcceptThreshold">Auto-Accept Threshold (%)</Label>
                    <Input
                      id="autoAcceptThreshold"
                      type="number"
                      min="0"
                      max="100"
                      value={preferences.autoAcceptThreshold || ''}
                      onChange={(e) => updatePreference('autoAcceptThreshold', parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Working Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {daysOfWeek.map((day, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-20">
                      <Label className="text-sm font-medium">{day}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={workingHours[index]?.isActive ?? false}
                        onCheckedChange={(checked) => updateWorkingHour(index, 'isActive', checked)}
                      />
                      <Label className="text-sm">Available</Label>
                    </div>
                    {workingHours[index]?.isActive && (
                      <>
                        <Input
                          type="time"
                          value={workingHours[index]?.startTime || '09:00'}
                          onChange={(e) => updateWorkingHour(index, 'startTime', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <Input
                          type="time"
                          value={workingHours[index]?.endTime || '17:00'}
                          onChange={(e) => updateWorkingHour(index, 'endTime', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    min="0"
                    max="120"
                    value={preferences.breakDuration || ''}
                    onChange={(e) => updatePreference('breakDuration', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxConsecutiveHours">Max Consecutive Hours</Label>
                  <Input
                    id="maxConsecutiveHours"
                    type="number"
                    min="1"
                    max="12"
                    value={preferences.maxConsecutiveHours || ''}
                    onChange={(e) => updatePreference('maxConsecutiveHours', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveWorkingHours} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving} className="w-32">
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
