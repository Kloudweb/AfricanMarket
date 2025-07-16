
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RideChatService } from '@/lib/ride-chat-service'

export const dynamic = 'force-dynamic'

// Get quick reply templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = RideChatService.getQuickReplyTemplates()

    return NextResponse.json({
      success: true,
      data: templates
    })

  } catch (error) {
    console.error('Error getting quick reply templates:', error)
    return NextResponse.json(
      { error: 'Failed to get quick reply templates' },
      { status: 500 }
    )
  }
}
