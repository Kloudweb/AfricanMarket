
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  DollarSign,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Ban,
  ArrowRight
} from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  paymentStatus: string
  isDelivery: boolean
  deliveryAddress?: string
  estimatedDelivery?: string
  createdAt: string
  customer: {
    id: string
    name: string
    email: string
    phone?: string
  }
  vendor: {
    id: string
    businessName: string
    phone?: string
  }
  driver?: {
    id: string
    user: {
      name: string
      phone?: string
    }
    vehicleType: string
  }
  items: Array<{
    id: string
    quantity: number
    price: number
    subtotal: number
    product: {
      name: string
      price: number
    }
  }>
  tracking: Array<{
    status: string
    message?: string
    timestamp: string
  }>
  payment?: {
    status: string
    amount: number
    paymentProvider: string
  }
}

export default function AdminOrderMonitoring() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showInterventionDialog, setShowInterventionDialog] = useState(false)
  const [interventionData, setInterventionData] = useState({
    action: '',
    reason: '',
    notes: ''
  })
  const [filters, setFilters] = useState({
    status: '',
    vendorId: '',
    driverId: '',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalCount: 0
  })
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetchOrders()
  }, [filters, pagination.page])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/admin/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination.totalPages,
          totalCount: data.pagination.totalCount
        }))
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleIntervention = async () => {
    if (!selectedOrder || !interventionData.action) return

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          ...interventionData
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setShowInterventionDialog(false)
        setInterventionData({ action: '', reason: '', notes: '' })
        fetchOrders()
      } else {
        throw new Error('Failed to perform intervention')
      }
    } catch (error) {
      console.error('Error performing intervention:', error)
      toast.error('Failed to perform intervention')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'default'
      case 'CANCELLED': return 'destructive'
      case 'PREPARING': return 'secondary'
      case 'OUT_FOR_DELIVERY': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED': return CheckCircle
      case 'CANCELLED': return XCircle
      case 'PREPARING': return Clock
      case 'OUT_FOR_DELIVERY': return Truck
      default: return Package
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const getOrderPriority = (order: Order) => {
    // Determine order priority based on various factors
    const timeSinceOrder = Date.now() - new Date(order.createdAt).getTime()
    const isOverdue = timeSinceOrder > 60 * 60 * 1000 // 1 hour
    const isHighValue = order.totalAmount > 100
    const isStuck = order.status === 'PREPARING' && timeSinceOrder > 30 * 60 * 1000 // 30 minutes

    if (isOverdue || isStuck) return 'HIGH'
    if (isHighValue) return 'MEDIUM'
    return 'LOW'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600'
      case 'MEDIUM': return 'text-yellow-600'
      default: return 'text-green-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat: any) => {
            const StatusIcon = getStatusIcon(stat.status)
            return (
              <Card key={stat.status}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 capitalize">
                        {stat.status.replace('_', ' ')}
                      </p>
                      <p className="text-2xl font-bold">{stat._count.status}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(stat._sum.totalAmount || 0)}
                      </p>
                    </div>
                    <StatusIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Order number, customer..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={fetchOrders} variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchOrders} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const priority = getOrderPriority(order)
                    const StatusIcon = getStatusIcon(order.status)
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">
                            {order.items.length} items
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {order.customer.name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{order.customer.name}</div>
                              <div className="text-xs text-gray-500">{order.customer.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{order.vendor.businessName}</div>
                          {order.vendor.phone && (
                            <div className="text-xs text-gray-500">{order.vendor.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.driver ? (
                            <div>
                              <div className="font-medium text-sm">{order.driver.user.name}</div>
                              <div className="text-xs text-gray-500">{order.driver.vehicleType}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getPriorityColor(priority)}`}>
                            {priority}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                          <div className="text-sm text-gray-500">{order.paymentStatus}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowOrderDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowInterventionDialog(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-gray-500">
              Showing {orders.length} of {pagination.totalCount} orders
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {/* Order Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Number</Label>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                      {selectedOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <p className="font-medium">{selectedOrder.paymentStatus}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Delivery</Label>
                  <p className="font-medium">{selectedOrder.isDelivery ? 'Yes' : 'Pickup'}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <Label>Customer</Label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Name:</strong> {selectedOrder.customer.name}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer.email}</p>
                  {selectedOrder.customer.phone && (
                    <p><strong>Phone:</strong> {selectedOrder.customer.phone}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <Label>Order Items</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Tracking */}
              <div>
                <Label>Order Tracking</Label>
                <div className="space-y-2">
                  {selectedOrder.tracking.map((track, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{track.status.replace('_', ' ')}</p>
                        {track.message && (
                          <p className="text-sm text-gray-600">{track.message}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(track.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Intervention Dialog */}
      <Dialog open={showInterventionDialog} onOpenChange={setShowInterventionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Intervention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Action</Label>
              <Select 
                value={interventionData.action} 
                onValueChange={(value) => setInterventionData(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cancel">Cancel Order</SelectItem>
                  <SelectItem value="assign_driver">Assign Driver</SelectItem>
                  <SelectItem value="refund">Process Refund</SelectItem>
                  <SelectItem value="update_status">Update Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason</Label>
              <Input
                placeholder="Reason for intervention"
                value={interventionData.reason}
                onChange={(e) => setInterventionData(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={interventionData.notes}
                onChange={(e) => setInterventionData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowInterventionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleIntervention}
                disabled={!interventionData.action || !interventionData.reason}
              >
                Apply Intervention
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
