
'use client'

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AdvancedSearch } from "@/components/marketplace/advanced-search"
import { EnhancedFilters } from "@/components/marketplace/enhanced-filters"
import { VendorGrid } from "@/components/marketplace/vendor-grid"
import { FeaturedVendors } from "@/components/marketplace/featured-vendors"
import { TrendingSearches } from "@/components/marketplace/trending-searches"
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Star,
  ChefHat,
  Truck
} from "lucide-react"

export function MarketplaceContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<any>({})
  const [showFilters, setShowFilters] = useState(false)

  // Load initial search query and filters from URL
  useEffect(() => {
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const cuisine = searchParams.get('cuisine') || ''
    const featured = searchParams.get('featured') === 'true'
    
    setSearchQuery(query)
    setFilters({
      categories: category ? [category] : [],
      cuisines: cuisine ? [cuisine] : [],
      featured
    })
  }, [searchParams])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  const hasActiveFilters = searchQuery || Object.keys(filters).some(key => 
    Array.isArray(filters[key]) ? filters[key].length > 0 : filters[key]
  )

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-50 to-green-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Food Delivery Marketplace
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Discover authentic African cuisine from local restaurants
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-2xl mx-auto">
              <AdvancedSearch 
                placeholder="Search for restaurants, dishes, or cuisine..."
                onSearch={handleSearch}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">50+</h3>
              <p className="text-gray-600">Active Restaurants</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">30min</h3>
              <p className="text-gray-600">Average Delivery</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">4.8</h3>
              <p className="text-gray-600">Average Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Trending Searches - Only show if no active search/filters */}
        {!hasActiveFilters && (
          <div className="mb-8">
            <TrendingSearches limit={8} />
          </div>
        )}

        {/* Featured Vendors - Only show if no active search/filters */}
        {!hasActiveFilters && (
          <div className="mb-8">
            <FeaturedVendors limit={6} />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <EnhancedFilters
                onFiltersChange={handleFiltersChange}
                className="w-full"
              />
            </div>
          </div>

          {/* Vendors Grid */}
          <div className="lg:col-span-3">
            <VendorGrid
              searchQuery={searchQuery}
              filters={filters}
              className="w-full"
            />
          </div>
        </div>
      </main>
    </>
  )
}
