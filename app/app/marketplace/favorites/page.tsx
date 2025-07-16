
'use client'

import { Suspense } from 'react'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { FavoritesList } from '@/components/marketplace/favorites-list'
import { Skeleton } from '@/components/ui/skeleton'

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            </div>
          }
        >
          <FavoritesList />
        </Suspense>
      </main>
      
      <Footer />
    </div>
  )
}
