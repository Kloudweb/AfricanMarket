
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  User, 
  Car,
  Navigation as NavigationIcon,
  Shield,
  Star
} from "lucide-react"

export default function RidesharePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-50 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Rideshare Service
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Safe, reliable, and affordable rides across Newfoundland
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Booking Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Book Your Ride</span>
              </CardTitle>
              <CardDescription>
                Enter your pickup and destination to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pickup">Pickup Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="pickup"
                    placeholder="Enter pickup address"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <div className="relative">
                  <NavigationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="destination"
                    placeholder="Enter destination address"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup-time">Pickup Time</Label>
                  <Input
                    id="pickup-time"
                    type="datetime-local"
                    defaultValue={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passengers">Passengers</Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    max="4"
                    defaultValue="1"
                  />
                </div>
              </div>
              
              <Button className="w-full bg-green-500 hover:bg-green-600">
                Find Rides
              </Button>
            </CardContent>
          </Card>

          {/* Ride Types */}
          <Card>
            <CardHeader>
              <CardTitle>Available Ride Types</CardTitle>
              <CardDescription>
                Choose the option that best fits your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Car className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Standard</h3>
                      <p className="text-sm text-gray-600">Comfortable ride for 1-4 passengers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$2.50/km</p>
                    <p className="text-sm text-gray-600">+ $3.99 base</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Car className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Premium</h3>
                      <p className="text-sm text-gray-600">Higher-end vehicles with extra comfort</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$3.50/km</p>
                    <p className="text-sm text-gray-600">+ $4.99 base</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-2 rounded-full">
                      <Car className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Shared</h3>
                      <p className="text-sm text-gray-600">Share with others going the same way</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$1.50/km</p>
                    <p className="text-sm text-gray-600">+ $2.99 base</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
              <p className="text-gray-600">All drivers are verified and vehicles are inspected</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">Track your ride in real-time from pickup to destination</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Affordable Pricing</h3>
              <p className="text-gray-600">Transparent pricing with no hidden fees</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Drivers */}
        <Card>
          <CardHeader>
            <CardTitle>Available Drivers</CardTitle>
            <CardDescription>
              Professional drivers ready to serve you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Samuel Okafor</h4>
                    <p className="text-sm text-gray-600">Toyota Camry • ABC 123</p>
                    <div className="flex items-center space-x-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span>4.7 (89 reviews)</span>
                      <span>•</span>
                      <span>245 trips</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-700">Available</Badge>
                  <p className="text-sm text-gray-600 mt-1">2 min away</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Grace Mensah</h4>
                    <p className="text-sm text-gray-600">Honda CR-V • XYZ 789</p>
                    <div className="flex items-center space-x-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span>4.9 (112 reviews)</span>
                      <span>•</span>
                      <span>189 trips</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-700">Available</Badge>
                  <p className="text-sm text-gray-600 mt-1">5 min away</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  )
}
