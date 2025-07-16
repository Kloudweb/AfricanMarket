
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ShoppingCart, 
  ArrowRight, 
  Store, 
  Search,
  Heart,
  Star
} from 'lucide-react'

interface EmptyCartProps {
  className?: string
}

export function EmptyCart({ className = '' }: EmptyCartProps) {
  return (
    <Card className={`${className}`}>
      <CardContent className="py-12">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-gray-400" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-gray-900">
              Your cart is empty
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Looks like you haven't added any delicious items to your cart yet. 
              Start browsing to discover amazing food from local vendors!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/marketplace">
                <Store className="mr-2 h-5 w-5" />
                Browse Vendors
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" asChild>
              <Link href="/marketplace/favorites">
                <Heart className="mr-2 h-5 w-5" />
                View Favorites
              </Link>
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Quick Actions
            </h4>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/marketplace?category=african">
                  African Cuisine
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/marketplace?category=caribbean">
                  Caribbean Food
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/marketplace?sort=popular">
                  <Star className="mr-1 h-3 w-3" />
                  Popular Items
                </Link>
              </Button>
            </div>
          </div>

          {/* Search Suggestion */}
          <div className="pt-4">
            <p className="text-sm text-gray-500 mb-2">
              Looking for something specific?
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/marketplace">
                <Search className="mr-2 h-4 w-4" />
                Search Menu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
