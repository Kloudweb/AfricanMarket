
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MatchingAlgorithmType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Get matching algorithm configuration
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const configId = searchParams.get('configId')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    if (configId) {
      const config = await prisma.matchingAlgorithmConfig.findUnique({
        where: { id: configId }
      })

      if (!config) {
        return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        config
      })
    }

    // Get all configurations
    const configs = await prisma.matchingAlgorithmConfig.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json({
      success: true,
      configs
    })
  } catch (error) {
    console.error('Error getting matching configuration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or update matching algorithm configuration
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      algorithmType,
      isActive,
      version,
      distanceWeight,
      ratingWeight,
      completionRateWeight,
      responseTimeWeight,
      availabilityWeight,
      maxDistance,
      maxAssignments,
      assignmentTimeout,
      reassignmentDelay,
      minRating,
      minCompletionRate,
      maxResponseTime,
      enableSurgeMatching,
      enableBatchMatching,
      enablePredictiveMatching,
      testingEnabled,
      testingPercentage,
      configuration
    } = body

    // Validate required fields
    if (!name || !algorithmType) {
      return NextResponse.json({ error: 'Name and algorithm type are required' }, { status: 400 })
    }

    // Validate algorithm type
    const validTypes: MatchingAlgorithmType[] = ['PROXIMITY_BASED', 'PERFORMANCE_BASED', 'HYBRID', 'MACHINE_LEARNING']
    if (!validTypes.includes(algorithmType)) {
      return NextResponse.json({ error: 'Invalid algorithm type' }, { status: 400 })
    }

    // If setting this config as active, deactivate others
    if (isActive) {
      await prisma.matchingAlgorithmConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
    }

    // Create new configuration
    const config = await prisma.matchingAlgorithmConfig.create({
      data: {
        name,
        algorithmType,
        isActive: isActive || false,
        version: version || '1.0',
        distanceWeight: distanceWeight || 0.4,
        ratingWeight: ratingWeight || 0.25,
        completionRateWeight: completionRateWeight || 0.2,
        responseTimeWeight: responseTimeWeight || 0.1,
        availabilityWeight: availabilityWeight || 0.05,
        maxDistance: maxDistance || 15,
        maxAssignments: maxAssignments || 3,
        assignmentTimeout: assignmentTimeout || 60,
        reassignmentDelay: reassignmentDelay || 30,
        minRating: minRating || 3.0,
        minCompletionRate: minCompletionRate || 0.8,
        maxResponseTime: maxResponseTime || 120,
        enableSurgeMatching: enableSurgeMatching || false,
        enableBatchMatching: enableBatchMatching || false,
        enablePredictiveMatching: enablePredictiveMatching || false,
        testingEnabled: testingEnabled || false,
        testingPercentage: testingPercentage || 0.1,
        configuration
      }
    })

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration created successfully'
    })
  } catch (error) {
    console.error('Error creating matching configuration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update matching algorithm configuration
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { configId, isActive, ...updateData } = body

    if (!configId) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    // If setting this config as active, deactivate others
    if (isActive) {
      await prisma.matchingAlgorithmConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
    }

    // Update configuration
    const config = await prisma.matchingAlgorithmConfig.update({
      where: { id: configId },
      data: {
        ...updateData,
        isActive: isActive || false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration updated successfully'
    })
  } catch (error) {
    console.error('Error updating matching configuration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete matching algorithm configuration
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const configId = searchParams.get('configId')

    if (!configId) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    // Check if configuration is active
    const config = await prisma.matchingAlgorithmConfig.findUnique({
      where: { id: configId }
    })

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    if (config.isActive) {
      return NextResponse.json({ error: 'Cannot delete active configuration' }, { status: 400 })
    }

    // Delete configuration
    await prisma.matchingAlgorithmConfig.delete({
      where: { id: configId }
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting matching configuration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
