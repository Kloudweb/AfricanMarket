import { Suspense } from "react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { RideshareDashboard } from "@/components/rideshare/rideshare-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { 
  Shield,
  Clock,
  DollarSign
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function RidesharePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-50 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AfricanMarket Rideshare
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Safe, reliable, and affordable rides across Newfoundland with African drivers
            </p>
          </div>
        </div>
      </section>

      {/* Features Banner */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
              <p className="text-gray-600">All drivers are verified and vehicles are inspected</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">Track your ride in real-time from pickup to destination</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Affordable Pricing</h3>
              <p className="text-gray-600">Transparent pricing with no hidden fees</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <main className="bg-gray-50 min-h-screen">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner className="h-8 w-8 mr-3" />
            <span className="text-lg">Loading rideshare dashboard...</span>
          </div>
        }>
          <RideshareDashboard />
        </Suspense>
      </main>
      
      <Footer />
    </div>
  )
}
