
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get setting by key
export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageSettings')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: params.key },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    await logAdminAction(
      authResult.user.id,
      'VIEW_SYSTEM_SETTING',
      'setting',
      setting.id,
      undefined,
      undefined,
      req
    )

    return NextResponse.json({ setting })
  } catch (error) {
    console.error('Error fetching system setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update setting
export async function PATCH(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageSettings')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const updates = await req.json()
    
    // Get current setting for audit log
    const currentSetting = await prisma.systemSetting.findUnique({
      where: { key: params.key }
    })

    if (!currentSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    if (!currentSetting.isEditable) {
      return NextResponse.json({ error: 'Setting is not editable' }, { status: 400 })
    }

    // Update setting
    const updatedSetting = await prisma.systemSetting.update({
      where: { key: params.key },
      data: {
        ...updates,
        updatedBy: authResult.user.id
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    await logAdminAction(
      authResult.user.id,
      'UPDATE_SYSTEM_SETTING',
      'setting',
      updatedSetting.id,
      currentSetting,
      updates,
      req
    )

    return NextResponse.json({ 
      message: 'System setting updated successfully',
      setting: updatedSetting 
    })
  } catch (error) {
    console.error('Error updating system setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete setting
export async function DELETE(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const authResult = await requireAdminAuth(req, 'ADMIN')
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageSettings')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    // Get setting data for audit log
    const setting = await prisma.systemSetting.findUnique({
      where: { key: params.key }
    })

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    if (!setting.isEditable) {
      return NextResponse.json({ error: 'Setting is not deletable' }, { status: 400 })
    }

    await prisma.systemSetting.delete({
      where: { key: params.key }
    })

    await logAdminAction(
      authResult.user.id,
      'DELETE_SYSTEM_SETTING',
      'setting',
      setting.id,
      setting,
      undefined,
      req
    )

    return NextResponse.json({ message: 'System setting deleted successfully' })
  } catch (error) {
    console.error('Error deleting system setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
