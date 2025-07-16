
import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  ShoppingCart, 
  Car, 
  Store, 
  Users, 
  Shield,
  Star,
  ChefHat,
  Truck
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 to-green-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                  🚀 Now serving Newfoundland
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                  Your Community 
                  <span className="text-orange-500 block">Marketplace</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Connecting the African community in Newfoundland with authentic food delivery and reliable rideshare services.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/marketplace">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Order Food
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/rideshare">
                    <Car className="w-5 h-5 mr-2" />
                    Book Ride
                  </Link>
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Fast delivery</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Province-wide</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Secure payments</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-video bg-gradient-to-br from-orange-200 to-green-200 rounded-2xl overflow-hidden">
                <Image
                  src="https://i.ytimg.com/vi/qNzW2qv76_A/maxresdefault.jpg"
                  alt="African family enjoying food delivery"
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-4 border">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Star className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">4.9 Rating</p>
                    <p className="text-xs text-gray-500">1,200+ reviews</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-4 border">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Truck className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">30min delivery</p>
                    <p className="text-xs text-gray-500">Average time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to stay connected with your community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Food Delivery */}
            <Card className="group hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <ChefHat className="w-8 h-8 text-orange-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <CardTitle className="text-2xl">Food Delivery</CardTitle>
                <CardDescription>
                  Authentic African cuisine delivered to your door
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg overflow-hidden">
                  <Image
                    src="https://i.ytimg.com/vi/1zyDUkdVZ0E/maxresdefault.jpg"
                    alt="African food delivery"
                    fill
                    className="object-cover"
                  />
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Browse local African restaurants</li>
                  <li>• Real-time order tracking</li>
                  <li>• Multiple payment options</li>
                  <li>• Support local businesses</li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/marketplace">
                    Explore Restaurants
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Rideshare */}
            <Card className="group hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Car className="w-8 h-8 text-green-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                </div>
                <CardTitle className="text-2xl">Rideshare</CardTitle>
                <CardDescription>
                  Safe and affordable rides across Newfoundland
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video bg-gradient-to-br from-green-100 to-blue-100 rounded-lg overflow-hidden">
                  <Image
                    src="https://s1.cdn.autoevolution.com/images/news/gallery/watch-out-google-maps-garmin-launches-new-affordable-navigation-devices_6.jpg"
                    alt="Rideshare service"
                    fill
                    className="object-cover"
                  />
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Trusted community drivers</li>
                  <li>• GPS tracking for safety</li>
                  <li>• Upfront pricing</li>
                  <li>• 24/7 availability</li>
                </ul>
                <Button className="w-full bg-green-500 hover:bg-green-600" asChild>
                  <Link href="/rideshare">
                    Book a Ride
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Join Our Community
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Be part of the growing African marketplace ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* For Customers */}
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <CardTitle>For Customers</CardTitle>
                <CardDescription>
                  Discover and order from local African restaurants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auth/signup">
                    Get Started
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* For Vendors */}
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-orange-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Store className="w-12 h-12 text-orange-600" />
                </div>
                <CardTitle>For Vendors</CardTitle>
                <CardDescription>
                  List your restaurant and reach more customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auth/signup?role=vendor">
                    Become a Vendor
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* For Drivers */}
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Car className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle>For Drivers</CardTitle>
                <CardDescription>
                  Earn money delivering food and giving rides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auth/signup?role=driver">
                    Become a Driver
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-500">500+</div>
              <div className="text-sm text-gray-600">Happy Customers</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-500">50+</div>
              <div className="text-sm text-gray-600">Partner Restaurants</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-500">100+</div>
              <div className="text-sm text-gray-600">Active Drivers</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-purple-500">24/7</div>
              <div className="text-sm text-gray-600">Service Available</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
