
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CommunicationService } from '@/lib/communication-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updatePreferencesSchema = z.object({
  preferredMethod: z.enum(['CHAT', 'CALL', 'BOTH']).optional(),
  allowVoiceCalls: z.boolean().optional(),
  allowVideoCalls: z.boolean().optional(),
  primaryLanguage: z.string().optional(),
  enableTranslation: z.boolean().optional(),
  autoTranslate: z.boolean().optional(),
  enableChatNotifications: z.boolean().optional(),
  enableCallNotifications: z.boolean().optional(),
  enablePushToTalk: z.boolean().optional(),
  dndEnabled: z.boolean().optional(),
  dndStartTime: z.string().optional(),
  dndEndTime: z.string().optional(),
  enableVoiceAssist: z.boolean().optional(),
  enableTextToSpeech: z.boolean().optional(),
  enableSpeechToText: z.boolean().optional(),
})

// Get communication preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await CommunicationService.getCommunicationPreferences(session.user.id)

    return NextResponse.json({
      success: true,
      data: preferences
    })

  } catch (error) {
    console.error('Error getting communication preferences:', error)
    return NextResponse.json(
      { error: 'Failed to get communication preferences' },
      { status: 500 }
    )
  }
}

// Update communication preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePreferencesSchema.parse(body)

    const preferences = await CommunicationService.updateCommunicationPreferences(
      session.user.id,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: preferences
    })

  } catch (error) {
    console.error('Error updating communication preferences:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update communication preferences' },
      { status: 500 }
    )
  }
}
