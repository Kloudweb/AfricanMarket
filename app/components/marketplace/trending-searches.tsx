
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Search, 
  ArrowRight,
  Flame
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TrendingSearchesProps {
  limit?: number
  className?: string
}

export function TrendingSearches({ 
  limit = 8, 
  className = '' 
}: TrendingSearchesProps) {
  const router = useRouter()
  const [searches, setSearches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTrendingSearches = async () => {
      setIsLoading(true)
      
      try {
        const response = await fetch(`/api/analytics/search?limit=${limit}`)
        
        if (response.ok) {
          const data = await response.json()
          setSearches(data.popularSearches || [])
        }
      } catch (err) {
        console.error('Error fetching trending searches:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrendingSearches()
  }, [limit])

  const handleSearchClick = (query: string) => {
    router.push(`/marketplace?q=${encodeURIComponent(query)}`)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Trending Searches</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (searches.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <span>Trending Searches</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {searches.slice(0, limit).map((search, index) => (
            <Button
              key={search.query}
              variant="outline"
              size="sm"
              onClick={() => handleSearchClick(search.query)}
              className="justify-start h-auto py-2 px-3 hover:bg-orange-50 hover:border-orange-200"
            >
              <div className="flex items-center space-x-2 w-full">
                <div className="flex items-center space-x-1">
                  {index < 3 && (
                    <Flame className="h-3 w-3 text-orange-500" />
                  )}
                  <Search className="h-3 w-3 text-gray-400" />
                </div>
                <span className="text-sm truncate flex-1 text-left">
                  {search.query}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {search.count}
                </Badge>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
