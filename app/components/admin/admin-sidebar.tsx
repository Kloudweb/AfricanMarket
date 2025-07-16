
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  TrendingUp,
  MessageSquare,
  Settings,
  Megaphone,
  Activity,
  FileText,
  Layers,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface AdminSidebarProps {
  permissions: any
}

export default function AdminSidebar({ permissions }: AdminSidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['main'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const navigationItems = [
    {
      title: 'Main',
      key: 'main',
      items: [
        {
          title: 'Dashboard',
          href: '/admin/dashboard',
          icon: LayoutDashboard,
          permission: true,
          description: 'Overview and key metrics'
        }
      ]
    },
    {
      title: 'User Management',
      key: 'users',
      items: [
        {
          title: 'All Users',
          href: '/admin/users',
          icon: Users,
          permission: permissions.canManageUsers,
          description: 'Manage all platform users'
        },
        {
          title: 'User Verification',
          href: '/admin/users/verification',
          icon: Shield,
          permission: permissions.canManageUsers,
          description: 'KYC and user verification'
        }
      ]
    },
    {
      title: 'Order Management',
      key: 'orders',
      items: [
        {
          title: 'All Orders',
          href: '/admin/orders',
          icon: ShoppingCart,
          permission: permissions.canManageOrders,
          description: 'Monitor and manage orders'
        },
        {
          title: 'Order Analytics',
          href: '/admin/orders/analytics',
          icon: TrendingUp,
          permission: permissions.canManageOrders,
          description: 'Order performance insights'
        }
      ]
    },
    {
      title: 'Financial',
      key: 'financial',
      items: [
        {
          title: 'Revenue Analytics',
          href: '/admin/revenue',
          icon: TrendingUp,
          permission: permissions.canAccessFinancials,
          description: 'Revenue reports and analytics'
        },
        {
          title: 'Commission Management',
          href: '/admin/commission',
          icon: FileText,
          permission: permissions.canAccessFinancials,
          description: 'Manage commission structures'
        }
      ]
    },
    {
      title: 'Support',
      key: 'support',
      items: [
        {
          title: 'Disputes',
          href: '/admin/disputes',
          icon: MessageSquare,
          permission: permissions.canManageDisputes,
          description: 'Handle customer disputes'
        }
      ]
    },
    {
      title: 'Marketing',
      key: 'marketing',
      items: [
        {
          title: 'Campaigns',
          href: '/admin/campaigns',
          icon: Megaphone,
          permission: permissions.canManageCampaigns,
          description: 'Promotional campaigns'
        }
      ]
    },
    {
      title: 'System',
      key: 'system',
      items: [
        {
          title: 'System Health',
          href: '/admin/system-health',
          icon: Activity,
          permission: permissions.canSystemHealth,
          description: 'Monitor system performance'
        },
        {
          title: 'Settings',
          href: '/admin/settings',
          icon: Settings,
          permission: permissions.canManageSettings,
          description: 'Platform configuration'
        },
        {
          title: 'Bulk Operations',
          href: '/admin/bulk-operations',
          icon: Layers,
          permission: permissions.canBulkOperations,
          description: 'Bulk data operations'
        }
      ]
    }
  ]

  const NavItem = ({ item, isExpanded }: { item: any, isExpanded: boolean }) => {
    const isActive = pathname === item.href
    const hasPermission = item.permission === true || item.permission

    if (!hasPermission) return null

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <item.icon className="h-4 w-4" />
        <div className="flex-1">
          <div className="font-medium">{item.title}</div>
          {isExpanded && (
            <div className="text-xs text-gray-500 mt-1">{item.description}</div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 space-y-4">
        {navigationItems.map((section) => {
          const isExpanded = expandedSections.includes(section.key)
          const hasVisibleItems = section.items.some(item => 
            item.permission === true || item.permission
          )

          if (!hasVisibleItems) return null

          return (
            <div key={section.key} className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-left font-medium text-gray-900 hover:bg-gray-50"
                onClick={() => toggleSection(section.key)}
              >
                {section.title}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {isExpanded && (
                <div className="space-y-1 ml-2">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      isExpanded={isExpanded}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
