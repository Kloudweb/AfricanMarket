
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const now = new Date()
    
    let whereClause: any = {
      isActive: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    }
    
    if (type !== 'all') {
      whereClause.type = type.toUpperCase()
    }
    
    const featuredContent = await prisma.featuredContent.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })
    
    // Update view counts
    if (featuredContent.length > 0) {
      await prisma.featuredContent.updateMany({
        where: {
          id: { in: featuredContent.map(c => c.id) }
        },
        data: {
          views: {
            increment: 1
          }
        }
      })
    }
    
    return NextResponse.json(featuredContent)
    
  } catch (error) {
    console.error('Featured content error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured content' },
      { status: 500 }
    )
  }
}
