
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  Phone, 
  Share2, 
  Clock, 
  MapPin, 
  UserCheck, 
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Send
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  email?: string
  relationship?: string
  priority: number
  isPrimary: boolean
  isActive: boolean
}

interface SafetyAlert {
  id: string
  alertType: string
  severity: string
  message?: string
  location?: string
  createdAt: string
  isResolved: boolean
}

interface SafetyDashboardProps {
  rideId: string
  onPanicButton: () => void
  onShareTrip: () => void
}

export default function SafetyDashboard({ rideId, onPanicButton, onShareTrip }: SafetyDashboardProps) {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showIncidentReport, setShowIncidentReport] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    priority: 1,
    isPrimary: false,
  })
  const [incidentReport, setIncidentReport] = useState({
    incidentType: 'CUSTOMER_COMPLAINT',
    title: '',
    description: '',
    severity: 'MEDIUM',
  })

  useEffect(() => {
    fetchEmergencyContacts()
    fetchSafetyAlerts()
  }, [rideId])

  const fetchEmergencyContacts = async () => {
    try {
      const response = await fetch('/api/ride-experience/safety/emergency-contacts')
      const data = await response.json()
      
      if (data.success) {
        setEmergencyContacts(data.data)
      }
    } catch (error) {
      console.error('Error fetching emergency contacts:', error)
    }
  }

  const fetchSafetyAlerts = async () => {
    try {
      const response = await fetch(`/api/ride-experience/safety/alerts?rideId=${rideId}`)
      const data = await response.json()
      
      if (data.success) {
        setSafetyAlerts(data.data)
      }
    } catch (error) {
      console.error('Error fetching safety alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Name and phone are required')
      return
    }

    try {
      const response = await fetch('/api/ride-experience/safety/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContact),
      })

      const data = await response.json()
      
      if (data.success) {
        setEmergencyContacts(prev => [...prev, data.data])
        setNewContact({
          name: '',
          phone: '',
          email: '',
          relationship: '',
          priority: 1,
          isPrimary: false,
        })
        setShowAddContact(false)
        toast.success('Emergency contact added successfully')
      } else {
        toast.error(data.error || 'Failed to add emergency contact')
      }
    } catch (error) {
      console.error('Error adding emergency contact:', error)
      toast.error('Failed to add emergency contact')
    }
  }

  const handleEmergencyButton = async () => {
    try {
      const response = await fetch('/api/ride-experience/safety/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          alertType: 'PANIC_BUTTON',
          severity: 'CRITICAL',
          message: 'Emergency alert triggered by user',
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Emergency alert sent successfully')
        fetchSafetyAlerts()
        onPanicButton()
      } else {
        toast.error(data.error || 'Failed to send emergency alert')
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error)
      toast.error('Failed to send emergency alert')
    }
  }

  const handleIncidentReport = async () => {
    if (!incidentReport.title || !incidentReport.description) {
      toast.error('Title and description are required')
      return
    }

    try {
      const response = await fetch('/api/ride-experience/safety/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          ...incidentReport,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Incident reported successfully')
        setIncidentReport({
          incidentType: 'CUSTOMER_COMPLAINT',
          title: '',
          description: '',
          severity: 'MEDIUM',
        })
        setShowIncidentReport(false)
      } else {
        toast.error(data.error || 'Failed to report incident')
      }
    } catch (error) {
      console.error('Error reporting incident:', error)
      toast.error('Failed to report incident')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return 'bg-green-100 text-green-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'PANIC_BUTTON':
        return 'Panic Button'
      case 'ROUTE_DEVIATION':
        return 'Route Deviation'
      case 'SPEED_VIOLATION':
        return 'Speed Violation'
      case 'UNUSUAL_STOP':
        return 'Unusual Stop'
      case 'EMERGENCY_CONTACT':
        return 'Emergency Contact'
      case 'DRIVER_DISTRESS':
        return 'Driver Distress'
      case 'PASSENGER_DISTRESS':
        return 'Passenger Distress'
      case 'AUTOMATIC_DETECTION':
        return 'Automatic Detection'
      default:
        return type
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleEmergencyButton}
              className="bg-red-500 hover:bg-red-600 text-white h-16"
            >
              <AlertTriangle className="h-6 w-6 mr-3" />
              <div>
                <p className="font-semibold">Emergency</p>
                <p className="text-sm opacity-90">Send alert to contacts</p>
              </div>
            </Button>
            
            <Button
              onClick={onShareTrip}
              variant="outline"
              className="h-16"
            >
              <Share2 className="h-6 w-6 mr-3" />
              <div>
                <p className="font-semibold">Share Trip</p>
                <p className="text-sm text-gray-600">Share with trusted contacts</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="alerts">Safety Alerts</TabsTrigger>
          <TabsTrigger value="incident">Report Incident</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contacts
                </CardTitle>
                <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Emergency Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={newContact.name}
                          onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Contact name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="relationship">Relationship</Label>
                        <Input
                          id="relationship"
                          value={newContact.relationship}
                          onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                          placeholder="e.g., Family, Friend, Colleague"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isPrimary"
                            checked={newContact.isPrimary}
                            onChange={(e) => setNewContact(prev => ({ ...prev, isPrimary: e.target.checked }))}
                          />
                          <Label htmlFor="isPrimary">Primary contact</Label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddContact(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddContact}>
                          Add Contact
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {emergencyContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No emergency contacts added yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Add trusted contacts who will be notified in case of emergency
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{contact.name}</h4>
                            {contact.isPrimary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                          {contact.relationship && (
                            <p className="text-xs text-gray-500">{contact.relationship}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Safety Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safetyAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No safety alerts for this trip</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safetyAlerts.map((alert) => (
                    <Alert key={alert.id} className="border-l-4 border-l-orange-500">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {getAlertTypeText(alert.alertType)}
                              </span>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                            </div>
                            {alert.message && (
                              <p className="text-sm text-gray-600 mb-1">{alert.message}</p>
                            )}
                            {alert.location && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {alert.location}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {new Date(alert.createdAt).toLocaleTimeString()}
                            </p>
                            {alert.isResolved && (
                              <Badge variant="outline" className="mt-1">
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="incident" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Report Safety Incident
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="incidentType">Incident Type</Label>
                  <select
                    id="incidentType"
                    value={incidentReport.incidentType}
                    onChange={(e) => setIncidentReport(prev => ({ ...prev, incidentType: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="CUSTOMER_COMPLAINT">Customer Complaint</option>
                    <option value="DRIVER_COMPLAINT">Driver Complaint</option>
                    <option value="UNSAFE_DRIVING">Unsafe Driving</option>
                    <option value="HARASSMENT">Harassment</option>
                    <option value="ACCIDENT">Accident</option>
                    <option value="ROUTE_DEVIATION">Route Deviation</option>
                    <option value="UNAUTHORIZED_STOP">Unauthorized Stop</option>
                    <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown</option>
                    <option value="EMERGENCY_SITUATION">Emergency Situation</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <select
                    id="severity"
                    value={incidentReport.severity}
                    onChange={(e) => setIncidentReport(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={incidentReport.title}
                    onChange={(e) => setIncidentReport(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of the incident"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={incidentReport.description}
                    onChange={(e) => setIncidentReport(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of what happened"
                    rows={4}
                  />
                </div>
                
                <Button onClick={handleIncidentReport} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Incident Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
