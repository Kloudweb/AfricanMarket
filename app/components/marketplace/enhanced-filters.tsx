
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Filter, 
  X, 
  MapPin, 
  Clock, 
  DollarSign, 
  Star,
  ChefHat,
  Leaf,
  Flame,
  Heart
} from 'lucide-react'

interface FilterState {
  categories: string[]
  cuisines: string[]
  priceRange: [number, number]
  rating: number
  deliveryTime: number
  distance: number
  dietaryOptions: string[]
  features: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface EnhancedFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  className?: string
}

const CATEGORIES = [
  'Main Dishes', 'Appetizers', 'Soups', 'Salads', 'Desserts', 'Beverages', 'Sides'
]

const CUISINES = [
  'Nigerian', 'Ghanaian', 'Ethiopian', 'Kenyan', 'South African', 'Moroccan', 'Senegalese', 'Cameroonian'
]

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Spicy', 'Mild'
]

const FEATURES = [
  'Fast Delivery', 'Free Delivery', 'Pickup Available', 'Open Now', 'Accepts Cards', 'Accepts Cash'
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'distance', label: 'Distance' },
  { value: 'delivery-time', label: 'Delivery Time' },
  { value: 'price', label: 'Price' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'newest', label: 'Newest' }
]

export function EnhancedFilters({ onFiltersChange, className = '' }: EnhancedFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    cuisines: [],
    priceRange: [0, 100],
    rating: 0,
    deliveryTime: 120,
    distance: 50,
    dietaryOptions: [],
    features: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  })

  const [appliedFilters, setAppliedFilters] = useState<string[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load filters from URL params
  useEffect(() => {
    const newFilters = { ...filters }
    
    if (searchParams.get('categories')) {
      newFilters.categories = searchParams.get('categories')?.split(',') || []
    }
    if (searchParams.get('cuisines')) {
      newFilters.cuisines = searchParams.get('cuisines')?.split(',') || []
    }
    if (searchParams.get('minPrice') || searchParams.get('maxPrice')) {
      newFilters.priceRange = [
        parseInt(searchParams.get('minPrice') || '0'),
        parseInt(searchParams.get('maxPrice') || '100')
      ]
    }
    if (searchParams.get('rating')) {
      newFilters.rating = parseInt(searchParams.get('rating') || '0')
    }
    if (searchParams.get('deliveryTime')) {
      newFilters.deliveryTime = parseInt(searchParams.get('deliveryTime') || '120')
    }
    if (searchParams.get('distance')) {
      newFilters.distance = parseInt(searchParams.get('distance') || '50')
    }
    if (searchParams.get('dietaryOptions')) {
      newFilters.dietaryOptions = searchParams.get('dietaryOptions')?.split(',') || []
    }
    if (searchParams.get('features')) {
      newFilters.features = searchParams.get('features')?.split(',') || []
    }
    if (searchParams.get('sortBy')) {
      newFilters.sortBy = searchParams.get('sortBy') || 'relevance'
    }
    if (searchParams.get('sortOrder')) {
      newFilters.sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }
    
    setFilters(newFilters)
  }, [searchParams])

  // Update applied filters count
  useEffect(() => {
    const applied = []
    
    if (filters.categories.length > 0) applied.push('categories')
    if (filters.cuisines.length > 0) applied.push('cuisines')
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) applied.push('price')
    if (filters.rating > 0) applied.push('rating')
    if (filters.deliveryTime < 120) applied.push('delivery-time')
    if (filters.distance < 50) applied.push('distance')
    if (filters.dietaryOptions.length > 0) applied.push('dietary')
    if (filters.features.length > 0) applied.push('features')
    
    setAppliedFilters(applied)
  }, [filters])

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleArrayFilterChange = (key: keyof FilterState, value: string, checked: boolean) => {
    const currentArray = filters[key] as string[]
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value)
    
    handleFilterChange(key, newArray)
  }

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      categories: [],
      cuisines: [],
      priceRange: [0, 100],
      rating: 0,
      deliveryTime: 120,
      distance: 50,
      dietaryOptions: [],
      features: [],
      sortBy: 'relevance',
      sortOrder: 'desc'
    }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const clearFilter = (filterKey: string) => {
    const newFilters = { ...filters }
    
    switch (filterKey) {
      case 'categories':
        newFilters.categories = []
        break
      case 'cuisines':
        newFilters.cuisines = []
        break
      case 'price':
        newFilters.priceRange = [0, 100]
        break
      case 'rating':
        newFilters.rating = 0
        break
      case 'delivery-time':
        newFilters.deliveryTime = 120
        break
      case 'distance':
        newFilters.distance = 50
        break
      case 'dietary':
        newFilters.dietaryOptions = []
        break
      case 'features':
        newFilters.features = []
        break
    }
    
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  return (
    <Card className={`sticky top-4 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {appliedFilters.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {appliedFilters.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {appliedFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? 'Show' : 'Hide'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-6">
          {/* Sort By */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <ChefHat className="w-4 h-4 mr-1" />
              Categories
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={filters.categories.includes(category)}
                    onCheckedChange={(checked) => 
                      handleArrayFilterChange('categories', category, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="text-sm cursor-pointer"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Cuisines */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Cuisines
            </Label>
            <div className="space-y-2">
              {CUISINES.map(cuisine => (
                <div key={cuisine} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cuisine-${cuisine}`}
                    checked={filters.cuisines.includes(cuisine)}
                    onCheckedChange={(checked) => 
                      handleArrayFilterChange('cuisines', cuisine, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`cuisine-${cuisine}`}
                    className="text-sm cursor-pointer"
                  >
                    {cuisine}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Price Range
            </Label>
            <div className="px-2">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => handleFilterChange('priceRange', value)}
                max={100}
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

          <Separator />

          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <Star className="w-4 h-4 mr-1" />
              Minimum Rating
            </Label>
            <Select
              value={filters.rating.toString()}
              onValueChange={(value) => handleFilterChange('rating', parseInt(value))}
            >
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

          <Separator />

          {/* Delivery Time */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Max Delivery Time
            </Label>
            <div className="px-2">
              <Slider
                value={[filters.deliveryTime]}
                onValueChange={(value) => handleFilterChange('deliveryTime', value[0])}
                max={120}
                min={15}
                step={15}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">
                {filters.deliveryTime} minutes
              </div>
            </div>
          </div>

          <Separator />

          {/* Distance */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Max Distance
            </Label>
            <div className="px-2">
              <Slider
                value={[filters.distance]}
                onValueChange={(value) => handleFilterChange('distance', value[0])}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">
                {filters.distance} km
              </div>
            </div>
          </div>

          <Separator />

          {/* Dietary Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <Leaf className="w-4 h-4 mr-1" />
              Dietary Options
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {DIETARY_OPTIONS.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dietary-${option}`}
                    checked={filters.dietaryOptions.includes(option)}
                    onCheckedChange={(checked) => 
                      handleArrayFilterChange('dietaryOptions', option, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`dietary-${option}`}
                    className="text-sm cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Features</Label>
            <div className="space-y-2">
              {FEATURES.map(feature => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feature-${feature}`}
                    checked={filters.features.includes(feature)}
                    onCheckedChange={(checked) => 
                      handleArrayFilterChange('features', feature, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`feature-${feature}`}
                    className="text-sm cursor-pointer"
                  >
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Applied Filters */}
          {appliedFilters.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Applied Filters</Label>
              <div className="flex flex-wrap gap-2">
                {appliedFilters.map((filter) => (
                  <Badge
                    key={filter}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
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
      )}
    </Card>
  )
}
