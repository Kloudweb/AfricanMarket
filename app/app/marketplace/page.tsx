
import { Suspense } from "react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MarketplaceContent } from "@/components/marketplace/marketplace-content"
import { Skeleton } from "@/components/ui/skeleton"

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <Suspense fallback={<MarketplacePageSkeleton />}>
        <MarketplaceContent />
      </Suspense>
      
      <Footer />
    </div>
  )
}

function MarketplacePageSkeleton() {
  return (
    <>
      {/* Hero Section Skeleton */}
      <section className="bg-gradient-to-r from-orange-50 to-green-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-128 mx-auto mb-8" />
            <div className="max-w-2xl mx-auto">
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
