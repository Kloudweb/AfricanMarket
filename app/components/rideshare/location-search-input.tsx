
'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  MapPin, 
  Clock, 
  Home, 
  Briefcase, 
  Heart,
  Navigation,
  Search,
  Star
} from 'lucide-react'
import { SavedLocation, LocationSearchResult } from '@/lib/types'

interface LocationSearchInputProps {
  placeholder?: string
  value: string
  onLocationSelect: (location: LocationSearchResult) => void
  icon?: React.ReactNode
  className?: string
}

export function LocationSearchInput({ 
  placeholder = "Enter address...", 
  value, 
  onLocationSelect,
  icon,
  className = ""
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<LocationSearchResult[]>([])
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [recentLocations, setRecentLocations] = useState<SavedLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LocationSearchResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value !== query) {
      setQuery(value)
    }
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        searchLocations(query)
      } else {
        setResults([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    fetchSavedLocations()
    getCurrentLocation()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCurrentLocation({
            address: 'Current Location',
            formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
            placeId: 'current_location',
            types: ['current_location'],
            components: {}
          })
        },
        (error) => {
          console.error('Error getting current location:', error)
        }
      )
    }
  }

  const fetchSavedLocations = async () => {
    try {
      const response = await fetch('/api/rideshare/locations')
      const data = await response.json()
      
      if (data.success) {
        setSavedLocations(data.data.savedLocations)
        setRecentLocations(data.data.recentLocations)
      }
    } catch (error) {
      console.error('Error fetching saved locations:', error)
    }
  }

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/rideshare/locations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: searchQuery }),
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.data.results)
      }
    } catch (error) {
      console.error('Error searching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (location: LocationSearchResult) => {
    setQuery(location.address)
    setShowResults(false)
    onLocationSelect(location)
  }

  const handleInputFocus = () => {
    setShowResults(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    if (newValue.length > 0) {
      setShowResults(true)
    }
  }

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'HOME':
        return <Home className="h-4 w-4" />
      case 'WORK':
        return <Briefcase className="h-4 w-4" />
      case 'FAVORITE':
        return <Heart className="h-4 w-4" />
      case 'RECENT':
        return <Clock className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  const getLocationTypeBadge = (type: string) => {
    switch (type) {
      case 'HOME':
        return <Badge variant="secondary" className="text-xs">Home</Badge>
      case 'WORK':
        return <Badge variant="secondary" className="text-xs">Work</Badge>
      case 'FAVORITE':
        return <Badge variant="secondary" className="text-xs">Favorite</Badge>
      case 'RECENT':
        return <Badge variant="outline" className="text-xs">Recent</Badge>
      default:
        return null
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {icon || <Search className="h-4 w-4" />}
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className={`pl-10 ${className}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner className="h-4 w-4" />
          </div>
        )}
      </div>

      {showResults && (
        <div ref={resultsRef} className="absolute z-50 w-full mt-1">
          <Card className="max-h-80 overflow-y-auto">
            <CardContent className="p-0">
              {/* Current Location */}
              {currentLocation && (
                <div className="p-3 border-b">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Location</p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto"
                    onClick={() => handleLocationSelect(currentLocation)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-blue-500">
                        <Navigation className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Use Current Location</p>
                        <p className="text-sm text-gray-500">GPS Location</p>
                      </div>
                    </div>
                  </Button>
                </div>
              )}

              {/* Saved Locations */}
              {savedLocations.length > 0 && (
                <div className="p-3 border-b">
                  <p className="text-sm font-medium text-gray-700 mb-2">Saved Locations</p>
                  <div className="space-y-1">
                    {savedLocations.map((location) => (
                      <Button
                        key={location.id}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto"
                        onClick={() => handleLocationSelect({
                          address: location.address,
                          formattedAddress: location.address,
                          latitude: location.latitude,
                          longitude: location.longitude,
                          placeId: location.id,
                          types: [location.type.toLowerCase()],
                          components: {}
                        })}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="text-green-500">
                            {getLocationIcon(location.type)}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{location.name}</p>
                              {getLocationTypeBadge(location.type)}
                            </div>
                            <p className="text-sm text-gray-500">{location.address}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Locations */}
              {recentLocations.length > 0 && (
                <div className="p-3 border-b">
                  <p className="text-sm font-medium text-gray-700 mb-2">Recent</p>
                  <div className="space-y-1">
                    {recentLocations.map((location, index) => (
                      <Button
                        key={`recent-${index}`}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto"
                        onClick={() => handleLocationSelect({
                          address: location.address,
                          formattedAddress: location.address,
                          latitude: location.latitude,
                          longitude: location.longitude,
                          placeId: `recent-${index}`,
                          types: ['recent'],
                          components: {}
                        })}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="text-gray-500">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{location.name}</p>
                              <Badge variant="outline" className="text-xs">Recent</Badge>
                            </div>
                            <p className="text-sm text-gray-500">{location.address}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {results.length > 0 && (
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Search Results</p>
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <Button
                        key={`result-${index}`}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto"
                        onClick={() => handleLocationSelect(result)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="text-gray-500">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{result.address}</p>
                            <p className="text-sm text-gray-500">{result.formattedAddress}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {query.length > 2 && results.length === 0 && !loading && (
                <div className="p-6 text-center text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No locations found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
