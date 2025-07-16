
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatAddress } from '@/lib/cart-utils'
import { Plus, MapPin, Home, Building, MoreHorizontal } from 'lucide-react'

interface Address {
  id: string
  label: string
  firstName?: string
  lastName?: string
  company?: string
  address: string
  apartment?: string
  city: string
  province: string
  postalCode: string
  phone?: string
  isDefault: boolean
  deliveryInstructions?: string
}

interface AddressSelectorProps {
  selectedAddress: string
  onAddressSelect: (addressId: string) => void
}

export function AddressSelector({ selectedAddress, onAddressSelect }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses')
      if (response.ok) {
        const data = await response.json()
        setAddresses(data)
        
        // Auto-select default address if none selected
        if (!selectedAddress && data.length > 0) {
          const defaultAddress = data.find((addr: Address) => addr.isDefault) || data[0]
          onAddressSelect(defaultAddress.id)
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAddressIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return <Home className="h-4 w-4" />
      case 'work':
        return <Building className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
        <p className="text-gray-600 mb-4">Add a delivery address to continue</p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Address
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedAddress} onValueChange={onAddressSelect}>
        <div className="space-y-3">
          {addresses.map((address) => (
            <div key={address.id} className="flex items-start space-x-3">
              <RadioGroupItem value={address.id} id={address.id} className="mt-4" />
              <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        {getAddressIcon(address.label)}
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      {(address.firstName || address.lastName) && (
                        <p>{[address.firstName, address.lastName].filter(Boolean).join(' ')}</p>
                      )}
                      {address.company && <p>{address.company}</p>}
                      <p>{formatAddress(address)}</p>
                      {address.phone && <p>{address.phone}</p>}
                      {address.deliveryInstructions && (
                        <p className="text-orange-600 text-xs mt-2">
                          Note: {address.deliveryInstructions}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
      
      <Button variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add New Address
      </Button>
    </div>
  )
}
