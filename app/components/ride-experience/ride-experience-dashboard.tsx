
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  MapPin, 
  MessageCircle, 
  Phone, 
  Shield, 
  Share2, 
  Info,
  Navigation,
  Clock,
  AlertTriangle,
  Settings,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

// Import our ride experience components
import RideChat from './ride-chat'
import LiveTripTracking from './live-trip-tracking'
import SafetyDashboard from './safety-dashboard'
import TripSharing from './trip-sharing'
import CallInterface from './call-interface'
import TripDetails from './trip-details'

interface RideExperienceDashboardProps {
  rideId: string
}

interface RideInfo {
  id: string
  status: string
  customerId: string
  driverId?: string
  customer: {
    id: string
    name: string
    phone: string
    avatar?: string
  }
  driver?: {
    id: string
    user: {
      id: string
      name: string
      phone: string
      avatar?: string
    }
    vehicleType: string
    vehicleMake: string
    vehicleModel: string
    vehicleColor: string
    vehiclePlate: string
    rating: number
  }
}

export default function RideExperienceDashboard({ rideId }: RideExperienceDashboardProps) {
  const { data: session } = useSession()
  const [rideInfo, setRideInfo] = useState<RideInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tracking')
  const [showCallInterface, setShowCallInterface] = useState(false)
  const [showTripSharing, setShowTripSharing] = useState(false)
  const [showTripDetails, setShowTripDetails] = useState(false)
  const [activeCall, setActiveCall] = useState<any>(null)

  useEffect(() => {
    fetchRideInfo()
  }, [rideId])

  const fetchRideInfo = async () => {
    try {
      const response = await fetch(`/api/rideshare/${rideId}`)
      const data = await response.json()
      
      if (data.success) {
        setRideInfo(data.data)
      } else {
        toast.error(data.error || 'Failed to fetch ride information')
      }
    } catch (error) {
      console.error('Error fetching ride info:', error)
      toast.error('Failed to fetch ride information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChatClick = () => {
    setActiveTab('chat')
  }

  const handleCallClick = () => {
    setShowCallInterface(true)
  }

  const handleShareTrip = () => {
    setShowTripSharing(true)
  }

  const handleEmergencyAlert = () => {
    setActiveTab('safety')
  }

  const handleCallEnd = () => {
    setShowCallInterface(false)
    setActiveCall(null)
  }

  const handlePanicButton = () => {
    toast.success('Emergency alert sent successfully')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!rideInfo) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Ride not found</p>
        <Button 
          variant="outline" 
          onClick={fetchRideInfo}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  const isDriver = session?.user?.id === rideInfo.driver?.user.id
  const otherUser = isDriver ? rideInfo.customer : rideInfo.driver?.user
  const otherUserId = isDriver ? rideInfo.customerId : rideInfo.driverId

  if (!otherUser || !otherUserId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {isDriver ? 'Customer information not available' : 'Driver not assigned yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Ride Experience
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Ride #{rideInfo.id.slice(-8)}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setShowTripDetails(true)}>
                <Info className="h-3 w-3 mr-1" />
                Details
              </Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab('safety')}>
                <Shield className="h-3 w-3 mr-1" />
                Safety
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              onClick={handleChatClick}
              className="h-16 flex-col"
            >
              <MessageCircle className="h-6 w-6 mb-1" />
              <span className="text-sm">Chat</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleCallClick}
              className="h-16 flex-col"
            >
              <Phone className="h-6 w-6 mb-1" />
              <span className="text-sm">Call</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleShareTrip}
              className="h-16 flex-col"
            >
              <Share2 className="h-6 w-6 mb-1" />
              <span className="text-sm">Share</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleEmergencyAlert}
              className="h-16 flex-col text-red-600 hover:text-red-700"
            >
              <AlertTriangle className="h-6 w-6 mb-1" />
              <span className="text-sm">Emergency</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracking">Live Tracking</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tracking" className="space-y-4">
          <LiveTripTracking
            rideId={rideId}
            onChatClick={handleChatClick}
            onCallClick={handleCallClick}
            onShareTrip={handleShareTrip}
            onEmergencyAlert={handleEmergencyAlert}
          />
        </TabsContent>
        
        <TabsContent value="chat" className="space-y-4">
          <RideChat
            rideId={rideId}
            otherUserId={otherUserId}
            otherUser={{
              id: otherUser.id,
              name: otherUser.name,
              avatar: otherUser.avatar,
              role: isDriver ? 'customer' : 'driver'
            }}
            onInitiateCall={(type) => {
              setShowCallInterface(true)
              // Handle call initiation
            }}
          />
        </TabsContent>
        
        <TabsContent value="safety" className="space-y-4">
          <SafetyDashboard
            rideId={rideId}
            onPanicButton={handlePanicButton}
            onShareTrip={handleShareTrip}
          />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Communication Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Notification Preferences</span>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Language Settings</span>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Privacy Settings</span>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Call Interface Dialog */}
      <Dialog open={showCallInterface} onOpenChange={setShowCallInterface}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Call Interface</DialogTitle>
          </DialogHeader>
          <CallInterface
            rideId={rideId}
            currentUserId={session?.user?.id || ''}
            otherUserId={otherUserId}
            otherUser={{
              id: otherUser.id,
              name: otherUser.name,
              avatar: otherUser.avatar,
              role: isDriver ? 'customer' : 'driver'
            }}
            activeCall={activeCall}
            onCallEnd={handleCallEnd}
          />
        </DialogContent>
      </Dialog>

      {/* Trip Sharing Dialog */}
      <Dialog open={showTripSharing} onOpenChange={setShowTripSharing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Trip</DialogTitle>
          </DialogHeader>
          <TripSharing
            rideId={rideId}
            onClose={() => setShowTripSharing(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Trip Details Dialog */}
      <Dialog open={showTripDetails} onOpenChange={setShowTripDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
          </DialogHeader>
          <TripDetails
            rideId={rideId}
            onChat={handleChatClick}
            onCall={handleCallClick}
            onShareTrip={handleShareTrip}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
