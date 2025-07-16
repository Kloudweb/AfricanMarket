
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { 
  Share2, 
  Users, 
  Link, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Car, 
  Route,
  Copy,
  Send,
  X,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TripShare {
  id: string
  shareToken: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
  shareLocation: boolean
  shareETA: boolean
  shareDriver: boolean
  shareRoute: boolean
  expiresAt?: string
  createdAt: string
}

interface Contact {
  name: string
  phone: string
  email: string
}

interface TripSharingProps {
  rideId: string
  onClose?: () => void
}

export default function TripSharing({ rideId, onClose }: TripSharingProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([{ name: '', phone: '', email: '' }])
  const [shareSettings, setShareSettings] = useState({
    shareLocation: true,
    shareETA: true,
    shareDriver: true,
    shareRoute: true,
    expiresAt: '',
  })
  const [activeShares, setActiveShares] = useState<TripShare[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchActiveShares()
  }, [rideId])

  const fetchActiveShares = async () => {
    try {
      // This would be implemented in a real app
      // For now, we'll just set empty array
      setActiveShares([])
    } catch (error) {
      console.error('Error fetching active shares:', error)
    }
  }

  const addContact = () => {
    setContacts([...contacts, { name: '', phone: '', email: '' }])
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts]
    newContacts[index] = { ...newContacts[index], [field]: value }
    setContacts(newContacts)
  }

  const handleShareTrip = async () => {
    const validContacts = contacts.filter(c => c.name && (c.phone || c.email))
    
    if (validContacts.length === 0) {
      toast.error('Please add at least one contact with name and phone/email')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/ride-experience/sharing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          contacts: validContacts.map(c => ({
            contactName: c.name,
            contactPhone: c.phone || undefined,
            contactEmail: c.email || undefined,
          })),
          ...shareSettings,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Trip shared successfully!')
        setIsSharing(false)
        fetchActiveShares()
        onClose?.()
      } else {
        toast.error(data.error || 'Failed to share trip')
      }
    } catch (error) {
      console.error('Error sharing trip:', error)
      toast.error('Failed to share trip')
    } finally {
      setIsLoading(false)
    }
  }

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/shared-trip/${shareToken}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Share link copied to clipboard!')
  }

  const generateShareUrl = () => {
    return `${window.location.origin}/shared-trip/preview`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Trip Sharing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Share your trip details with trusted contacts so they can track your journey in real-time.
          </p>
          
          <div className="flex gap-3">
            <Dialog open={isSharing} onOpenChange={setIsSharing}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Share with Contacts
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Share Trip</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Contacts */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium">Contacts</Label>
                      <Button variant="outline" size="sm" onClick={addContact}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {contacts.map((contact, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor={`name-${index}`} className="sr-only">Name</Label>
                              <Input
                                id={`name-${index}`}
                                placeholder="Name"
                                value={contact.name}
                                onChange={(e) => updateContact(index, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`phone-${index}`} className="sr-only">Phone</Label>
                              <Input
                                id={`phone-${index}`}
                                placeholder="Phone"
                                value={contact.phone}
                                onChange={(e) => updateContact(index, 'phone', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`email-${index}`} className="sr-only">Email</Label>
                              <Input
                                id={`email-${index}`}
                                placeholder="Email"
                                type="email"
                                value={contact.email}
                                onChange={(e) => updateContact(index, 'email', e.target.value)}
                              />
                            </div>
                          </div>
                          {contacts.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContact(index)}
                              className="text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Share Settings */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">What to Share</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>Live Location</span>
                        </div>
                        <Switch
                          checked={shareSettings.shareLocation}
                          onCheckedChange={(checked) => 
                            setShareSettings(prev => ({ ...prev, shareLocation: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>ETA & Time Updates</span>
                        </div>
                        <Switch
                          checked={shareSettings.shareETA}
                          onCheckedChange={(checked) => 
                            setShareSettings(prev => ({ ...prev, shareETA: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-500" />
                          <span>Driver Details</span>
                        </div>
                        <Switch
                          checked={shareSettings.shareDriver}
                          onCheckedChange={(checked) => 
                            setShareSettings(prev => ({ ...prev, shareDriver: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-gray-500" />
                          <span>Route Information</span>
                        </div>
                        <Switch
                          checked={shareSettings.shareRoute}
                          onCheckedChange={(checked) => 
                            setShareSettings(prev => ({ ...prev, shareRoute: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Expiration */}
                  <div>
                    <Label htmlFor="expiresAt" className="text-base font-medium mb-3 block">
                      Auto-expire (Optional)
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={shareSettings.expiresAt}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Leave empty to share until trip completion
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={handleShareTrip}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isLoading ? 'Sharing...' : 'Share Trip'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Shares */}
      {activeShares.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{share.contactName || 'Unknown'}</h4>
                      <Badge variant={share.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {share.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      {share.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {share.contactPhone}
                        </span>
                      )}
                      {share.contactEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {share.contactEmail}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Shared {format(new Date(share.createdAt), 'MMM d, HH:mm')}
                      {share.expiresAt && ` • Expires ${format(new Date(share.expiresAt), 'MMM d, HH:mm')}`}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyShareLink(share.shareToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trip Share Preview</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold">Your Trip is Being Shared</h3>
              <p className="text-sm text-gray-600 mt-1">
                Real-time updates will be sent to your contacts
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Sharing:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span>Live location updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>ETA and time estimates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-purple-500" />
                  <span>Driver information</span>
                </div>
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-orange-500" />
                  <span>Route details</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Share this link with your contacts:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={generateShareUrl()}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyShareLink('preview')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
