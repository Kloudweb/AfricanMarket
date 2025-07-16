
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
    
    const vendorId = params.id
    
    const favorite = await prisma.vendorFavorite.findUnique({
      where: {
        userId_vendorId: {
          userId: session.user.id,
          vendorId
        }
      }
    })
    
    if (!favorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      )
    }
    
    await prisma.vendorFavorite.delete({
      where: {
        userId_vendorId: {
          userId: session.user.id,
          vendorId
        }
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Remove vendor favorite error:', error)
    return NextResponse.json(
      { error: 'Failed to remove vendor from favorites' },
      { status: 500 }
    )
  }
}
