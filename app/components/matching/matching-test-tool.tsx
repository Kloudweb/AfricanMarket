
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  MapPin, 
  Clock, 
  Star, 
  Navigation, 
  DollarSign,
  TestTube,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { ServiceType } from '@/lib/types'

export default function MatchingTestTool() {
  const [testRequest, setTestRequest] = useState({
    type: 'ORDER',
    serviceType: 'FOOD_DELIVERY',
    pickupLatitude: 47.5615,
    pickupLongitude: -52.7126,
    destinationLatitude: 47.5700,
    destinationLongitude: -52.7200,
    estimatedValue: 25.00,
    priority: 5,
    requirements: {
      vehicleType: '',
      minRating: 3.0,
      maxDistance: 10,
      specialRequirements: []
    }
  })

  const [matches, setMatches] = useState<any[]>([])
  const [assignments, setAssignments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFindMatches = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/matching/find-drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: testRequest.type === 'ORDER' ? 'test-order-' + Date.now() : undefined,
          rideId: testRequest.type === 'RIDE' ? 'test-ride-' + Date.now() : undefined,
          type: testRequest.type,
          pickupLocation: {
            latitude: testRequest.pickupLatitude,
            longitude: testRequest.pickupLongitude
          },
          destinationLocation: testRequest.type === 'RIDE' ? {
            latitude: testRequest.destinationLatitude,
            longitude: testRequest.destinationLongitude
          } : undefined,
          serviceType: testRequest.serviceType,
          estimatedValue: testRequest.estimatedValue,
          priority: testRequest.priority,
          requirements: testRequest.requirements
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMatches(data.matches)
        setSuccess(`Found ${data.matches.length} matching drivers`)
      } else {
        setError(data.error || 'Failed to find matches')
      }
    } catch (error) {
      console.error('Error finding matches:', error)
      setError('Failed to find matches')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignments = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const matchingRequest = {
        id: testRequest.type === 'ORDER' ? 'test-order-' + Date.now() : 'test-ride-' + Date.now(),
        type: testRequest.type,
        pickupLocation: {
          latitude: testRequest.pickupLatitude,
          longitude: testRequest.pickupLongitude
        },
        destinationLocation: testRequest.type === 'RIDE' ? {
          latitude: testRequest.destinationLatitude,
          longitude: testRequest.destinationLongitude
        } : undefined,
        serviceType: testRequest.serviceType,
        estimatedValue: testRequest.estimatedValue,
        priority: testRequest.priority,
        requirements: testRequest.requirements
      }

      const response = await fetch('/api/matching/create-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchingRequest,
          selectedMatches: matches.slice(0, 3) // Take top 3 matches
        })
      })

      const data = await response.json()

      if (response.ok) {
        setAssignments(data.assignmentIds)
        setSuccess(`Created ${data.assignmentIds.length} assignments`)
      } else {
        setError(data.error || 'Failed to create assignments')
      }
    } catch (error) {
      console.error('Error creating assignments:', error)
      setError('Failed to create assignments')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <TestTube className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Matching Algorithm Test Tool</h1>
          <p className="text-gray-600">Test the driver matching system with custom parameters</p>
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

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Test Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Request Type</Label>
              <Select value={testRequest.type} onValueChange={(value) => 
                setTestRequest(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDER">Food Delivery</SelectItem>
                  <SelectItem value="RIDE">Rideshare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select value={testRequest.serviceType} onValueChange={(value) => 
                setTestRequest(prev => ({ ...prev, serviceType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOOD_DELIVERY">Food Delivery</SelectItem>
                  <SelectItem value="RIDESHARE">Rideshare</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupLat">Pickup Latitude</Label>
              <Input
                id="pickupLat"
                type="number"
                step="0.0001"
                value={testRequest.pickupLatitude}
                onChange={(e) => setTestRequest(prev => ({ 
                  ...prev, 
                  pickupLatitude: parseFloat(e.target.value) 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupLng">Pickup Longitude</Label>
              <Input
                id="pickupLng"
                type="number"
                step="0.0001"
                value={testRequest.pickupLongitude}
                onChange={(e) => setTestRequest(prev => ({ 
                  ...prev, 
                  pickupLongitude: parseFloat(e.target.value) 
                }))}
              />
            </div>
          </div>

          {testRequest.type === 'RIDE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destLat">Destination Latitude</Label>
                <Input
                  id="destLat"
                  type="number"
                  step="0.0001"
                  value={testRequest.destinationLatitude}
                  onChange={(e) => setTestRequest(prev => ({ 
                    ...prev, 
                    destinationLatitude: parseFloat(e.target.value) 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destLng">Destination Longitude</Label>
                <Input
                  id="destLng"
                  type="number"
                  step="0.0001"
                  value={testRequest.destinationLongitude}
                  onChange={(e) => setTestRequest(prev => ({ 
                    ...prev, 
                    destinationLongitude: parseFloat(e.target.value) 
                  }))}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
              <Input
                id="estimatedValue"
                type="number"
                step="0.01"
                value={testRequest.estimatedValue}
                onChange={(e) => setTestRequest(prev => ({ 
                  ...prev, 
                  estimatedValue: parseFloat(e.target.value) 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={testRequest.priority}
                onChange={(e) => setTestRequest(prev => ({ 
                  ...prev, 
                  priority: parseInt(e.target.value) 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDistance">Max Distance (km)</Label>
              <Input
                id="maxDistance"
                type="number"
                min="1"
                max="50"
                value={testRequest.requirements.maxDistance}
                onChange={(e) => setTestRequest(prev => ({ 
                  ...prev, 
                  requirements: { 
                    ...prev.requirements, 
                    maxDistance: parseInt(e.target.value) 
                  } 
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleFindMatches} disabled={loading}>
              {loading ? 'Finding...' : 'Find Matches'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matches Results */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Navigation className="w-5 h-5" />
                <span>Found Matches ({matches.length})</span>
              </CardTitle>
              <Button onClick={handleCreateAssignments} disabled={loading}>
                {loading ? 'Creating...' : 'Create Assignments'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matches.map((match, index) => (
                <div key={match.driverId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{match.driver.user.name}</p>
                        <p className="text-sm text-gray-600">{match.driver.vehicleType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getScoreColor(match.totalScore)}`}>
                        {(match.totalScore * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-gray-600">Match Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{match.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{match.eta} min</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-gray-500" />
                      <span>{match.driver.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>{match.driver.totalDeliveries + match.driver.totalRides} jobs</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <div className="text-center">
                      <p className="font-medium">Distance</p>
                      <p className={getScoreColor(match.scores.distance)}>
                        {(match.scores.distance * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Rating</p>
                      <p className={getScoreColor(match.scores.rating)}>
                        {(match.scores.rating * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Completion</p>
                      <p className={getScoreColor(match.scores.completionRate)}>
                        {(match.scores.completionRate * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Response</p>
                      <p className={getScoreColor(match.scores.responseTime)}>
                        {(match.scores.responseTime * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Availability</p>
                      <p className={getScoreColor(match.scores.availability)}>
                        {(match.scores.availability * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Results */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Created Assignments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignments.map((assignmentId, index) => (
                <div key={assignmentId} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <Badge className="bg-green-100 text-green-800">
                    Assignment {index + 1}
                  </Badge>
                  <span className="text-sm text-gray-600">{assignmentId}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
