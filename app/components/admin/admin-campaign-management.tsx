
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
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Megaphone,
  Gift,
  Tag,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description?: string
  type: string
  status: string
  discountType?: string
  discountValue?: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number
  targetAudience: string[]
  targetUserRoles: string[]
  targetLocations: string[]
  targetVendors: string[]
  targetProducts: string[]
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  actualEnd?: string
  totalUsageLimit?: number
  perUserUsageLimit?: number
  currentUsageCount: number
  budget?: number
  currentSpend: number
  costPerUsage?: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  promoCode?: string
  createdAt: string
  updatedAt: string
  creator: {
    name: string
    email: string
  }
  updater?: {
    name: string
    email: string
  }
}

export default function AdminCampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
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
  const [performance, setPerformance] = useState<any>(null)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'DISCOUNT',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    minimumOrderAmount: 0,
    maximumDiscountAmount: 0,
    targetUserRoles: ['CUSTOMER'],
    targetLocations: [],
    targetVendors: [],
    targetProducts: [],
    scheduledStart: '',
    scheduledEnd: '',
    totalUsageLimit: 0,
    perUserUsageLimit: 1,
    budget: 0,
    promoCode: ''
  })

  useEffect(() => {
    fetchCampaigns()
  }, [filters, pagination.page])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/admin/campaigns?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns)
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination.totalPages,
          totalCount: data.pagination.totalCount
        }))
        setStats(data.stats)
        setPerformance(data.performance)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Failed to fetch campaigns')
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async () => {
    try {
      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Campaign created successfully')
        fetchCampaigns()
        setShowNewCampaignDialog(false)
        setNewCampaign({
          name: '',
          description: '',
          type: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 0,
          minimumOrderAmount: 0,
          maximumDiscountAmount: 0,
          targetUserRoles: ['CUSTOMER'],
          targetLocations: [],
          targetVendors: [],
          targetProducts: [],
          scheduledStart: '',
          scheduledEnd: '',
          totalUsageLimit: 0,
          perUserUsageLimit: 1,
          budget: 0,
          promoCode: ''
        })
      } else {
        throw new Error('Failed to create campaign')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    }
  }

  const updateCampaign = async (campaignId: string, updates: any) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Campaign updated successfully')
        fetchCampaigns()
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(result.campaign)
        }
      } else {
        throw new Error('Failed to update campaign')
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error('Failed to update campaign')
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Campaign deleted successfully')
        fetchCampaigns()
      } else {
        throw new Error('Failed to delete campaign')
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'COMPLETED': return 'secondary'
      case 'CANCELLED': return 'destructive'
      case 'PAUSED': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return Play
      case 'COMPLETED': return CheckCircle
      case 'CANCELLED': return Square
      case 'PAUSED': return Pause
      default: return Clock
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const calculateConversionRate = (conversions: number, clicks: number) => {
    if (clicks === 0) return 0
    return (conversions / clicks) * 100
  }

  const calculateROI = (revenue: number, spend: number) => {
    if (spend === 0) return 0
    return ((revenue - spend) / spend) * 100
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(performance.totalBudget)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(performance.totalSpend)} spent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance.totalImpressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {performance.totalClicks.toLocaleString()} clicks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance.totalConversions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(performance.avgConversionRate)} avg rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(performance.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Generated from campaigns
              </p>
            </CardContent>
          </Card>
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
              <Label htmlFor="search">Search Campaigns</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Campaign name, promo code..."
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
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
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
                  <SelectItem value="DISCOUNT">Discount</SelectItem>
                  <SelectItem value="CASHBACK">Cashback</SelectItem>
                  <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                  <SelectItem value="BOGO">Buy One Get One</SelectItem>
                  <SelectItem value="PERCENTAGE_OFF">Percentage Off</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                  <SelectItem value="FIRST_ORDER">First Order</SelectItem>
                  <SelectItem value="LOYALTY_BONUS">Loyalty Bonus</SelectItem>
                  <SelectItem value="REFERRAL_BONUS">Referral Bonus</SelectItem>
                  <SelectItem value="SEASONAL">Seasonal</SelectItem>
                  <SelectItem value="FLASH_SALE">Flash Sale</SelectItem>
                  <SelectItem value="VENDOR_PROMOTION">Vendor Promotion</SelectItem>
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

            <div className="flex items-end space-x-2">
              <Button onClick={fetchCampaigns} className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Button onClick={() => setShowNewCampaignDialog(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Dates</TableHead>
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
                ) : campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No campaigns found
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => {
                    const StatusIcon = getStatusIcon(campaign.status)
                    const conversionRate = calculateConversionRate(campaign.conversions, campaign.clicks)
                    const roi = calculateROI(campaign.revenue, campaign.currentSpend)
                    const budgetUsed = campaign.budget ? (campaign.currentSpend / campaign.budget) * 100 : 0
                    const usageRate = campaign.totalUsageLimit ? (campaign.currentUsageCount / campaign.totalUsageLimit) * 100 : 0
                    
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Megaphone className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-gray-500">
                                {campaign.promoCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {campaign.promoCode}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {campaign.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge variant={getStatusBadgeVariant(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center space-x-2">
                              <Eye className="h-3 w-3" />
                              <span>{campaign.impressions.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Target className="h-3 w-3" />
                              <span>{campaign.conversions} ({conversionRate.toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>ROI: {roi.toFixed(1)}%</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{formatCurrency(campaign.currentSpend)}</div>
                            {campaign.budget && (
                              <div className="text-gray-500">
                                / {formatCurrency(campaign.budget)}
                              </div>
                            )}
                            {campaign.budget && (
                              <Progress value={budgetUsed} className="mt-1 h-1" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{campaign.currentUsageCount}</div>
                            {campaign.totalUsageLimit && (
                              <div className="text-gray-500">
                                / {campaign.totalUsageLimit}
                              </div>
                            )}
                            {campaign.totalUsageLimit && (
                              <Progress value={usageRate} className="mt-1 h-1" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {campaign.scheduledStart && (
                              <div>Start: {new Date(campaign.scheduledStart).toLocaleDateString()}</div>
                            )}
                            {campaign.scheduledEnd && (
                              <div>End: {new Date(campaign.scheduledEnd).toLocaleDateString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCampaign(campaign)
                                setShowCampaignDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                                updateCampaign(campaign.id, { status: newStatus })
                              }}
                            >
                              {campaign.status === 'ACTIVE' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
              Showing {campaigns.length} of {pagination.totalCount} campaigns
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

      {/* Campaign Details Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {/* Campaign Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Campaign Name</Label>
                  <p className="font-medium">{selectedCampaign.name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedCampaign.status)}>
                    {selectedCampaign.status}
                  </Badge>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="font-medium">{selectedCampaign.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label>Promo Code</Label>
                  <p className="font-medium">{selectedCampaign.promoCode || 'Auto-generated'}</p>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <p className="font-medium">
                    {selectedCampaign.discountType === 'PERCENTAGE' 
                      ? `${selectedCampaign.discountValue}%` 
                      : formatCurrency(selectedCampaign.discountValue || 0)}
                  </p>
                </div>
                <div>
                  <Label>Minimum Order</Label>
                  <p className="font-medium">{formatCurrency(selectedCampaign.minimumOrderAmount || 0)}</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{selectedCampaign.impressions.toLocaleString()}</div>
                    <p className="text-sm text-gray-600">Impressions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{selectedCampaign.clicks.toLocaleString()}</div>
                    <p className="text-sm text-gray-600">Clicks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{selectedCampaign.conversions.toLocaleString()}</div>
                    <p className="text-sm text-gray-600">Conversions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{formatCurrency(selectedCampaign.revenue)}</div>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </CardContent>
                </Card>
              </div>

              {/* Budget & Usage */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Allocated:</span>
                        <span className="font-medium">{formatCurrency(selectedCampaign.budget || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spent:</span>
                        <span className="font-medium">{formatCurrency(selectedCampaign.currentSpend)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining:</span>
                        <span className="font-medium">
                          {formatCurrency((selectedCampaign.budget || 0) - selectedCampaign.currentSpend)}
                        </span>
                      </div>
                      {selectedCampaign.budget && (
                        <Progress 
                          value={(selectedCampaign.currentSpend / selectedCampaign.budget) * 100} 
                          className="mt-2"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Limit:</span>
                        <span className="font-medium">{selectedCampaign.totalUsageLimit || 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Used:</span>
                        <span className="font-medium">{selectedCampaign.currentUsageCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per User Limit:</span>
                        <span className="font-medium">{selectedCampaign.perUserUsageLimit || 'Unlimited'}</span>
                      </div>
                      {selectedCampaign.totalUsageLimit && (
                        <Progress 
                          value={(selectedCampaign.currentUsageCount / selectedCampaign.totalUsageLimit) * 100} 
                          className="mt-2"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Targeting */}
              <div>
                <Label>Target Audience</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm">User Roles</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCampaign.targetUserRoles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Locations</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCampaign.targetLocations.length > 0 ? (
                        selectedCampaign.targetLocations.map((location) => (
                          <Badge key={location} variant="outline" className="text-xs">
                            {location}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">All locations</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCampaignDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const newStatus = selectedCampaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                    updateCampaign(selectedCampaign.id, { status: newStatus })
                  }}
                >
                  {selectedCampaign.status === 'ACTIVE' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Campaign
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Campaign
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <Label>Campaign Type</Label>
                <Select value={newCampaign.type} onValueChange={(value) => setNewCampaign(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISCOUNT">Discount</SelectItem>
                    <SelectItem value="CASHBACK">Cashback</SelectItem>
                    <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                    <SelectItem value="BOGO">Buy One Get One</SelectItem>
                    <SelectItem value="PERCENTAGE_OFF">Percentage Off</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                    <SelectItem value="FIRST_ORDER">First Order</SelectItem>
                    <SelectItem value="LOYALTY_BONUS">Loyalty Bonus</SelectItem>
                    <SelectItem value="REFERRAL_BONUS">Referral Bonus</SelectItem>
                    <SelectItem value="SEASONAL">Seasonal</SelectItem>
                    <SelectItem value="FLASH_SALE">Flash Sale</SelectItem>
                    <SelectItem value="VENDOR_PROMOTION">Vendor Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newCampaign.description}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Campaign description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={newCampaign.discountType} onValueChange={(value) => setNewCampaign(prev => ({ ...prev, discountType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                    <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={newCampaign.discountValue}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Minimum Order Amount</Label>
                <Input
                  type="number"
                  value={newCampaign.minimumOrderAmount}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, minimumOrderAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Start</Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduledStart}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduledStart: e.target.value }))}
                />
              </div>
              <div>
                <Label>Scheduled End</Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduledEnd}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduledEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Total Usage Limit</Label>
                <Input
                  type="number"
                  value={newCampaign.totalUsageLimit}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, totalUsageLimit: parseInt(e.target.value) || 0 }))}
                  placeholder="0 for unlimited"
                />
              </div>
              <div>
                <Label>Per User Limit</Label>
                <Input
                  type="number"
                  value={newCampaign.perUserUsageLimit}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, perUserUsageLimit: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                />
              </div>
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  value={newCampaign.budget}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>Promo Code (optional)</Label>
              <Input
                value={newCampaign.promoCode}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, promoCode: e.target.value }))}
                placeholder="Leave empty for auto-generation"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowNewCampaignDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createCampaign}
                disabled={!newCampaign.name || !newCampaign.type}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
