
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, Square, Clock, DollarSign, Package } from 'lucide-react'
import { toast } from 'sonner'

interface DriverShiftControlsProps {
  activeShift: any
  onShiftChange: () => void
}

export function DriverShiftControls({ activeShift, onShiftChange }: DriverShiftControlsProps) {
  const [loading, setLoading] = useState(false)

  const handleStartShift = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/drivers/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      if (response.ok) {
        toast.success('Shift started successfully')
        onShiftChange()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to start shift')
      }
    } catch (error) {
      toast.error('Failed to start shift')
    } finally {
      setLoading(false)
    }
  }

  const handleEndShift = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/drivers/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' })
      })

      if (response.ok) {
        toast.success('Shift ended successfully')
        onShiftChange()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to end shift')
      }
    } catch (error) {
      toast.error('Failed to end shift')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (startTime: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / 1000 / 60)
    
    const hours = Math.floor(diffInMinutes / 60)
    const minutes = diffInMinutes % 60
    
    return `${hours}h ${minutes}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Shift Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {activeShift ? (
              <>
                <Badge className="bg-green-100 text-green-800">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  On Shift
                </Badge>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>Started: {new Date(activeShift.startTime).toLocaleTimeString()}</span>
                    <span>Duration: {formatDuration(activeShift.startTime)}</span>
                  </div>
                </div>
              </>
            ) : (
              <Badge variant="secondary">
                <div className="h-2 w-2 bg-gray-500 rounded-full mr-2"></div>
                Off Shift
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {activeShift ? (
              <Button
                variant="outline"
                onClick={handleEndShift}
                disabled={loading}
                size="sm"
              >
                <Square className="h-4 w-4 mr-2" />
                End Shift
              </Button>
            ) : (
              <Button
                onClick={handleStartShift}
                disabled={loading}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Shift
              </Button>
            )}
          </div>
        </div>

        {/* Shift Stats */}
        {activeShift && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${activeShift.totalEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-gray-600">Earnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {activeShift.totalDeliveries || 0}
                </div>
                <div className="text-sm text-gray-600">Deliveries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {activeShift.totalDistance?.toFixed(1) || '0.0'}km
                </div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
