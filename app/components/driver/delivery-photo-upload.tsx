
'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Camera, 
  Upload, 
  Check, 
  X, 
  MapPin, 
  Clock,
  FileImage,
  AlertCircle,
  Loader2,
  Eye,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface DeliveryPhoto {
  id: string
  photoUrl: string
  photoType: string
  fileSize: number
  fileName: string
  timestamp: string
  location?: {
    lat: number
    lng: number
    address?: string
  }
  order: {
    id: string
    orderNumber: string
    vendor: {
      businessName: string
    }
  }
}

interface PhotoUploadProps {
  orderId?: string
  onUploadComplete?: (photoId: string) => void
}

const PHOTO_TYPES = [
  { value: 'PICKUP', label: 'Pickup Confirmation', icon: '📦' },
  { value: 'DELIVERY', label: 'Delivery Confirmation', icon: '✅' },
  { value: 'CUSTOMER_SIGNATURE', label: 'Customer Signature', icon: '✍️' },
  { value: 'DAMAGE', label: 'Damage Report', icon: '⚠️' },
  { value: 'LOCATION', label: 'Location Proof', icon: '📍' },
  { value: 'OTHER', label: 'Other', icon: '📷' }
]

export function DeliveryPhotoUpload({ orderId, onUploadComplete }: PhotoUploadProps) {
  const { data: session } = useSession()
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [photoType, setPhotoType] = useState('DELIVERY')
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ lat: latitude, lng: longitude })
        },
        (error) => {
          console.error('Error getting location:', error)
          toast.error('Unable to get current location')
        },
        { enableHighAccuracy: true }
      )
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error(`${file.name} is too large (max 5MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setSelectedFiles(validFiles)
    
    // Create preview URLs
    const previews = validFiles.map(file => URL.createObjectURL(file))
    setPreviewImages(previews)
    
    // Get location automatically
    getCurrentLocation()
  }

  const uploadPhotos = async () => {
    if (!orderId || selectedFiles.length === 0) {
      toast.error('Please select photos and ensure order ID is provided')
      return
    }

    setUploading(true)
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('orderId', orderId)
        formData.append('photoType', photoType)
        formData.append('notes', notes)
        if (location) {
          formData.append('location', JSON.stringify(location))
        }

        const response = await fetch('/api/drivers/photos', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()
        
        if (onUploadComplete) {
          onUploadComplete(data.photo.id)
        }
      }

      toast.success(`${selectedFiles.length} photo(s) uploaded successfully`)
      
      // Reset form
      setSelectedFiles([])
      setPreviewImages([])
      setNotes('')
      setLocation(null)
      
      // Clear file inputs
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      
      // Refresh photos list
      fetchPhotos()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const fetchPhotos = async () => {
    if (!orderId) return

    try {
      setLoadingPhotos(true)
      const response = await fetch(`/api/drivers/photos?orderId=${orderId}`)
      if (!response.ok) throw new Error('Failed to fetch photos')
      
      const data = await response.json()
      setPhotos(data.photos || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setLoadingPhotos(false)
    }
  }

  const removePreview = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = previewImages.filter((_, i) => i !== index)
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewImages[index])
    
    setSelectedFiles(newFiles)
    setPreviewImages(newPreviews)
  }

  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Delivery Photo Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photo Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Photo Type</label>
          <Select value={photoType} onValueChange={setPhotoType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHOTO_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Photo Upload */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={openCamera}
              className="flex-1"
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button 
              variant="outline" 
              onClick={openFileSelector}
              className="flex-1"
              disabled={uploading}
            >
              <FileImage className="h-4 w-4 mr-2" />
              Select Photos
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          {/* Preview Images */}
          {previewImages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Preview ({previewImages.length} photos)</h4>
              <div className="grid grid-cols-2 gap-3">
                {previewImages.map((preview, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePreview(index)}
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about this delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Location Info */}
          {location && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <Button 
            onClick={uploadPhotos}
            disabled={uploading || selectedFiles.length === 0 || !orderId}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ''}Photo(s)
              </>
            )}
          </Button>
        </div>

        {/* Existing Photos */}
        {orderId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Uploaded Photos</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPhotos}
                disabled={loadingPhotos}
              >
                {loadingPhotos ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>

            <ScrollArea className="h-64">
              {photos.length > 0 ? (
                <div className="space-y-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="relative">
                        <Image
                          src={photo.photoUrl}
                          alt={`${photo.photoType} photo`}
                          width={60}
                          height={60}
                          className="w-15 h-15 object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {PHOTO_TYPES.find(t => t.value === photo.photoType)?.label || photo.photoType}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {(photo.fileSize / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{photo.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(photo.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(photo.photoUrl, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileImage className="h-12 w-12 mx-auto mb-2" />
                  <p>No photos uploaded yet</p>
                  <p className="text-sm">Upload photos to document your delivery</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Upload Guidelines */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Upload Guidelines:</strong>
            <ul className="mt-2 text-sm space-y-1">
              <li>• Maximum file size: 5MB per photo</li>
              <li>• Supported formats: JPG, PNG, WebP</li>
              <li>• Take clear photos showing the delivery location</li>
              <li>• Include package and house number if possible</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
