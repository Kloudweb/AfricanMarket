
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { ProductCard } from "@/components/marketplace/product-card"
import { 
  Star, 
  MapPin, 
  Clock, 
  Phone,
  ShoppingCart,
  Store,
  Award,
  Shield
} from "lucide-react"
import Image from "next/image"

export const dynamic = "force-dynamic"

interface VendorPageProps {
  params: {
    id: string
  }
}

export default async function VendorPage({ params }: VendorPageProps) {
  const session = await getServerSession(authOptions)
  
  const vendor = await prisma.vendor.findUnique({
    where: {
      id: params.id,
      isActive: true
    },
    include: {
      user: true,
      products: {
        where: {
          isAvailable: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  })

  if (!vendor) {
    notFound()
  }

  const categories = [...new Set(vendor.products.map(p => p.category))]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Vendor Hero */}
      <section className="relative">
        <div className="relative h-64 bg-gradient-to-br from-orange-100 to-green-100 overflow-hidden">
          <Image
            src={vendor.coverImage || "/api/placeholder/1200/400"}
            alt={vendor.businessName}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-xl shadow-lg border-4 border-white overflow-hidden">
                <Image
                  src={vendor.logo || "/api/placeholder/128/128"}
                  alt={vendor.businessName}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            
            <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {vendor.businessName}
                  </h1>
                  <p className="text-lg text-gray-600">{vendor.businessType}</p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                      <span className="text-gray-600">({vendor.totalReviews} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{vendor.city}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">25-35 min delivery</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                  <Badge className="bg-green-100 text-green-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800">
                    <Award className="w-3 h-3 mr-1" />
                    Top Rated
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vendor Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>About {vendor.businessName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  {vendor.description || "Welcome to our restaurant! We serve authentic, delicious food made with fresh ingredients."}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>{vendor.phone}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Store className="w-4 h-4" />
                    <span>{vendor.products.length} items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reviews</span>
                  <span className="font-medium">{vendor.totalReviews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">$3.99</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Minimum Order</span>
                  <span className="font-medium">$15.00</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge key={category} variant="outline" className="text-sm">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendor.products
                  .filter(product => product.category === category)
                  .map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {vendor.products.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No menu items available
            </h3>
            <p className="text-gray-600">
              This restaurant hasn't added any menu items yet.
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  )
}
