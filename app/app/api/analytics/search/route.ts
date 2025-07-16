
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    // Popular search queries
    const popularSearches = await prisma.searchQuery.groupBy({
      by: ['query'],
      where: {
        timestamp: {
          gte: startDate
        },
        query: {
          not: ''
        }
      },
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: limit
    })
    
    // Search volume by day
    const searchVolume = await prisma.searchQuery.groupBy({
      by: ['timestamp'],
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _count: {
        query: true
      },
      orderBy: {
        timestamp: 'asc'
      }
    })
    
    // Process search volume by day
    const volumeByDay = searchVolume.reduce((acc: any, item) => {
      const day = item.timestamp.toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + item._count.query
      return acc
    }, {})
    
    // No results searches
    const noResultsSearches = await prisma.searchQuery.groupBy({
      by: ['query'],
      where: {
        timestamp: {
          gte: startDate
        },
        resultsCount: 0
      },
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: limit
    })
    
    return NextResponse.json({
      popularSearches: popularSearches.map(s => ({
        query: s.query,
        count: s._count.query
      })),
      searchVolume: volumeByDay,
      noResultsSearches: noResultsSearches.map(s => ({
        query: s.query,
        count: s._count.query
      })),
      totalSearches: popularSearches.reduce((sum, s) => sum + s._count.query, 0)
    })
    
  } catch (error) {
    console.error('Search analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search analytics' },
      { status: 500 }
    )
  }
}
