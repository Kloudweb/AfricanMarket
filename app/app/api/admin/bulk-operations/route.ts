
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get bulk operations
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canBulkOperations')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    const where: any = {}
    if (type) where.type = type
    if (status) where.status = status

    const [operations, totalCount] = await Promise.all([
      prisma.bulkOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.bulkOperation.count({ where })
    ])

    await logAdminAction(
      authResult.user.id,
      'VIEW_BULK_OPERATIONS',
      'bulk_operations',
      undefined,
      undefined,
      { filters: Object.fromEntries(searchParams.entries()) },
      req
    )

    return NextResponse.json({
      operations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching bulk operations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create bulk operation
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canBulkOperations')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { type, name, description, targetType, targetCriteria, targetIds, operation, operationData, scheduledAt } = await req.json()

    // Validate target data
    let totalRecords = 0
    if (targetIds && targetIds.length > 0) {
      totalRecords = targetIds.length
    } else if (targetCriteria) {
      // Count records based on criteria
      totalRecords = await countTargetRecords(targetType, targetCriteria)
    }

    const bulkOperation = await prisma.bulkOperation.create({
      data: {
        type,
        name,
        description,
        targetType,
        targetCriteria,
        targetIds,
        operation,
        operationData,
        totalRecords,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        createdBy: authResult.user.id
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // If not scheduled, start immediately
    if (!scheduledAt) {
      // Queue the operation for processing
      await processBulkOperation(bulkOperation.id)
    }

    await logAdminAction(
      authResult.user.id,
      'CREATE_BULK_OPERATION',
      'bulk_operation',
      bulkOperation.id,
      undefined,
      { type, name, targetType, operation },
      req
    )

    return NextResponse.json({
      message: 'Bulk operation created successfully',
      operation: bulkOperation
    })
  } catch (error) {
    console.error('Error creating bulk operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to count target records
async function countTargetRecords(targetType: string, criteria: any): Promise<number> {
  switch (targetType) {
    case 'users':
      return prisma.user.count({ where: criteria })
    case 'orders':
      return prisma.order.count({ where: criteria })
    case 'vendors':
      return prisma.vendor.count({ where: criteria })
    case 'drivers':
      return prisma.driver.count({ where: criteria })
    case 'products':
      return prisma.product.count({ where: criteria })
    default:
      return 0
  }
}

// Helper function to process bulk operation
async function processBulkOperation(operationId: string) {
  try {
    // Update status to running
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'RUNNING',
        startedAt: new Date()
      }
    })

    const operation = await prisma.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) return

    let results: any[] = []
    let errors: any[] = []
    let processed = 0

    // Get target records
    let targetRecords: any[] = []
    if (operation.targetIds && operation.targetIds.length > 0) {
      targetRecords = await getRecordsByIds(operation.targetType, operation.targetIds)
    } else if (operation.targetCriteria) {
      targetRecords = await getRecordsByCriteria(operation.targetType, operation.targetCriteria)
    }

    // Process each record
    for (const record of targetRecords) {
      try {
        const result = await processRecord(operation.targetType, operation.operation, record, operation.operationData)
        results.push(result)
        processed++
      } catch (error) {
        errors.push({ recordId: record.id, error: error instanceof Error ? error.message : String(error) })
      }
      
      // Update progress
      const progress = Math.round((processed / targetRecords.length) * 100)
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          progress,
          processedRecords: processed,
          successCount: results.length,
          errorCount: errors.length
        }
      })
    }

    // Complete operation
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        results: results,
        errors: errors,
        summary: `Processed ${processed} records. ${results.length} successful, ${errors.length} errors.`
      }
    })
  } catch (error) {
    // Mark as failed
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errors: [{ error: error instanceof Error ? error.message : String(error) }]
      }
    })
  }
}

// Helper functions for bulk operations
async function getRecordsByIds(targetType: string, ids: string[]): Promise<any[]> {
  switch (targetType) {
    case 'users':
      return prisma.user.findMany({ where: { id: { in: ids } } })
    case 'orders':
      return prisma.order.findMany({ where: { id: { in: ids } } })
    case 'vendors':
      return prisma.vendor.findMany({ where: { id: { in: ids } } })
    case 'drivers':
      return prisma.driver.findMany({ where: { id: { in: ids } } })
    case 'products':
      return prisma.product.findMany({ where: { id: { in: ids } } })
    default:
      return []
  }
}

async function getRecordsByCriteria(targetType: string, criteria: any): Promise<any[]> {
  switch (targetType) {
    case 'users':
      return prisma.user.findMany({ where: criteria })
    case 'orders':
      return prisma.order.findMany({ where: criteria })
    case 'vendors':
      return prisma.vendor.findMany({ where: criteria })
    case 'drivers':
      return prisma.driver.findMany({ where: criteria })
    case 'products':
      return prisma.product.findMany({ where: criteria })
    default:
      return []
  }
}

async function processRecord(targetType: string, operation: string, record: any, operationData: any): Promise<any> {
  switch (targetType) {
    case 'users':
      return processUserRecord(operation, record, operationData)
    case 'orders':
      return processOrderRecord(operation, record, operationData)
    case 'vendors':
      return processVendorRecord(operation, record, operationData)
    case 'drivers':
      return processDriverRecord(operation, record, operationData)
    case 'products':
      return processProductRecord(operation, record, operationData)
    default:
      throw new Error(`Unsupported target type: ${targetType}`)
  }
}

async function processUserRecord(operation: string, record: any, operationData: any): Promise<any> {
  switch (operation) {
    case 'activate':
      return prisma.user.update({
        where: { id: record.id },
        data: { isActive: true }
      })
    case 'deactivate':
      return prisma.user.update({
        where: { id: record.id },
        data: { isActive: false }
      })
    case 'verify':
      return prisma.user.update({
        where: { id: record.id },
        data: { isVerified: true }
      })
    case 'update_role':
      return prisma.user.update({
        where: { id: record.id },
        data: { role: operationData.role }
      })
    default:
      throw new Error(`Unsupported operation: ${operation}`)
  }
}

async function processOrderRecord(operation: string, record: any, operationData: any): Promise<any> {
  switch (operation) {
    case 'cancel':
      return prisma.order.update({
        where: { id: record.id },
        data: { status: 'CANCELLED' }
      })
    case 'update_status':
      return prisma.order.update({
        where: { id: record.id },
        data: { status: operationData.status }
      })
    default:
      throw new Error(`Unsupported operation: ${operation}`)
  }
}

async function processVendorRecord(operation: string, record: any, operationData: any): Promise<any> {
  switch (operation) {
    case 'activate':
      return prisma.vendor.update({
        where: { id: record.id },
        data: { isActive: true }
      })
    case 'deactivate':
      return prisma.vendor.update({
        where: { id: record.id },
        data: { isActive: false }
      })
    case 'verify':
      return prisma.vendor.update({
        where: { id: record.id },
        data: { verificationStatus: 'VERIFIED' }
      })
    default:
      throw new Error(`Unsupported operation: ${operation}`)
  }
}

async function processDriverRecord(operation: string, record: any, operationData: any): Promise<any> {
  switch (operation) {
    case 'activate':
      return prisma.driver.update({
        where: { id: record.id },
        data: { isAvailable: true }
      })
    case 'deactivate':
      return prisma.driver.update({
        where: { id: record.id },
        data: { isAvailable: false }
      })
    case 'verify':
      return prisma.driver.update({
        where: { id: record.id },
        data: { verificationStatus: 'VERIFIED' }
      })
    default:
      throw new Error(`Unsupported operation: ${operation}`)
  }
}

async function processProductRecord(operation: string, record: any, operationData: any): Promise<any> {
  switch (operation) {
    case 'activate':
      return prisma.product.update({
        where: { id: record.id },
        data: { isAvailable: true }
      })
    case 'deactivate':
      return prisma.product.update({
        where: { id: record.id },
        data: { isAvailable: false }
      })
    case 'update_price':
      return prisma.product.update({
        where: { id: record.id },
        data: { price: operationData.price }
      })
    default:
      throw new Error(`Unsupported operation: ${operation}`)
  }
}
