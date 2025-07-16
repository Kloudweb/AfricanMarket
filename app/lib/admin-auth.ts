
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminPermissionLevel } from '@/lib/types'

// Admin authentication middleware
export async function requireAdminAuth(req: NextRequest, minLevel: AdminPermissionLevel = 'ADMIN') {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: 'Admin access required', status: 403 }
  }

  // Check admin permissions
  const adminPermissions = await prisma.adminPermission.findUnique({
    where: { userId: session.user.id },
    include: { user: true }
  })

  if (!adminPermissions || !adminPermissions.isActive) {
    return { error: 'Admin permissions not found or inactive', status: 403 }
  }

  // Check permission level
  const levelHierarchy = {
    'VIEWER': 1,
    'SUPPORT': 2,
    'MODERATOR': 3,
    'ADMIN': 4,
    'SUPER_ADMIN': 5
  }

  if (levelHierarchy[adminPermissions.level] < levelHierarchy[minLevel]) {
    return { error: `${minLevel} level required`, status: 403 }
  }

  // Check IP whitelist if configured
  if (adminPermissions.ipWhitelist.length > 0) {
    const clientIP = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    if (!clientIP || !adminPermissions.ipWhitelist.includes(clientIP)) {
      return { error: 'IP not whitelisted', status: 403 }
    }
  }

  return { 
    success: true, 
    user: session.user, 
    permissions: adminPermissions 
  }
}

// Log admin action
export async function logAdminAction(
  userId: string,
  action: string,
  resource?: string,
  resourceId?: string,
  oldValues?: any,
  newValues?: any,
  req?: NextRequest
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
        ipAddress: req?.ip || req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip'),
        userAgent: req?.headers.get('user-agent'),
        method: req?.method,
        endpoint: req?.url,
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('Error logging admin action:', error)
  }
}

// Check specific permission
export function hasPermission(permissions: any, permission: string): boolean {
  return permissions.permissions.includes(permission) || permissions.level === 'SUPER_ADMIN'
}
