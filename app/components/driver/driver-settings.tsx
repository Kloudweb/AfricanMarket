
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Bell, 
  Volume2, 
  Navigation, 
  DollarSign, 
  Shield, 
  MapPin,
  Clock,
  Smartphone,
  Save,
  RotateCcw,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface DriverSettings {
  // Notification preferences
  enablePushNotifications: boolean
  enableSoundAlerts: boolean
  enableVibration: boolean
  notificationRadius: number
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string

  // Request preferences
  autoAcceptRequests: boolean
  acceptanceTimeLimit: number
  minOrderValue: number
  maxDeliveryDistance: number
  preferredOrderTypes: string[]

  // Navigation preferences
  preferredMapProvider: string
  avoidTolls: boolean
  avoidHighways: boolean
  voiceNavigationEnabled: boolean

  // Performance goals
  dailyEarningsGoal: number
  weeklyEarningsGoal: number
  monthlyEarningsGoal: number
  dailyDeliveryGoal: number
  weeklyDeliveryGoal: number

  // Privacy settings
  shareLocationWithCustomer: boolean
  shareETAWithCustomer: boolean
  allowCustomerCalls: boolean
  allowCustomerMessages: boolean
}

const ORDER_TYPES = [
  { value: 'FOOD', label: 'Food & Restaurants' },
  { value: 'GROCERY', label: 'Grocery & Supermarkets' },
  { value: 'PHARMACY', label: 'Pharmacy & Health' },
  { value: 'RETAIL', label: 'Retail & Shopping' },
  { value: 'ALCOHOL', label: 'Alcohol & Beverages' },
  { value: 'FLOWERS', label: 'Flowers & Gifts' }
]

export function DriverSettings() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<DriverSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/drivers/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      
      const data = await response.json()
      setSettings(data.settings)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    if (!settings) return
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
    setHasChanges(true)
  }

  const toggleOrderType = (type: string) => {
    if (!settings) return
    
    const newTypes = settings.preferredOrderTypes.includes(type)
      ? settings.preferredOrderTypes.filter(t => t !== type)
      : [...settings.preferredOrderTypes, type]
    
    updateSetting('preferredOrderTypes', newTypes)
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/drivers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      toast.success('Settings saved successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = () => {
    fetchSettings()
    setHasChanges(false)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Driver Settings
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

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load driver settings. Please try again.
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
            <Settings className="h-5 w-5" />
            Driver Settings
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              disabled={!hasChanges || saving}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notification Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-gray-600">Receive notifications for new requests</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={settings.enablePushNotifications}
                    onCheckedChange={(checked) => updateSetting('enablePushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sound-alerts">Sound Alerts</Label>
                    <p className="text-sm text-gray-600">Play sound for notifications</p>
                  </div>
                  <Switch
                    id="sound-alerts"
                    checked={settings.enableSoundAlerts}
                    onCheckedChange={(checked) => updateSetting('enableSoundAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="vibration">Vibration</Label>
                    <p className="text-sm text-gray-600">Vibrate device for notifications</p>
                  </div>
                  <Switch
                    id="vibration"
                    checked={settings.enableVibration}
                    onCheckedChange={(checked) => updateSetting('enableVibration', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Notification Radius</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Receive notifications for requests within {settings.notificationRadius} km
                  </p>
                  <Slider
                    value={[settings.notificationRadius]}
                    onValueChange={(value) => updateSetting('notificationRadius', value[0])}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="quiet-hours">Quiet Hours</Label>
                      <p className="text-sm text-gray-600">Disable notifications during certain hours</p>
                    </div>
                    <Switch
                      id="quiet-hours"
                      checked={settings.quietHoursEnabled}
                      onCheckedChange={(checked) => updateSetting('quietHoursEnabled', checked)}
                    />
                  </div>

                  {settings.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quiet-start">Start Time</Label>
                        <Input
                          id="quiet-start"
                          type="time"
                          value={settings.quietHoursStart}
                          onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quiet-end">End Time</Label>
                        <Input
                          id="quiet-end"
                          type="time"
                          value={settings.quietHoursEnd}
                          onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Request Preferences
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-accept">Auto-Accept Requests</Label>
                    <p className="text-sm text-gray-600">Automatically accept matching requests</p>
                  </div>
                  <Switch
                    id="auto-accept"
                    checked={settings.autoAcceptRequests}
                    onCheckedChange={(checked) => updateSetting('autoAcceptRequests', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acceptance-time">Response Time Limit (seconds)</Label>
                  <Input
                    id="acceptance-time"
                    type="number"
                    value={settings.acceptanceTimeLimit}
                    onChange={(e) => updateSetting('acceptanceTimeLimit', parseInt(e.target.value))}
                    min="10"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-order-value">Minimum Order Value ($)</Label>
                  <Input
                    id="min-order-value"
                    type="number"
                    value={settings.minOrderValue}
                    onChange={(e) => updateSetting('minOrderValue', parseFloat(e.target.value))}
                    min="0"
                    step="0.50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-distance">Maximum Delivery Distance (km)</Label>
                  <Input
                    id="max-distance"
                    type="number"
                    value={settings.maxDeliveryDistance}
                    onChange={(e) => updateSetting('maxDeliveryDistance', parseFloat(e.target.value))}
                    min="1"
                    max="50"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Preferred Order Types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORDER_TYPES.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type.value}
                          checked={settings.preferredOrderTypes.includes(type.value)}
                          onChange={() => toggleOrderType(type.value)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={type.value} className="text-sm">{type.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="navigation" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Navigation Preferences
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="map-provider">Preferred Map Provider</Label>
                  <Select 
                    value={settings.preferredMapProvider} 
                    onValueChange={(value) => updateSetting('preferredMapProvider', value)}
                  >
                    <SelectTrigger id="map-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOGLE">Google Maps</SelectItem>
                      <SelectItem value="APPLE">Apple Maps</SelectItem>
                      <SelectItem value="WAZE">Waze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="avoid-tolls">Avoid Tolls</Label>
                    <p className="text-sm text-gray-600">Avoid toll roads in navigation</p>
                  </div>
                  <Switch
                    id="avoid-tolls"
                    checked={settings.avoidTolls}
                    onCheckedChange={(checked) => updateSetting('avoidTolls', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="avoid-highways">Avoid Highways</Label>
                    <p className="text-sm text-gray-600">Avoid highways in navigation</p>
                  </div>
                  <Switch
                    id="avoid-highways"
                    checked={settings.avoidHighways}
                    onCheckedChange={(checked) => updateSetting('avoidHighways', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="voice-navigation">Voice Navigation</Label>
                    <p className="text-sm text-gray-600">Enable voice-guided navigation</p>
                  </div>
                  <Switch
                    id="voice-navigation"
                    checked={settings.voiceNavigationEnabled}
                    onCheckedChange={(checked) => updateSetting('voiceNavigationEnabled', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Performance Goals
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-earnings">Daily Earnings Goal ($)</Label>
                  <Input
                    id="daily-earnings"
                    type="number"
                    value={settings.dailyEarningsGoal}
                    onChange={(e) => updateSetting('dailyEarningsGoal', parseFloat(e.target.value))}
                    min="0"
                    step="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-earnings">Weekly Earnings Goal ($)</Label>
                  <Input
                    id="weekly-earnings"
                    type="number"
                    value={settings.weeklyEarningsGoal}
                    onChange={(e) => updateSetting('weeklyEarningsGoal', parseFloat(e.target.value))}
                    min="0"
                    step="50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-earnings">Monthly Earnings Goal ($)</Label>
                  <Input
                    id="monthly-earnings"
                    type="number"
                    value={settings.monthlyEarningsGoal}
                    onChange={(e) => updateSetting('monthlyEarningsGoal', parseFloat(e.target.value))}
                    min="0"
                    step="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily-deliveries">Daily Deliveries Goal</Label>
                  <Input
                    id="daily-deliveries"
                    type="number"
                    value={settings.dailyDeliveryGoal}
                    onChange={(e) => updateSetting('dailyDeliveryGoal', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-deliveries">Weekly Deliveries Goal</Label>
                  <Input
                    id="weekly-deliveries"
                    type="number"
                    value={settings.weeklyDeliveryGoal}
                    onChange={(e) => updateSetting('weeklyDeliveryGoal', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="share-location">Share Location with Customer</Label>
                    <p className="text-sm text-gray-600">Allow customers to track your location</p>
                  </div>
                  <Switch
                    id="share-location"
                    checked={settings.shareLocationWithCustomer}
                    onCheckedChange={(checked) => updateSetting('shareLocationWithCustomer', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="share-eta">Share ETA with Customer</Label>
                    <p className="text-sm text-gray-600">Share estimated arrival time</p>
                  </div>
                  <Switch
                    id="share-eta"
                    checked={settings.shareETAWithCustomer}
                    onCheckedChange={(checked) => updateSetting('shareETAWithCustomer', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-calls">Allow Customer Calls</Label>
                    <p className="text-sm text-gray-600">Allow customers to call you directly</p>
                  </div>
                  <Switch
                    id="allow-calls"
                    checked={settings.allowCustomerCalls}
                    onCheckedChange={(checked) => updateSetting('allowCustomerCalls', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-messages">Allow Customer Messages</Label>
                    <p className="text-sm text-gray-600">Allow customers to send you messages</p>
                  </div>
                  <Switch
                    id="allow-messages"
                    checked={settings.allowCustomerMessages}
                    onCheckedChange={(checked) => updateSetting('allowCustomerMessages', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
