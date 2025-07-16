
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LocationSearchInput } from './location-search-input'
import { FareEstimateCard } from './fare-estimate-card'
import { RideTypeSelector } from './ride-type-selector'
import { 
  MapPin, 
  Clock, 
  Users, 
  Navigation, 
  Calendar,
  AlertCircle,
  Star,
  Baby,
  Accessibility
} from 'lucide-react'
import { RideRequestFormData, FareEstimate, RideType } from '@/lib/types'

interface RideBookingFormProps {
  onRideRequested: (ride: any) => void
  onFareEstimateUpdate: (estimate: FareEstimate) => void
}

export function RideBookingForm({ onRideRequested, onFareEstimateUpdate }: RideBookingFormProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<RideRequestFormData>({
    pickupAddress: '',
    pickupLatitude: 0,
    pickupLongitude: 0,
    destinationAddress: '',
    destinationLatitude: 0,
    destinationLongitude: 0,
    rideType: 'STANDARD',
    passengers: 1,
    isScheduled: false,
    scheduledFor: '',
    notes: '',
    maxFare: undefined,
    preferredDriverId: '',
    autoAccept: false,
    minRating: undefined,
    allowShared: false,
    requireChild: false,
    requireWheelchair: false,
  })
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null)
  const [rideTypes, setRideTypes] = useState<RideType[]>([])
  const [loading, setLoading] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchRideTypes()
  }, [])

  useEffect(() => {
    if (formData.pickupLatitude && formData.pickupLongitude && 
        formData.destinationLatitude && formData.destinationLongitude) {
      estimateFare()
    }
  }, [
    formData.pickupLatitude,
    formData.pickupLongitude,
    formData.destinationLatitude,
    formData.destinationLongitude,
    formData.rideType,
    formData.isScheduled,
    formData.scheduledFor
  ])

  const fetchRideTypes = async () => {
    try {
      const response = await fetch('/api/rideshare/ride-types?isActive=true&availableNow=true')
      const data = await response.json()
      
      if (data.success) {
        setRideTypes(data.data.rideTypes)
      }
    } catch (error) {
      console.error('Error fetching ride types:', error)
    }
  }

  const estimateFare = async () => {
    if (!formData.pickupLatitude || !formData.destinationLatitude) return

    setEstimating(true)
    try {
      const response = await fetch('/api/rideshare/fare-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupLatitude: formData.pickupLatitude,
          pickupLongitude: formData.pickupLongitude,
          destinationLatitude: formData.destinationLatitude,
          destinationLongitude: formData.destinationLongitude,
          rideType: formData.rideType,
          isScheduled: formData.isScheduled,
          scheduledFor: formData.scheduledFor,
        }),
      })

      const data = await response.json()
      if (data.success) {
        const estimate = data.data.estimates[formData.rideType]
        setFareEstimate(estimate)
        onFareEstimateUpdate(estimate)
      }
    } catch (error) {
      console.error('Error estimating fare:', error)
    } finally {
      setEstimating(false)
    }
  }

  const handleLocationSelect = (type: 'pickup' | 'destination', location: any) => {
    if (type === 'pickup') {
      setFormData(prev => ({
        ...prev,
        pickupAddress: location.address,
        pickupLatitude: location.latitude,
        pickupLongitude: location.longitude,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        destinationAddress: location.address,
        destinationLatitude: location.latitude,
        destinationLongitude: location.longitude,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user) {
      setErrors({ auth: 'Please sign in to request a ride' })
      return
    }

    // Validate form
    const newErrors: Record<string, string> = {}
    
    if (!formData.pickupAddress) {
      newErrors.pickup = 'Pickup address is required'
    }
    
    if (!formData.destinationAddress) {
      newErrors.destination = 'Destination address is required'
    }
    
    if (formData.isScheduled && !formData.scheduledFor) {
      newErrors.scheduledFor = 'Scheduled time is required'
    }
    
    if (formData.isScheduled && formData.scheduledFor) {
      const scheduledTime = new Date(formData.scheduledFor)
      if (scheduledTime <= new Date()) {
        newErrors.scheduledFor = 'Scheduled time must be in the future'
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/rideshare/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (data.success) {
        onRideRequested(data.data.ride)
        // Reset form
        setFormData({
          pickupAddress: '',
          pickupLatitude: 0,
          pickupLongitude: 0,
          destinationAddress: '',
          destinationLatitude: 0,
          destinationLongitude: 0,
          rideType: 'STANDARD',
          passengers: 1,
          isScheduled: false,
          scheduledFor: '',
          notes: '',
          maxFare: undefined,
          preferredDriverId: '',
          autoAccept: false,
          minRating: undefined,
          allowShared: false,
          requireChild: false,
          requireWheelchair: false,
        })
        setFareEstimate(null)
      } else {
        setErrors({ submit: data.error || 'Failed to request ride' })
      }
    } catch (error) {
      console.error('Error requesting ride:', error)
      setErrors({ submit: 'Failed to request ride. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const getCurrentDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30) // Default to 30 minutes from now
    return now.toISOString().slice(0, 16)
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Book Your Ride
        </CardTitle>
        <CardDescription>
          Enter your pickup and destination to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup Location</Label>
              <LocationSearchInput
                placeholder="Enter pickup address"
                value={formData.pickupAddress}
                onLocationSelect={(location) => handleLocationSelect('pickup', location)}
                icon={<MapPin className="h-4 w-4" />}
              />
              {errors.pickup && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.pickup}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <LocationSearchInput
                placeholder="Enter destination address"
                value={formData.destinationAddress}
                onLocationSelect={(location) => handleLocationSelect('destination', location)}
                icon={<Navigation className="h-4 w-4" />}
              />
              {errors.destination && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.destination}
                </p>
              )}
            </div>
          </div>

          {/* Ride Type Selection */}
          <div className="space-y-2">
            <Label>Ride Type</Label>
            <RideTypeSelector
              rideTypes={rideTypes}
              selectedType={formData.rideType}
              onTypeSelect={(type) => setFormData(prev => ({ ...prev, rideType: type }))}
              fareEstimate={fareEstimate}
              estimating={estimating}
            />
          </div>

          {/* Ride Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passengers">Passengers</Label>
              <Select
                value={formData.passengers.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, passengers: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {num} passenger{num !== 1 ? 's' : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRating">Minimum Driver Rating</Label>
              <Select
                value={formData.minRating?.toString() || 'all'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  minRating: value === 'all' ? undefined : parseFloat(value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Rating</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.0">4.0+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="schedule"
                checked={formData.isScheduled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isScheduled: checked }))}
              />
              <Label htmlFor="schedule" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule for later
              </Label>
            </div>

            {formData.isScheduled && (
              <div className="space-y-2">
                <Label htmlFor="scheduledFor">Pickup Time</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                  min={getCurrentDateTime()}
                />
                {errors.scheduledFor && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.scheduledFor}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Special Requirements */}
          <div className="space-y-4">
            <Label>Special Requirements</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireChild"
                  checked={formData.requireChild}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireChild: checked as boolean }))}
                />
                <Label htmlFor="requireChild" className="flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Child seat required
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireWheelchair"
                  checked={formData.requireWheelchair}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireWheelchair: checked as boolean }))}
                />
                <Label htmlFor="requireWheelchair" className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  Wheelchair accessible
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowShared"
                  checked={formData.allowShared}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowShared: checked as boolean }))}
                />
                <Label htmlFor="allowShared">
                  Allow shared rides (lower cost)
                </Label>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions for the driver..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Fare Estimate */}
          {fareEstimate && (
            <FareEstimateCard
              estimate={fareEstimate}
              rideType={formData.rideType}
              loading={estimating}
            />
          )}

          {/* Error Messages */}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              {Object.entries(errors).map(([key, message]) => (
                <p key={key} className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {message}
                </p>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || estimating || !formData.pickupAddress || !formData.destinationAddress}
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Requesting Ride...
              </>
            ) : (
              `Request ${formData.isScheduled ? 'Scheduled ' : ''}Ride`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
