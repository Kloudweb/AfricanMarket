
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Route, 
  Car,
  AlertTriangle,
  VolumeX,
  Volume2,
  Zap,
  History,
  Settings,
  Play,
  Pause,
  Square,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

interface NavigationSession {
  id: string
  navigationId: string
  orderId?: string
  rideId?: string
  startLocation: {
    lat: number
    lng: number
    address?: string
  }
  endLocation: {
    lat: number
    lng: number
    address?: string
  }
  waypoints?: Array<{
    lat: number
    lng: number
    address?: string
  }>
  distance?: number
  estimatedTime?: number
  actualTime?: number
  trafficCondition?: string
  completedAt?: string
  cancelledAt?: string
  createdAt: string
}

interface NavigationPreferences {
  preferredMapProvider: string
  avoidTolls: boolean
  avoidHighways: boolean
  voiceNavigationEnabled: boolean
  defaultTravelMode: string
  units: string
}

export function NavigationIntegration() {
  const { data: session } = useSession()
  const [activeNavigation, setActiveNavigation] = useState<NavigationSession | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<NavigationSession[]>([])
  const [preferences, setPreferences] = useState<NavigationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [routeData, setRouteData] = useState<any>(null)
  const [trafficAlerts, setTrafficAlerts] = useState<string[]>([])
  
  const mapRef = useRef<HTMLDivElement>(null)
  const speechSynthesis = window.speechSynthesis

  useEffect(() => {
    if (session?.user?.id) {
      fetchNavigationPreferences()
      fetchNavigationHistory()
    }
  }, [session])

  const fetchNavigationPreferences = async () => {
    try {
      const response = await fetch('/api/drivers/maps')
      if (!response.ok) throw new Error('Failed to fetch preferences')
      
      const data = await response.json()
      setPreferences(data.preferences)
      setVoiceEnabled(data.preferences.voiceNavigationEnabled)
    } catch (error) {
      console.error('Error fetching navigation preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNavigationHistory = async () => {
    try {
      const response = await fetch('/api/drivers/navigation?limit=20')
      if (!response.ok) throw new Error('Failed to fetch navigation history')
      
      const data = await response.json()
      setNavigationHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching navigation history:', error)
    }
  }

  const getDirections = async (origin: string, destination: string) => {
    try {
      const response = await fetch('/api/drivers/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'directions',
          origin,
          destination,
          travelMode: preferences?.defaultTravelMode || 'DRIVING',
          avoidTolls: preferences?.avoidTolls || false,
          avoidHighways: preferences?.avoidHighways || false
        })
      })

      if (!response.ok) throw new Error('Failed to get directions')
      
      const data = await response.json()
      setRouteData(data.directions)
      
      // Mock traffic alerts
      setTrafficAlerts([
        'Heavy traffic on Water Street',
        'Road construction on Duckworth Street'
      ])
      
      return data.directions
    } catch (error) {
      console.error('Error getting directions:', error)
      toast.error('Failed to get directions')
      return null
    }
  }

  const startNavigation = async () => {
    if (!startAddress || !endAddress) {
      toast.error('Please enter both start and end addresses')
      return
    }

    try {
      setNavigating(true)
      
      // Get directions first
      const directions = await getDirections(startAddress, endAddress)
      if (!directions) return

      const route = directions.routes[0]
      const leg = route.legs[0]

      // Start navigation session
      const navigationId = `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const response = await fetch('/api/drivers/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLocation: { 
            lat: 47.5615, 
            lng: -52.7126, 
            address: startAddress 
          },
          endLocation: { 
            lat: 47.5665, 
            lng: -52.7100, 
            address: endAddress 
          },
          distance: leg.distance.value / 1000, // Convert to km
          estimatedTime: leg.duration.value / 60, // Convert to minutes
          routeData: directions,
          trafficCondition: 'MODERATE'
        })
      })

      if (!response.ok) throw new Error('Failed to start navigation')
      
      const data = await response.json()
      setActiveNavigation(data.navigation)
      
      // Start voice navigation if enabled
      if (voiceEnabled && preferences?.voiceNavigationEnabled) {
        speakInstruction(`Starting navigation to ${endAddress}. Distance: ${leg.distance.text}. Estimated time: ${leg.duration.text}`)
      }
      
      toast.success('Navigation started')
    } catch (error) {
      console.error('Error starting navigation:', error)
      toast.error('Failed to start navigation')
    } finally {
      setNavigating(false)
    }
  }

  const stopNavigation = async () => {
    if (!activeNavigation) return

    try {
      await fetch('/api/drivers/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          navigationId: activeNavigation.navigationId,
          completed: true,
          actualTime: Math.floor((Date.now() - new Date(activeNavigation.createdAt).getTime()) / 1000 / 60)
        })
      })

      setActiveNavigation(null)
      setRouteData(null)
      setTrafficAlerts([])
      
      if (voiceEnabled) {
        speakInstruction('Navigation completed')
      }
      
      toast.success('Navigation completed')
      fetchNavigationHistory()
    } catch (error) {
      console.error('Error stopping navigation:', error)
      toast.error('Failed to stop navigation')
    }
  }

  const speakInstruction = (text: string) => {
    if (!voiceEnabled || !speechSynthesis) return

    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    speechSynthesis.speak(utterance)
  }

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch('/api/drivers/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'geocode',
          address
        })
      })

      if (!response.ok) throw new Error('Failed to geocode address')
      
      const data = await response.json()
      return data.geocode.results[0]
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }

  const openInMaps = (address: string) => {
    const mapUrl = preferences?.preferredMapProvider === 'APPLE' 
      ? `https://maps.apple.com/?q=${encodeURIComponent(address)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    
    window.open(mapUrl, '_blank')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Navigation
          </div>
          <div className="flex items-center gap-2">
            {activeNavigation && (
              <Badge className="bg-green-100 text-green-800">
                <Car className="h-3 w-3 mr-1" />
                Navigating
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="navigation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="route">Route Info</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="navigation" className="space-y-4">
            {/* Navigation Controls */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From</label>
                  <Input
                    placeholder="Enter start address..."
                    value={startAddress}
                    onChange={(e) => setStartAddress(e.target.value)}
                    disabled={!!activeNavigation}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To</label>
                  <Input
                    placeholder="Enter destination address..."
                    value={endAddress}
                    onChange={(e) => setEndAddress(e.target.value)}
                    disabled={!!activeNavigation}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {!activeNavigation ? (
                  <Button
                    onClick={startNavigation}
                    disabled={!startAddress || !endAddress || navigating}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {navigating ? 'Starting...' : 'Start Navigation'}
                  </Button>
                ) : (
                  <Button
                    onClick={stopNavigation}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Navigation
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => openInMaps(endAddress)}
                  disabled={!endAddress}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Open in Maps
                </Button>
              </div>
            </div>

            {/* Active Navigation */}
            {activeNavigation && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Active Navigation</span>
                    <Badge variant="outline" className="bg-green-100">
                      {activeNavigation.trafficCondition}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>To: {activeNavigation.endLocation.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      <span>Distance: {activeNavigation.distance?.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>ETA: {activeNavigation.estimatedTime} min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Traffic Alerts */}
            {trafficAlerts.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Traffic Alerts</span>
                  </div>
                  <div className="space-y-2">
                    {trafficAlerts.map((alert, index) => (
                      <div key={index} className="text-sm text-yellow-800">
                        • {alert}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mock Map */}
            <Card>
              <CardContent className="pt-4">
                <div 
                  ref={mapRef}
                  className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center"
                >
                  <div className="text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2" />
                    <p>Map View</p>
                    <p className="text-sm">
                      {activeNavigation ? 'Navigation Active' : 'Enter addresses to start navigation'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="route" className="space-y-4">
            {routeData ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Route Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Distance:</span>
                        <span className="font-medium">{routeData.routes[0].legs[0].distance.text}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">{routeData.routes[0].legs[0].duration.text}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Route:</span>
                        <span className="font-medium">{routeData.routes[0].summary}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Turn-by-Turn Directions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {routeData.routes[0].legs[0].steps.map((step: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                            <div className="min-w-0 flex-1">
                              <div 
                                className="text-sm"
                                dangerouslySetInnerHTML={{ __html: step.html_instructions }}
                              />
                              <div className="text-xs text-gray-600 mt-1">
                                {step.distance.text} • {step.duration.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Route className="h-12 w-12 mx-auto mb-2" />
                    <p>No route information available</p>
                    <p className="text-sm">Start navigation to see route details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Navigation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {navigationHistory.length > 0 ? (
                    <div className="space-y-3">
                      {navigationHistory.map((session) => (
                        <div key={session.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {session.startLocation.address || 'Unknown'} → {session.endLocation.address || 'Unknown'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {session.completedAt ? 'Completed' : session.cancelledAt ? 'Cancelled' : 'In Progress'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span>Distance: {session.distance?.toFixed(1)} km</span>
                              <span>Time: {session.actualTime || session.estimatedTime} min</span>
                            </div>
                            <div>
                              {new Date(session.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <History className="h-12 w-12 mx-auto mb-2" />
                      <p>No navigation history</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
