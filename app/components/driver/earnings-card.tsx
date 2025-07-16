
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DollarSign, TrendingUp, Clock, Package } from 'lucide-react'

interface EarningsCardProps {
  todayStats: any
  activeShift: any
}

export function EarningsCard({ todayStats, activeShift }: EarningsCardProps) {
  const calculateHourlyRate = () => {
    if (!activeShift || todayStats.onlineTime === 0) return 0
    const hours = todayStats.onlineTime / 60
    return todayStats.totalEarnings / hours
  }

  const calculateAveragePerDelivery = () => {
    if (todayStats.totalDeliveries === 0) return 0
    return todayStats.totalEarnings / todayStats.totalDeliveries
  }

  const hourlyRate = calculateHourlyRate()
  const avgPerDelivery = calculateAveragePerDelivery()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Today's Earnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Earnings */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              ${todayStats.totalEarnings.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Earnings</div>
          </div>

          <Separator />

          {/* Earnings Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-700">Hourly Rate</span>
              </div>
              <span className="text-sm font-medium">
                ${hourlyRate.toFixed(2)}/hr
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-700">Per Delivery</span>
              </div>
              <span className="text-sm font-medium">
                ${avgPerDelivery.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-gray-700">Online Time</span>
              </div>
              <span className="text-sm font-medium">
                {Math.floor(todayStats.onlineTime / 60)}h {todayStats.onlineTime % 60}m
              </span>
            </div>
          </div>

          {/* Shift Status */}
          {activeShift && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Shift</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Deliveries</p>
                    <p className="font-medium">{activeShift.totalDeliveries || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Earnings</p>
                    <p className="font-medium">${(activeShift.totalEarnings || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Performance Indicator */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Today's Performance</span>
              <Badge 
                variant={todayStats.totalDeliveries >= 5 ? 'default' : 'secondary'}
                className={todayStats.totalDeliveries >= 5 ? 'bg-green-100 text-green-800' : ''}
              >
                {todayStats.totalDeliveries >= 5 ? 'Good' : 'Getting Started'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {todayStats.totalDeliveries} deliveries • {todayStats.totalEarnings > 50 ? 'Above average' : 'Building up'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
