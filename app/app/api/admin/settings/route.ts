
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get all system settings
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageSettings')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const isPublic = searchParams.get('isPublic')

    const where: any = {}
    if (type) where.type = type
    if (category) where.category = category
    if (isPublic !== null) where.isPublic = isPublic === 'true'

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { category: 'asc' },
        { key: 'asc' }
      ],
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

    // Group settings by type and category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.type]) acc[setting.type] = {}
      if (!acc[setting.type][setting.category]) acc[setting.type][setting.category] = []
      acc[setting.type][setting.category].push(setting)
      return acc
    }, {} as any)

    await logAdminAction(
      authResult.user.id,
      'VIEW_SYSTEM_SETTINGS',
      'settings',
      undefined,
      undefined,
      { filters: Object.fromEntries(searchParams.entries()) },
      req
    )

    return NextResponse.json({
      settings,
      grouped: groupedSettings
    })
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new setting
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req, 'ADMIN')
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageSettings')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const settingData = await req.json()

    // Check if setting already exists
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { key: settingData.key }
    })

    if (existingSetting) {
      return NextResponse.json({ error: 'Setting already exists' }, { status: 400 })
    }

    const setting = await prisma.systemSetting.create({
      data: {
        ...settingData,
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

    await logAdminAction(
      authResult.user.id,
      'CREATE_SYSTEM_SETTING',
      'setting',
      setting.id,
      undefined,
      settingData,
      req
    )

    return NextResponse.json({
      message: 'System setting created successfully',
      setting
    })
  } catch (error) {
    console.error('Error creating system setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
