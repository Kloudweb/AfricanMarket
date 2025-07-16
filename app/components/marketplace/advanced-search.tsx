
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Clock, 
  TrendingUp, 
  Star,
  MapPin,
  X,
  Loader2
} from 'lucide-react'
import Image from 'next/image'

interface SearchSuggestion {
  id: string
  type: 'vendor' | 'product' | 'search'
  businessName?: string
  businessType?: string
  name?: string
  category?: string
  logo?: string
  image?: string
  rating?: number
  price?: number
  vendor?: {
    id: string
    businessName: string
  }
  query?: string
  count?: number
}

interface AdvancedSearchProps {
  placeholder?: string
  onSearch?: (query: string, filters?: any) => void
  showFilters?: boolean
  className?: string
}

export function AdvancedSearch({ 
  placeholder = "Search for restaurants, dishes, or cuisine...",
  onSearch,
  showFilters = true,
  className = ""
}: AdvancedSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }
  }, [])

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          const allSuggestions: SearchSuggestion[] = [
            ...data.vendors.map((v: any) => ({ ...v, type: 'vendor' as const })),
            ...data.products.map((p: any) => ({ ...p, type: 'product' as const })),
            ...data.searches.map((s: any) => ({ ...s, type: 'search' as const }))
          ]
          setSuggestions(allSuggestions)
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounce)
  }, [query])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    // Save to recent searches
    const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(newRecent)
    localStorage.setItem('recentSearches', JSON.stringify(newRecent))

    setShowSuggestions(false)
    
    if (onSearch) {
      onSearch(searchQuery)
    } else {
      router.push(`/marketplace?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'vendor') {
      router.push(`/marketplace/vendor/${suggestion.id}`)
    } else if (suggestion.type === 'product') {
      router.push(`/marketplace/vendor/${suggestion.vendor?.id}?product=${suggestion.id}`)
    } else if (suggestion.type === 'search') {
      setQuery(suggestion.query || '')
      handleSearch(suggestion.query || '')
    }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const removeRecentSearch = (searchQuery: string) => {
    const newRecent = recentSearches.filter(s => s !== searchQuery)
    setRecentSearches(newRecent)
    localStorage.setItem('recentSearches', JSON.stringify(newRecent))
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query)
            }
          }}
          className="pl-10 pr-12 h-12 text-base"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {!isLoading && query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuery('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {/* Recent Searches */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Recent Searches
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => {
                        setQuery(search)
                        handleSearch(search)
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{search}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRecentSearch(search)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {query.length >= 2 && suggestions.length > 0 && (
              <div className="p-4">
                {/* Vendors */}
                {suggestions.filter(s => s.type === 'vendor').length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Restaurants</h3>
                    {suggestions.filter(s => s.type === 'vendor').map((vendor) => (
                      <div
                        key={vendor.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => handleSuggestionClick(vendor)}
                      >
                        <div className="relative w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={vendor.logo || '/api/placeholder/40/40'}
                            alt={vendor.businessName || ''}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{vendor.businessName}</p>
                          <p className="text-xs text-gray-600">{vendor.businessType}</p>
                        </div>
                        {vendor.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs text-gray-600">{vendor.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Products */}
                {suggestions.filter(s => s.type === 'product').length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Dishes</h3>
                    {suggestions.filter(s => s.type === 'product').map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => handleSuggestionClick(product)}
                      >
                        <div className="relative w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={product.image || '/api/placeholder/40/40'}
                            alt={product.name || ''}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-600">{product.vendor?.businessName}</p>
                        </div>
                        <div className="text-sm font-medium text-orange-600">
                          ${product.price?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Popular Searches */}
                {suggestions.filter(s => s.type === 'search').length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Popular Searches
                    </h3>
                    {suggestions.filter(s => s.type === 'search').map((search, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => handleSuggestionClick(search)}
                      >
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{search.query}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {search.count} searches
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {query.length >= 2 && !isLoading && suggestions.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No suggestions found for "{query}"</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(query)}
                  className="mt-2"
                >
                  Search anyway
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
