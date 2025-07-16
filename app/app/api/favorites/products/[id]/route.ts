
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const productId = params.id
    
    const favorite = await prisma.productFavorite.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId
        }
      }
    })
    
    if (!favorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      )
    }
    
    await prisma.productFavorite.delete({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId
        }
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Remove product favorite error:', error)
    return NextResponse.json(
      { error: 'Failed to remove product from favorites' },
      { status: 500 }
    )
  }
}
