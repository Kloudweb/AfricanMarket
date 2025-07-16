
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Mail, MessageSquare, Smartphone, Clock, Volume2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface NotificationPreferencesProps {
  className?: string
}

export default function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences()
    }
  }, [session?.user?.id])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/realtime/notifications/preferences')
      const data = await response.json()
      
      if (response.ok) {
        setPreferences(data.preferences || {})
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/realtime/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Notification preferences updated'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update preferences',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: string, value: any) => {
    setPreferences((prev: any) => ({
      ...prev,
      [key]: value
    }))
  }

  if (!session?.user?.id) {
    return null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="font-medium">Notification Channels</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label htmlFor="push-enabled">Push Notifications</Label>
              </div>
              <Switch
                id="push-enabled"
                checked={preferences.pushEnabled}
                onCheckedChange={(checked) => updatePreference('pushEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label htmlFor="email-enabled">Email Notifications</Label>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <Label htmlFor="sms-enabled">SMS Notifications</Label>
              </div>
              <Switch
                id="sms-enabled"
                checked={preferences.smsEnabled}
                onCheckedChange={(checked) => updatePreference('smsEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label htmlFor="inapp-enabled">In-App Notifications</Label>
              </div>
              <Switch
                id="inapp-enabled"
                checked={preferences.inAppEnabled}
                onCheckedChange={(checked) => updatePreference('inAppEnabled', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Categories */}
        <div className="space-y-4">
          <h3 className="font-medium">Notification Categories</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="order-updates">Order Updates</Label>
              <Switch
                id="order-updates"
                checked={preferences.orderUpdates}
                onCheckedChange={(checked) => updatePreference('orderUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ride-updates">Ride Updates</Label>
              <Switch
                id="ride-updates"
                checked={preferences.rideUpdates}
                onCheckedChange={(checked) => updatePreference('rideUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="payment-updates">Payment Updates</Label>
              <Switch
                id="payment-updates"
                checked={preferences.paymentUpdates}
                onCheckedChange={(checked) => updatePreference('paymentUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="marketing-updates">Marketing Updates</Label>
              <Switch
                id="marketing-updates"
                checked={preferences.marketingUpdates}
                onCheckedChange={(checked) => updatePreference('marketingUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="system-updates">System Updates</Label>
              <Switch
                id="system-updates"
                checked={preferences.systemUpdates}
                onCheckedChange={(checked) => updatePreference('systemUpdates', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Timing Preferences */}
        <div className="space-y-4">
          <h3 className="font-medium">Timing Preferences</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label htmlFor="quiet-hours">Quiet Hours</Label>
              </div>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHours}
                onCheckedChange={(checked) => updatePreference('quietHours', checked)}
              />
            </div>

            {preferences.quietHours && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietStart || '22:00'}
                    onChange={(e) => updatePreference('quietStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietEnd || '08:00'}
                    onChange={(e) => updatePreference('quietEnd', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="real-time">Real-time Updates</Label>
              <Switch
                id="real-time"
                checked={preferences.realTime}
                onCheckedChange={(checked) => updatePreference('realTime', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="digest">Digest Notifications</Label>
              <Switch
                id="digest"
                checked={preferences.digest}
                onCheckedChange={(checked) => updatePreference('digest', checked)}
              />
            </div>

            {preferences.digest && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="digest-frequency">Frequency</Label>
                  <Select
                    value={preferences.digestFrequency || 'daily'}
                    onValueChange={(value) => updatePreference('digestFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digest-time">Time</Label>
                  <Input
                    id="digest-time"
                    type="time"
                    value={preferences.digestTime || '09:00'}
                    onChange={(e) => updatePreference('digestTime', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Priority Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Priority Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Minimum Priority Level</Label>
            <Select
              value={preferences.priority || 'NORMAL'}
              onValueChange={(value) => updatePreference('priority', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="ALL">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={savePreferences}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

