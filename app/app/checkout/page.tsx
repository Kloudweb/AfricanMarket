
import { Suspense } from 'react'
import { CheckoutPageContent } from '@/components/checkout/checkout-page-content'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<CheckoutPageSkeleton />}>
          <CheckoutPageContent />
        </Suspense>
      </main>
      
      <Footer />
    </div>
  )
}

function CheckoutPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        
        <div className="space-y-4">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
