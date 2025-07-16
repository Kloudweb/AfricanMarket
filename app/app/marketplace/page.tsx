
import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { VendorCard } from "@/components/marketplace/vendor-card"
import { SearchFilters } from "@/components/marketplace/search-filters"
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Star,
  ChefHat,
  Truck
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const vendors = await prisma.vendor.findMany({
    where: {
      isActive: true,
      verificationStatus: "VERIFIED"
    },
    include: {
      user: true,
      products: {
        where: {
          isAvailable: true
        },
        take: 3
      }
    },
    orderBy: {
      rating: "desc"
    }
  })

  const categories = await prisma.product.findMany({
    select: {
      category: true
    },
    distinct: ["category"]
  })

  const uniqueCategories = categories.map(c => c.category)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
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
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search for restaurants, dishes, or cuisine..."
                    className="pl-10 h-12"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-full sm:w-48 h-12">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
                  Search
                </Button>
              </div>
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
              <h3 className="text-2xl font-bold text-gray-900">{vendors.length}</h3>
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Restaurants ({vendors.length})
            </h2>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              All Open Now
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="delivery-time">Fastest Delivery</SelectItem>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>

        {/* Empty State */}
        {vendors.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No restaurants found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filters
            </p>
            <Button asChild>
              <Link href="/auth/signup?role=vendor">
                Become a Vendor
              </Link>
            </Button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  )
}
