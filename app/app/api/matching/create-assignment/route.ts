
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchingService } from '@/lib/matching-service'
import { MatchingRequest, DriverMatch } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Create driver assignments
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { matchingRequest, selectedMatches } = body

    if (!matchingRequest || !selectedMatches || !Array.isArray(selectedMatches)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Create assignments
    const assignmentIds = await matchingService.createAssignment(
      matchingRequest as MatchingRequest,
      selectedMatches as DriverMatch[]
    )

    return NextResponse.json({
      success: true,
      assignmentIds,
      totalAssignments: assignmentIds.length,
      message: 'Assignments created successfully'
    })
  } catch (error) {
    console.error('Error creating assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
