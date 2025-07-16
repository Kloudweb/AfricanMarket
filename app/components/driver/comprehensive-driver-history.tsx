
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  History, 
  Package, 
  Car, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  BarChart3,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface HistoryItem {
  type: 'ORDER' | 'RIDE'
  id: string
  number: string
  date: string
  status: string
  vendor?: {
    businessName: string
    address: string
  }
  pickupAddress?: string
  destinationAddress?: string
  deliveryAddress?: string
  totalAmount: number
  earnings: number
  distance: number
  timeSpent: number
  rating?: number
  customerFeedback?: string
  deliveredAt?: string
  completedAt?: string
  order?: any
  ride?: any
}

interface HistoryData {
  orders: any[]
  rides: any[]
  summary: {
    totalOrders: number
    totalRides: number
    totalEarnings: number
    totalDistance: number
    avgRating: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const STATUS_COLORS = {
  DELIVERED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800'
}

export function ComprehensiveDriverHistory() {
  const { data: session } = useSession()
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    status: '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
    limit: 20
  })
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchHistory()
    }
  }, [session, filters])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: filters.type,
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      })

      const response = await fetch(`/api/drivers/history?${params}`)
      if (!response.ok) throw new Error('Failed to fetch history')
      
      const data = await response.json()
      setHistoryData(data)
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const exportHistory = async (format: 'json' | 'csv') => {
    try {
      setExporting(true)
      const response = await fetch('/api/drivers/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          type: filters.type,
          startDate: filters.startDate,
          endDate: filters.endDate
        })
      })

      if (!response.ok) throw new Error('Failed to export history')
      
      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `driver_history_${Date.now()}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `driver_history_${Date.now()}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
      
      toast.success('History exported successfully')
    } catch (error) {
      console.error('Error exporting history:', error)
      toast.error('Failed to export history')
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
    return (
      <Badge className={colorClass}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const renderOrderItem = (order: any) => (
    <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Order #{order.orderNumber}</p>
              <p className="text-sm text-gray-600">{order.vendor.businessName}</p>
            </div>
          </div>
          {getStatusBadge(order.status)}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span>{formatCurrency(order.earnings?.[0]?.netAmount || 0)}</span>
          </div>
        </div>
        
        {order.review && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < order.review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{order.review.rating}/5</span>
            </div>
            {order.review.comment && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{order.review.comment}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderRideItem = (ride: any) => (
    <Card key={ride.id} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <Car className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Ride #{ride.rideNumber}</p>
              <p className="text-sm text-gray-600">{ride.rideType}</p>
            </div>
          </div>
          {getStatusBadge(ride.status)}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="truncate">{ride.pickupAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="truncate">{ride.destinationAddress}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span>{formatCurrency(ride.actualFare || ride.estimatedFare)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        {ride.review && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < ride.review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{ride.review.rating}/5</span>
            </div>
            {ride.review.comment && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ride.review.comment}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Driver History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Driver History
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportHistory('csv')}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportHistory('json')}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value, page: 1})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="rides">Rides</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value, page: 1})}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value, page: 1})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value, page: 1})}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search orders, rides, or addresses..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                className="w-full"
              />
            </div>
            <Button variant="outline" onClick={fetchHistory}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {historyData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{historyData.summary.totalOrders}</p>
                  <p className="text-sm text-gray-600">Total Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{historyData.summary.totalRides}</p>
                  <p className="text-sm text-gray-600">Total Rides</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(historyData.summary.totalEarnings)}</p>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{historyData.summary.totalDistance.toFixed(1)} km</p>
                  <p className="text-sm text-gray-600">Total Distance</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{historyData.summary.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Avg Rating</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({(historyData?.summary?.totalOrders || 0) + (historyData?.summary?.totalRides || 0)})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({historyData?.summary.totalOrders || 0})</TabsTrigger>
            <TabsTrigger value="rides">Rides ({historyData?.summary.totalRides || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <ScrollArea className="h-[600px]">
              {historyData ? (
                <div className="space-y-4">
                  {/* Combine and sort orders and rides by date */}
                  {[...historyData.orders, ...historyData.rides]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item) => (
                      item.orderNumber ? renderOrderItem(item) : renderRideItem(item)
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-2" />
                  <p>No history found</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <ScrollArea className="h-[600px]">
              {historyData?.orders && historyData.orders.length > 0 ? (
                <div className="space-y-4">
                  {historyData.orders.map(renderOrderItem)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p>No orders found</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rides" className="space-y-4">
            <ScrollArea className="h-[600px]">
              {historyData?.rides && historyData.rides.length > 0 ? (
                <div className="space-y-4">
                  {historyData.rides.map(renderRideItem)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-2" />
                  <p>No rides found</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {historyData && historyData.pagination.pages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({...filters, page: filters.page - 1})}
              disabled={filters.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {historyData.pagination.page} of {historyData.pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({...filters, page: filters.page + 1})}
              disabled={filters.page === historyData.pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
