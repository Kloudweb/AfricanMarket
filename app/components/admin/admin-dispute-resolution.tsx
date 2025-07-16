
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Eye,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Send,
  Upload,
  Download,
  RefreshCw,
  Calendar,
  Tag,
  Users,
  TrendingUp
} from 'lucide-react'

interface Dispute {
  id: string
  disputeNumber: string
  type: string
  category: string
  status: string
  priority: number
  subject: string
  description: string
  evidence: string[]
  customerId?: string
  vendorId?: string
  driverId?: string
  orderId?: string
  rideId?: string
  resolution?: string
  resolutionNotes?: string
  refundAmount?: number
  compensationAmount?: number
  reportedAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  closedAt?: string
  escalatedAt?: string
  assignedTo?: string
  assignedAt?: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    email: string
  }
  vendor?: {
    id: string
    businessName: string
  }
  driver?: {
    id: string
    user: {
      name: string
    }
  }
  order?: {
    id: string
    orderNumber: string
    totalAmount: number
  }
  ride?: {
    id: string
    rideNumber: string
    actualFare: number
  }
  assignee?: {
    id: string
    name: string
  }
  reviews: Array<{
    id: string
    action: string
    comment?: string
    evidence: string[]
    internalNotes?: string
    timeSpent?: number
    createdAt: string
    reviewer: {
      name: string
      email: string
    }
  }>
}

export default function AdminDisputeResolution() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewData, setReviewData] = useState({
    action: '',
    comment: '',
    evidence: [],
    internalNotes: '',
    timeSpent: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    category: '',
    assignedTo: '',
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
    fetchDisputes()
  }, [filters, pagination.page])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/admin/disputes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDisputes(data.disputes)
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination.totalPages,
          totalCount: data.pagination.totalCount
        }))
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching disputes:', error)
      toast.error('Failed to fetch disputes')
    } finally {
      setLoading(false)
    }
  }

  const updateDispute = async (disputeId: string, updates: any) => {
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Dispute updated successfully')
        fetchDisputes()
        if (selectedDispute?.id === disputeId) {
          setSelectedDispute(result.dispute)
        }
      } else {
        throw new Error('Failed to update dispute')
      }
    } catch (error) {
      console.error('Error updating dispute:', error)
      toast.error('Failed to update dispute')
    }
  }

  const addDisputeReview = async () => {
    if (!selectedDispute || !reviewData.action) return

    try {
      const response = await fetch(`/api/admin/disputes/${selectedDispute.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Review added successfully')
        setShowReviewDialog(false)
        setReviewData({
          action: '',
          comment: '',
          evidence: [],
          internalNotes: '',
          timeSpent: 0
        })
        // Refresh dispute details
        fetchDisputes()
      } else {
        throw new Error('Failed to add review')
      }
    } catch (error) {
      console.error('Error adding review:', error)
      toast.error('Failed to add review')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'default'
      case 'CLOSED': return 'secondary'
      case 'ESCALATED': return 'destructive'
      case 'UNDER_REVIEW': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED': return CheckCircle
      case 'CLOSED': return XCircle
      case 'ESCALATED': return AlertTriangle
      case 'UNDER_REVIEW': return Clock
      default: return MessageSquare
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      default: return 'text-green-600'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.byStatus.map((stat: any) => {
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
              <Label htmlFor="search">Search Disputes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Dispute number, subject..."
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
                  <SelectItem value="CREATED">Created</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="REQUIRES_RESPONSE">Requires Response</SelectItem>
                  <SelectItem value="EVIDENCE_REQUIRED">Evidence Required</SelectItem>
                  <SelectItem value="EVIDENCE_SUBMITTED">Evidence Submitted</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="ORDER_ISSUE">Order Issue</SelectItem>
                  <SelectItem value="PAYMENT_DISPUTE">Payment Dispute</SelectItem>
                  <SelectItem value="REFUND_REQUEST">Refund Request</SelectItem>
                  <SelectItem value="VENDOR_COMPLAINT">Vendor Complaint</SelectItem>
                  <SelectItem value="DRIVER_COMPLAINT">Driver Complaint</SelectItem>
                  <SelectItem value="DELIVERY_ISSUE">Delivery Issue</SelectItem>
                  <SelectItem value="QUALITY_ISSUE">Quality Issue</SelectItem>
                  <SelectItem value="BILLING_DISPUTE">Billing Dispute</SelectItem>
                  <SelectItem value="ACCOUNT_ISSUE">Account Issue</SelectItem>
                  <SelectItem value="SAFETY_CONCERN">Safety Concern</SelectItem>
                  <SelectItem value="FRAUD_REPORT">Fraud Report</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
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

            <div className="flex items-end space-x-2">
              <Button onClick={fetchDisputes} className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Button onClick={fetchDisputes} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispute</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : disputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No disputes found
                    </TableCell>
                  </TableRow>
                ) : (
                  disputes.map((dispute) => {
                    const StatusIcon = getStatusIcon(dispute.status)
                    
                    return (
                      <TableRow key={dispute.id}>
                        <TableCell>
                          <div className="font-medium">{dispute.disputeNumber}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {dispute.subject}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {dispute.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dispute.customer ? (
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {dispute.customer.name?.charAt(0) || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{dispute.customer.name}</div>
                                <div className="text-xs text-gray-500">{dispute.customer.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge variant={getStatusBadgeVariant(dispute.status)}>
                              {dispute.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getCategoryColor(dispute.category)}`}>
                            {dispute.category}
                          </div>
                          <div className="text-xs text-gray-500">
                            Priority: {dispute.priority}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dispute.assignee ? (
                            <div className="text-sm">{dispute.assignee.name}</div>
                          ) : (
                            <span className="text-gray-500 text-sm">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(dispute.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(dispute.createdAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDispute(dispute)
                                setShowDisputeDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDispute(dispute)
                                setShowReviewDialog(true)
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
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
              Showing {disputes.length} of {pagination.totalCount} disputes
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

      {/* Dispute Details Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Dispute Number</Label>
                      <p className="font-medium">{selectedDispute.disputeNumber}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={getStatusBadgeVariant(selectedDispute.status)}>
                        {selectedDispute.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <p className="font-medium">{selectedDispute.type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <p className={`font-medium ${getCategoryColor(selectedDispute.category)}`}>
                        {selectedDispute.category}
                      </p>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <p className="font-medium">{selectedDispute.priority}</p>
                    </div>
                    <div>
                      <Label>Created</Label>
                      <p className="font-medium">{new Date(selectedDispute.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <Label>Subject</Label>
                    <p className="font-medium">{selectedDispute.subject}</p>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm">{selectedDispute.description}</p>
                    </div>
                  </div>

                  {selectedDispute.customer && (
                    <div>
                      <Label>Customer Information</Label>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p><strong>Name:</strong> {selectedDispute.customer.name}</p>
                        <p><strong>Email:</strong> {selectedDispute.customer.email}</p>
                      </div>
                    </div>
                  )}

                  {selectedDispute.order && (
                    <div>
                      <Label>Related Order</Label>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p><strong>Order:</strong> {selectedDispute.order.orderNumber}</p>
                        <p><strong>Amount:</strong> {formatCurrency(selectedDispute.order.totalAmount)}</p>
                      </div>
                    </div>
                  )}

                  {selectedDispute.resolution && (
                    <div>
                      <Label>Resolution</Label>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm">{selectedDispute.resolution}</p>
                        {selectedDispute.resolutionNotes && (
                          <p className="text-xs text-gray-600 mt-2">
                            <strong>Notes:</strong> {selectedDispute.resolutionNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                  <div className="space-y-4">
                    {selectedDispute.reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{review.action}</Badge>
                            <span className="text-sm font-medium">{review.reviewer.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm mb-2">{review.comment}</p>
                        )}
                        {review.internalNotes && (
                          <div className="bg-yellow-50 p-2 rounded text-sm">
                            <strong>Internal Notes:</strong> {review.internalNotes}
                          </div>
                        )}
                        {review.timeSpent && (
                          <p className="text-xs text-gray-500 mt-2">
                            Time spent: {review.timeSpent} minutes
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Update Status</Label>
                      <Select 
                        value={selectedDispute.status} 
                        onValueChange={(value) => updateDispute(selectedDispute.id, { status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREATED">Created</SelectItem>
                          <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                          <SelectItem value="REQUIRES_RESPONSE">Requires Response</SelectItem>
                          <SelectItem value="EVIDENCE_REQUIRED">Evidence Required</SelectItem>
                          <SelectItem value="EVIDENCE_SUBMITTED">Evidence Submitted</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                          <SelectItem value="LOST">Lost</SelectItem>
                          <SelectItem value="WON">Won</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Update Priority</Label>
                      <Select 
                        value={selectedDispute.priority.toString()} 
                        onValueChange={(value) => updateDispute(selectedDispute.id, { priority: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Lowest</SelectItem>
                          <SelectItem value="2">2 - Low</SelectItem>
                          <SelectItem value="3">3 - Medium</SelectItem>
                          <SelectItem value="4">4 - High</SelectItem>
                          <SelectItem value="5">5 - Highest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Add Resolution</Label>
                    <Textarea 
                      placeholder="Enter resolution details..."
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.length > 10) { // Only update if there's meaningful content
                          updateDispute(selectedDispute.id, { 
                            resolution: value,
                            status: 'RESOLVED' 
                          })
                        }
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Action</Label>
              <Select 
                value={reviewData.action} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                  <SelectItem value="INVESTIGATED">Investigated</SelectItem>
                  <SelectItem value="CONTACTED_CUSTOMER">Contacted Customer</SelectItem>
                  <SelectItem value="CONTACTED_VENDOR">Contacted Vendor</SelectItem>
                  <SelectItem value="REQUESTED_EVIDENCE">Requested Evidence</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Comment</Label>
              <Textarea
                placeholder="Add your comment..."
                value={reviewData.comment}
                onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
              />
            </div>

            <div>
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Internal notes (not visible to customer)..."
                value={reviewData.internalNotes}
                onChange={(e) => setReviewData(prev => ({ ...prev, internalNotes: e.target.value }))}
              />
            </div>

            <div>
              <Label>Time Spent (minutes)</Label>
              <Input
                type="number"
                placeholder="0"
                value={reviewData.timeSpent}
                onChange={(e) => setReviewData(prev => ({ ...prev, timeSpent: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={addDisputeReview}
                disabled={!reviewData.action}
              >
                <Send className="h-4 w-4 mr-2" />
                Add Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
