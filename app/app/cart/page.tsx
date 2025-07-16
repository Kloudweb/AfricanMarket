
import { Suspense } from 'react'
import { CartPageContent } from '@/components/cart/cart-page-content'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'

export default function CartPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<CartPageSkeleton />}>
          <CartPageContent />
        </Suspense>
      </main>
      
      <Footer />
    </div>
  )
}

function CartPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        
        <div className="space-y-4">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
