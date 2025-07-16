
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'

interface AdminMatchingDashboardProps {
  className?: string
}

export default function AdminMatchingDashboard({ className }: AdminMatchingDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [statistics, setStatistics] = useState<any>(null)
  const [reassignmentQueue, setReassignmentQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadSystemHealth(),
        loadStatistics(),
        loadReassignmentQueue()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/matching/system-health')
      if (response.ok) {
        const data = await response.json()
        setSystemHealth(data)
      }
    } catch (error) {
      console.error('Error loading system health:', error)
    }
  }

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/matching/statistics')
      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const loadReassignmentQueue = async () => {
    try {
      const response = await fetch('/api/matching/reassignment-queue')
      if (response.ok) {
        const data = await response.json()
        setReassignmentQueue(data.queueItems || [])
      }
    } catch (error) {
      console.error('Error loading reassignment queue:', error)
    }
  }

  const processReassignmentQueue = async () => {
    try {
      const response = await fetch('/api/matching/reassignment-queue', {
        method: 'POST'
      })
      
      if (response.ok) {
        loadReassignmentQueue()
      }
    } catch (error) {
      console.error('Error processing reassignment queue:', error)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-green-100 text-green-800'
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'CRITICAL':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matching System Dashboard</h1>
          <p className="text-gray-600">Monitor and manage the driver matching system</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              {getHealthIcon(systemHealth?.healthStatus)}
              <div>
                <p className="text-sm font-medium">Overall Status</p>
                <Badge className={getHealthStatusColor(systemHealth?.healthStatus)}>
                  {systemHealth?.healthStatus}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Health Score</p>
                <p className="text-lg font-bold">{systemHealth?.healthScore || 0}%</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Active Drivers</p>
                <p className="text-lg font-bold">{systemHealth?.drivers?.active || 0}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Acceptance Rate</p>
                <p className="text-lg font-bold">{systemHealth?.performance?.acceptanceRate?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                    <p className="text-2xl font-bold">{statistics?.matchingStats?.totalAssignments || 0}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{statistics?.matchingStats?.successRate?.toFixed(1) || 0}%</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold">{statistics?.matchingStats?.avgResponseTime?.toFixed(1) || 0}s</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statistics?.systemMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="totalAssignments" stroke="#3b82f6" />
                    <Line type="monotone" dataKey="successfulAssignments" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                    <p className="text-2xl font-bold">{systemHealth?.drivers?.total || 0}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Online Drivers</p>
                    <p className="text-2xl font-bold">{systemHealth?.drivers?.online || 0}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Utilization</p>
                    <p className="text-2xl font-bold">{systemHealth?.drivers?.utilization?.toFixed(1) || 0}%</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{systemHealth?.assignments?.total || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Accepted</p>
                  <p className="text-2xl font-bold text-green-600">{systemHealth?.assignments?.accepted || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{systemHealth?.assignments?.rejected || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{systemHealth?.assignments?.pending || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Reassignment Queue</h3>
            <Button onClick={processReassignmentQueue} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Process Queue
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{systemHealth?.reassignmentQueue?.pending || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">{systemHealth?.reassignmentQueue?.processing || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{systemHealth?.reassignmentQueue?.failed || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {systemHealth?.reassignmentQueue?.pending + systemHealth?.reassignmentQueue?.processing > 0 ? 
                      (((systemHealth?.reassignmentQueue?.pending + systemHealth?.reassignmentQueue?.processing) / 
                        (systemHealth?.reassignmentQueue?.pending + systemHealth?.reassignmentQueue?.processing + systemHealth?.reassignmentQueue?.failed)) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Items */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Queue Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reassignmentQueue.length === 0 ? (
                  <p className="text-center text-gray-500">No items in queue</p>
                ) : (
                  reassignmentQueue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {item.assignmentType === 'ORDER' ? 'Order' : 'Ride'} #{item.order?.orderNumber || item.ride?.rideNumber}
                        </p>
                        <p className="text-sm text-gray-600">
                          Attempt {item.attempt} of {item.maxAttempts}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
