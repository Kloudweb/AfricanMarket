
import { NextRequest, NextResponse } from 'next/server'
import { SafetyService } from '@/lib/safety-service'

export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
}

// Get shared trip details
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const tripDetails = await SafetyService.getSharedTripDetails(params.token)

    return NextResponse.json({
      success: true,
      data: tripDetails
    })

  } catch (error) {
    console.error('Error getting shared trip details:', error)
    return NextResponse.json(
      { error: 'Failed to get shared trip details' },
      { status: 500 }
    )
  }
}
