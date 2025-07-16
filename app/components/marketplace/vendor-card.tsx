
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Star, 
  Clock, 
  MapPin, 
  DollarSign,
  ChefHat
} from "lucide-react"

interface VendorCardProps {
  vendor: {
    id: string
    businessName: string
    businessType: string
    description?: string | null
    logo?: string | null
    coverImage?: string | null
    city: string
    rating: number
    totalReviews: number
    products: {
      id: string
      name: string
      price: number
      category: string
      image?: string | null
    }[]
  }
}

export function VendorCard({ vendor }: VendorCardProps) {
  const averagePrice = vendor.products.reduce((sum, product) => sum + product.price, 0) / vendor.products.length || 0

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="relative">
        {/* Cover Image */}
        <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-green-100 overflow-hidden">
          <Image
            src={vendor.coverImage || "/api/placeholder/400/240"}
            alt={vendor.businessName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
          
          {/* Delivery Badge */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-green-500 text-white">
              <Clock className="w-3 h-3 mr-1" />
              25-35 min
            </Badge>
          </div>
        </div>

        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="relative w-12 h-12 bg-white rounded-lg shadow-lg border-2 border-white overflow-hidden">
            <Image
              src={vendor.logo || "/api/placeholder/48/48"}
              alt={vendor.businessName}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <CardHeader className="pt-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
              {vendor.businessName}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{vendor.businessType}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span>{vendor.rating.toFixed(1)}</span>
                <span>({vendor.totalReviews})</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{vendor.city}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>${averagePrice.toFixed(0)} avg</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {vendor.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {vendor.description}
          </p>
        )}

        {/* Sample Products */}
        {vendor.products.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <ChefHat className="w-4 h-4 mr-1" />
              Popular Items
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {vendor.products.slice(0, 2).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-green-100 rounded overflow-hidden">
                      <Image
                        src={product.image || "/api/placeholder/32/32"}
                        alt={product.name}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium">{product.name}</span>
                  </div>
                  <span className="text-sm text-orange-600 font-medium">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
          <Link href={`/marketplace/vendor/${vendor.id}`}>
            View Menu
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
