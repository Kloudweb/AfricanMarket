
'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  X,
  MapPin,
  Clock,
  DollarSign,
  Star
} from "lucide-react"

interface SearchFiltersProps {
  categories: string[]
  onFiltersChange: (filters: any) => void
}

export function SearchFilters({ categories, onFiltersChange }: SearchFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    priceRange: [0, 50],
    minRating: 0,
    deliveryTime: "",
    isOpen: false,
    acceptsPickup: false,
    acceptsDelivery: true
  })

  const [appliedFilters, setAppliedFilters] = useState<string[]>([])

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilter = (filterKey: string) => {
    const newFilters = { ...filters, [filterKey]: filterKey === 'priceRange' ? [0, 50] : '' }
    setFilters(newFilters)
    setAppliedFilters(prev => prev.filter(f => f !== filterKey))
  }

  const clearAllFilters = () => {
    const resetFilters = {
      search: "",
      category: "",
      priceRange: [0, 50],
      minRating: 0,
      deliveryTime: "",
      isOpen: false,
      acceptsPickup: false,
      acceptsDelivery: true
    }
    setFilters(resetFilters)
    setAppliedFilters([])
    onFiltersChange(resetFilters)
  }

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </div>
          {appliedFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search"
              placeholder="Search restaurants or dishes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label>Price Range</Label>
          <div className="px-2">
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => handleFilterChange('priceRange', value)}
              max={50}
              min={0}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>${filters.priceRange[0]}</span>
              <span>${filters.priceRange[1]}+</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <Label>Minimum Rating</Label>
          <Select value={filters.minRating.toString()} onValueChange={(value) => handleFilterChange('minRating', parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Any Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any Rating</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Delivery Time */}
        <div className="space-y-2">
          <Label>Delivery Time</Label>
          <Select value={filters.deliveryTime} onValueChange={(value) => handleFilterChange('deliveryTime', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Time</SelectItem>
              <SelectItem value="15">Under 15 min</SelectItem>
              <SelectItem value="30">Under 30 min</SelectItem>
              <SelectItem value="45">Under 45 min</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label>Options</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="open-now"
                checked={filters.isOpen}
                onCheckedChange={(checked) => handleFilterChange('isOpen', checked)}
              />
              <Label htmlFor="open-now" className="text-sm">Open Now</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accepts-pickup"
                checked={filters.acceptsPickup}
                onCheckedChange={(checked) => handleFilterChange('acceptsPickup', checked)}
              />
              <Label htmlFor="accepts-pickup" className="text-sm">Pickup Available</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accepts-delivery"
                checked={filters.acceptsDelivery}
                onCheckedChange={(checked) => handleFilterChange('acceptsDelivery', checked)}
              />
              <Label htmlFor="accepts-delivery" className="text-sm">Delivery Available</Label>
            </div>
          </div>
        </div>

        {/* Applied Filters */}
        {appliedFilters.length > 0 && (
          <div className="space-y-2">
            <Label>Applied Filters</Label>
            <div className="flex flex-wrap gap-2">
              {appliedFilters.map((filter) => (
                <Badge key={filter} variant="secondary" className="flex items-center space-x-1">
                  <span className="text-xs">{filter}</span>
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => clearFilter(filter)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
