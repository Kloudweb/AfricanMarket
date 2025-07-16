
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Phone, 
  Video, 
  PhoneOff, 
  Mic, 
  MicOff, 
  VideoOff, 
  Volume2, 
  VolumeX,
  Clock,
  Signal,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Call {
  id: string
  callerId: string
  calleeId: string
  callType: 'VOICE' | 'VIDEO'
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'ENDED' | 'MISSED' | 'DECLINED' | 'FAILED'
  duration?: number
  startedAt?: string
  answeredAt?: string
  endedAt?: string
  caller: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  callee: {
    id: string
    name: string
    avatar?: string
    role: string
  }
}

interface CallInterfaceProps {
  rideId: string
  currentUserId: string
  otherUserId: string
  otherUser: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  activeCall?: Call
  onCallEnd?: () => void
}

export default function CallInterface({ 
  rideId, 
  currentUserId, 
  otherUserId, 
  otherUser, 
  activeCall,
  onCallEnd 
}: CallInterfaceProps) {
  const [call, setCall] = useState<Call | null>(activeCall || null)
  const [isLoading, setIsLoading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [callHistory, setCallHistory] = useState<Call[]>([])
  const [connectionQuality, setConnectionQuality] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'>('GOOD')

  useEffect(() => {
    if (call?.status === 'ANSWERED' && call.answeredAt) {
      const interval = setInterval(() => {
        const startTime = new Date(call.answeredAt!).getTime()
        const currentTime = new Date().getTime()
        setDuration(Math.floor((currentTime - startTime) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [call])

  useEffect(() => {
    fetchCallHistory()
  }, [rideId])

  const fetchCallHistory = async () => {
    try {
      const response = await fetch(`/api/ride-experience/calls?rideId=${rideId}`)
      const data = await response.json()
      
      if (data.success) {
        setCallHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching call history:', error)
    }
  }

  const initiateCall = async (callType: 'VOICE' | 'VIDEO') => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ride-experience/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          calleeId: otherUserId,
          callType,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setCall(data.data)
        toast.success('Call initiated')
      } else {
        toast.error(data.error || 'Failed to initiate call')
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      toast.error('Failed to initiate call')
    } finally {
      setIsLoading(false)
    }
  }

  const updateCallStatus = async (status: 'ANSWERED' | 'ENDED' | 'DECLINED') => {
    if (!call) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/ride-experience/calls/${call.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      const data = await response.json()
      
      if (data.success) {
        setCall(data.data)
        
        if (status === 'ENDED') {
          onCallEnd?.()
          fetchCallHistory()
        }
      } else {
        toast.error(data.error || 'Failed to update call status')
      }
    } catch (error) {
      console.error('Error updating call status:', error)
      toast.error('Failed to update call status')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'ANSWERED':
        return 'bg-green-100 text-green-800'
      case 'ENDED':
        return 'bg-gray-100 text-gray-800'
      case 'MISSED':
        return 'bg-red-100 text-red-800'
      case 'DECLINED':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getCallStatusText = (status: string) => {
    switch (status) {
      case 'INITIATED':
        return 'Calling...'
      case 'RINGING':
        return 'Ringing...'
      case 'ANSWERED':
        return 'Connected'
      case 'ENDED':
        return 'Call Ended'
      case 'MISSED':
        return 'Missed Call'
      case 'DECLINED':
        return 'Declined'
      case 'FAILED':
        return 'Call Failed'
      default:
        return status
    }
  }

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'EXCELLENT':
        return 'text-green-500'
      case 'GOOD':
        return 'text-blue-500'
      case 'FAIR':
        return 'text-yellow-500'
      case 'POOR':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  if (call && (call.status === 'INITIATED' || call.status === 'RINGING' || call.status === 'ANSWERED')) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* User Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32 mx-auto">
                <AvatarImage src={otherUser.avatar} />
                <AvatarFallback className="text-2xl">
                  {otherUser.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {/* Call Type Badge */}
              <Badge className="absolute -top-2 -right-2">
                {call.callType === 'VIDEO' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              </Badge>
            </div>
            
            {/* User Info */}
            <div>
              <h2 className="text-xl font-semibold">{otherUser.name}</h2>
              <p className="text-gray-600 capitalize">{otherUser.role}</p>
            </div>
            
            {/* Call Status */}
            <div className="space-y-2">
              <Badge className={getCallStatusColor(call.status)}>
                {getCallStatusText(call.status)}
              </Badge>
              
              {call.status === 'ANSWERED' && (
                <div className="flex items-center justify-center gap-2 text-lg font-mono">
                  <Clock className="h-5 w-5" />
                  {formatDuration(duration)}
                </div>
              )}
              
              {/* Connection Quality */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Signal className={cn('h-4 w-4', getConnectionQualityColor(connectionQuality))} />
                <span className="text-gray-600">{connectionQuality}</span>
              </div>
            </div>
            
            {/* Call Controls */}
            <div className="flex justify-center gap-4">
              {call.status === 'ANSWERED' && (
                <>
                  {/* Mute Button */}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                      'rounded-full w-12 h-12',
                      isMuted && 'bg-red-50 border-red-200 text-red-600'
                    )}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  
                  {/* Video Button (if video call) */}
                  {call.callType === 'VIDEO' && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                      className={cn(
                        'rounded-full w-12 h-12',
                        !isVideoEnabled && 'bg-red-50 border-red-200 text-red-600'
                      )}
                    >
                      {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>
                  )}
                  
                  {/* Speaker Button */}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={cn(
                      'rounded-full w-12 h-12',
                      isSpeakerOn && 'bg-blue-50 border-blue-200 text-blue-600'
                    )}
                  >
                    {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
                </>
              )}
              
              {/* End Call Button */}
              <Button
                variant="destructive"
                size="lg"
                onClick={() => updateCallStatus(call.status === 'ANSWERED' ? 'ENDED' : 'DECLINED')}
                disabled={isLoading}
                className="rounded-full w-12 h-12"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Call Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Call {otherUser.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser.avatar} />
              <AvatarFallback>
                {otherUser.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-semibold">{otherUser.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{otherUser.role}</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => initiateCall('VOICE')}
                disabled={isLoading}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Voice Call
              </Button>
              <Button
                variant="outline"
                onClick={() => initiateCall('VIDEO')}
                disabled={isLoading}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call History */}
      {callHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Call History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {callHistory.map((historyCall) => (
                <div key={historyCall.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {historyCall.callType === 'VIDEO' ? (
                        <Video className="h-5 w-5 text-gray-600" />
                      ) : (
                        <Phone className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {historyCall.callType === 'VIDEO' ? 'Video Call' : 'Voice Call'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(historyCall.startedAt || new Date()).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getCallStatusColor(historyCall.status)}>
                      {getCallStatusText(historyCall.status)}
                    </Badge>
                    {historyCall.duration && (
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDuration(historyCall.duration)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-16">
              <div className="text-center">
                <PhoneIncoming className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Callback</span>
              </div>
            </Button>
            <Button variant="outline" className="h-16">
              <div className="text-center">
                <PhoneMissed className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Missed Calls</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
