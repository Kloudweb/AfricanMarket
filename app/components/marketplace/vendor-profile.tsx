
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProductCard } from './product-card'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { 
  Heart, 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Globe, 
  Facebook, 
  Instagram, 
  Twitter,
  ChefHat,
  Users,
  ShoppingBag,
  Award,
  MessageCircle,
  ArrowLeft,
  Share2,
  Truck,
  Check
} from 'lucide-react'

interface VendorProfileProps {
  vendor: any
  highlightProductId?: string
}

export function VendorProfile({ vendor, highlightProductId }: VendorProfileProps) {
  const { data: session } = useSession()
  const [isFavorited, setIsFavorited] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [activeTab, setActiveTab] = useState('menu')

  useEffect(() => {
    // Check if vendor is favorited
    const checkFavoriteStatus = async () => {
      if (!session?.user?.id) return
      
      try {
        const response = await fetch(`/api/vendors/${vendor.id}`)
        if (response.ok) {
          const data = await response.json()
          setIsFavorited(data.isFavorited)
        }
      } catch (error) {
        console.error('Error checking favorite status:', error)
      }
    }

    checkFavoriteStatus()
  }, [session, vendor.id])

  const toggleFavorite = async () => {
    if (!session) {
      window.location.href = '/auth/signin'
      return
    }

    setIsToggling(true)
    
    try {
      const method = isFavorited ? 'DELETE' : 'POST'
      const url = isFavorited 
        ? `/api/favorites/vendors/${vendor.id}`
        : '/api/favorites/vendors'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({ vendorId: vendor.id }) : undefined,
      })

      if (response.ok) {
        setIsFavorited(!isFavorited)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const getDayName = (dayNumber: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNumber] || 'Unknown'
  }

  const isCurrentlyOpen = () => {
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    const todayHours = vendor.hours?.find((h: any) => h.dayOfWeek === currentDay)
    if (!todayHours || !todayHours.isOpen) return false
    
    const openTime = parseInt(todayHours.openTime.replace(':', ''))
    const closeTime = parseInt(todayHours.closeTime.replace(':', ''))
    
    return currentTime >= openTime && currentTime <= closeTime
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative">
        {/* Cover Image */}
        <div className="relative h-80 bg-gradient-to-br from-orange-100 to-green-100 overflow-hidden">
          <Image
            src={vendor.coverImage || '/api/placeholder/1200/320'}
            alt={vendor.businessName}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Back Button */}
          <div className="absolute top-4 left-4">
            <Button variant="ghost" size="sm" asChild className="bg-white/90 hover:bg-white">
              <Link href="/marketplace">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Link>
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFavorite}
              disabled={isToggling}
              className="bg-white/90 hover:bg-white"
            >
              <Heart 
                className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
              />
            </Button>
            <Button variant="ghost" size="sm" className="bg-white/90 hover:bg-white">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="relative -mt-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
              {/* Logo */}
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-lg shadow-lg border-4 border-white overflow-hidden flex-shrink-0">
                <Image
                  src={vendor.logo || '/api/placeholder/128/128'}
                  alt={vendor.businessName}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Details */}
              <div className="flex-1 mt-4 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {vendor.businessName}
                    </h1>
                    <p className="text-lg text-gray-600 mb-4">{vendor.businessType}</p>
                    
                    {/* Rating and Stats */}
                    <div className="flex items-center space-x-6 mb-4">
                      <div className="flex items-center space-x-1">
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
                        <span className="text-gray-600">({vendor._count.reviews} reviews)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ShoppingBag className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600">{vendor._count.orders}+ orders</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600">{vendor._count.favorites} favorites</span>
                      </div>
                    </div>
                    
                    {/* Status and Location */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${isCurrentlyOpen() ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`font-medium ${isCurrentlyOpen() ? 'text-green-600' : 'text-red-600'}`}>
                          {isCurrentlyOpen() ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{vendor.city}, {vendor.province}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{vendor.deliveryTime || '30-45 min'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="mt-4 md:mt-0 flex flex-col space-y-2">
                    <Button className="bg-orange-500 hover:bg-orange-600">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Order Now
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            {/* Description */}
            {vendor.description && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-700">{vendor.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Popular Items */}
            {vendor.products.filter((p: any) => p.isPopular).length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-yellow-500" />
                  Popular Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vendor.products
                    .filter((p: any) => p.isPopular)
                    .map((product: any) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className={highlightProductId === product.id ? 'ring-2 ring-orange-500' : ''}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Menu Categories */}
            {vendor.categories.length > 0 ? (
              <div className="space-y-8">
                {vendor.categories.map((category: any) => {
                  const categoryProducts = vendor.products.filter((p: any) => p.categoryId === category.id)
                  if (categoryProducts.length === 0) return null
                  
                  return (
                    <div key={category.id}>
                      <h3 className="text-xl font-bold mb-4 flex items-center">
                        <ChefHat className="h-5 w-5 mr-2 text-orange-500" />
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categoryProducts.map((product: any) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            className={highlightProductId === product.id ? 'ring-2 ring-orange-500' : ''}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* All Products */
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <ChefHat className="h-5 w-5 mr-2 text-orange-500" />
                  All Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vendor.products.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      className={highlightProductId === product.id ? 'ring-2 ring-orange-500' : ''}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Customer Reviews</span>
                  <Badge variant="secondary">{vendor._count.reviews} reviews</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {vendor.reviews.map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.user.avatar} />
                          <AvatarFallback>
                            {review.user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="font-semibold">{review.user.name}</p>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 mb-2">{review.comment}</p>
                          )}
                          {review.product && (
                            <p className="text-sm text-gray-500">
                              Ordered: {review.product.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {vendor.hours?.map((hour: any) => (
                      <div key={hour.dayOfWeek} className="flex justify-between items-center">
                        <span className="font-medium">{getDayName(hour.dayOfWeek)}</span>
                        <span className={`text-sm ${hour.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                          {hour.isOpen ? `${hour.openTime} - ${hour.closeTime}` : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{vendor.phone}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{vendor.address}, {vendor.city}, {vendor.province}</span>
                  </div>
                  {vendor.businessEmail && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span>{vendor.businessEmail}</span>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  <div className="flex space-x-3 pt-2">
                    {vendor.facebookUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={vendor.facebookUrl} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {vendor.instagramUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={vendor.instagramUrl} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {vendor.twitterUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={vendor.twitterUrl} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle>About {vendor.businessName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Business Type</p>
                    <p className="font-medium">{vendor.businessType}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Delivery Time</p>
                    <p className="font-medium">{vendor.deliveryTime || '30-45 minutes'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Minimum Order</p>
                    <p className="font-medium">${vendor.minimumOrderAmount || '0'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Delivery Fee</p>
                    <p className="font-medium">${vendor.deliveryFee || '2.99'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Cover Image */}
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={vendor.coverImage || '/api/placeholder/200/200'}
                      alt="Restaurant"
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Product Images */}
                  {vendor.products
                    .filter((p: any) => p.image)
                    .slice(0, 11)
                    .map((product: any) => (
                      <div key={product.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  )
}
