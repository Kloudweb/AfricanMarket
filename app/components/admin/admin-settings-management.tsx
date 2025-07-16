
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Info,
  Code,
  Globe,
  Shield,
  Bell,
  CreditCard,
  Truck,
  Car,
  Zap,
  Database,
  Server,
  Wrench
} from 'lucide-react'

interface SystemSetting {
  id: string
  key: string
  value?: string
  type: string
  category: string
  description?: string
  isPublic: boolean
  isEditable: boolean
  validationRules?: any
  metadata?: any
  createdAt: string
  updatedAt: string
  creator?: {
    name: string
    email: string
  }
  updater?: {
    name: string
    email: string
  }
}

export default function AdminSettingsManagement() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [groupedSettings, setGroupedSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null)
  const [showSettingDialog, setShowSettingDialog] = useState(false)
  const [showNewSettingDialog, setShowNewSettingDialog] = useState(false)
  const [editingValue, setEditingValue] = useState('')
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    search: '',
    isPublic: ''
  })
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    type: 'GENERAL',
    category: '',
    description: '',
    isPublic: false,
    isEditable: true,
    validationRules: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [filters])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/admin/settings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setGroupedSettings(data.grouped)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Setting updated successfully')
        fetchSettings()
        setSelectedSetting(null)
        setShowSettingDialog(false)
      } else {
        throw new Error('Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error('Failed to update setting')
    }
  }

  const createSetting = async () => {
    try {
      const validationRules = newSetting.validationRules ? JSON.parse(newSetting.validationRules) : null
      
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSetting,
          validationRules
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Setting created successfully')
        fetchSettings()
        setShowNewSettingDialog(false)
        setNewSetting({
          key: '',
          value: '',
          type: 'GENERAL',
          category: '',
          description: '',
          isPublic: false,
          isEditable: true,
          validationRules: ''
        })
      } else {
        throw new Error('Failed to create setting')
      }
    } catch (error) {
      console.error('Error creating setting:', error)
      toast.error('Failed to create setting')
    }
  }

  const deleteSetting = async (key: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Setting deleted successfully')
        fetchSettings()
      } else {
        throw new Error('Failed to delete setting')
      }
    } catch (error) {
      console.error('Error deleting setting:', error)
      toast.error('Failed to delete setting')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'GENERAL': return Settings
      case 'PAYMENT': return CreditCard
      case 'NOTIFICATION': return Bell
      case 'SECURITY': return Shield
      case 'DELIVERY': return Truck
      case 'RIDESHARE': return Car
      case 'COMMISSION': return Database
      case 'COMPLIANCE': return CheckCircle
      case 'FEATURE_FLAG': return Zap
      case 'MAINTENANCE': return Wrench
      default: return Settings
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'SECURITY': return 'destructive'
      case 'PAYMENT': return 'default'
      case 'FEATURE_FLAG': return 'secondary'
      default: return 'outline'
    }
  }

  const renderSettingValue = (setting: SystemSetting) => {
    if (!setting.value) return <span className="text-gray-400">No value</span>
    
    if (setting.key.toLowerCase().includes('password') || setting.key.toLowerCase().includes('secret')) {
      return <span className="text-gray-400">••••••••</span>
    }
    
    if (setting.value.length > 50) {
      return <span className="text-sm">{setting.value.substring(0, 50)}...</span>
    }
    
    return <span className="text-sm">{setting.value}</span>
  }

  const defaultSettings = [
    { key: 'app.name', value: 'AfricanMarket', type: 'GENERAL', category: 'branding', description: 'Application name' },
    { key: 'app.version', value: '1.0.0', type: 'GENERAL', category: 'system', description: 'Current app version' },
    { key: 'app.maintenance_mode', value: 'false', type: 'MAINTENANCE', category: 'system', description: 'Enable maintenance mode' },
    { key: 'payment.stripe_enabled', value: 'true', type: 'PAYMENT', category: 'gateway', description: 'Enable Stripe payments' },
    { key: 'payment.min_order_amount', value: '5.00', type: 'PAYMENT', category: 'limits', description: 'Minimum order amount' },
    { key: 'delivery.base_fee', value: '2.99', type: 'DELIVERY', category: 'pricing', description: 'Base delivery fee' },
    { key: 'delivery.max_distance', value: '50', type: 'DELIVERY', category: 'limits', description: 'Maximum delivery distance (km)' },
    { key: 'rideshare.base_fare', value: '3.50', type: 'RIDESHARE', category: 'pricing', description: 'Base fare for rides' },
    { key: 'rideshare.per_km_rate', value: '1.25', type: 'RIDESHARE', category: 'pricing', description: 'Per kilometer rate' },
    { key: 'commission.vendor_rate', value: '0.20', type: 'COMMISSION', category: 'rates', description: 'Vendor commission rate' },
    { key: 'commission.driver_rate', value: '0.25', type: 'COMMISSION', category: 'rates', description: 'Driver commission rate' },
    { key: 'notification.email_enabled', value: 'true', type: 'NOTIFICATION', category: 'channels', description: 'Enable email notifications' },
    { key: 'notification.sms_enabled', value: 'true', type: 'NOTIFICATION', category: 'channels', description: 'Enable SMS notifications' },
    { key: 'security.max_login_attempts', value: '5', type: 'SECURITY', category: 'authentication', description: 'Maximum login attempts' },
    { key: 'security.session_timeout', value: '1800', type: 'SECURITY', category: 'authentication', description: 'Session timeout (seconds)' },
    { key: 'feature.real_time_tracking', value: 'true', type: 'FEATURE_FLAG', category: 'tracking', description: 'Enable real-time tracking' },
    { key: 'feature.ride_sharing', value: 'true', type: 'FEATURE_FLAG', category: 'services', description: 'Enable ride sharing service' }
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Settings</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by key, description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="NOTIFICATION">Notification</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="RIDESHARE">Rideshare</SelectItem>
                  <SelectItem value="COMMISSION">Commission</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                  <SelectItem value="FEATURE_FLAG">Feature Flag</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Visibility</Label>
              <Select value={filters.isPublic} onValueChange={(value) => setFilters(prev => ({ ...prev, isPublic: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Settings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Settings</SelectItem>
                  <SelectItem value="true">Public</SelectItem>
                  <SelectItem value="false">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={fetchSettings} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowNewSettingDialog(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Groups */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Settings</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setting</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Editable</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : settings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No settings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      settings.map((setting) => {
                        const TypeIcon = getTypeIcon(setting.type)
                        
                        return (
                          <TableRow key={setting.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <TypeIcon className="h-4 w-4 text-gray-500" />
                                <div>
                                  <div className="font-medium">{setting.key}</div>
                                  {setting.description && (
                                    <div className="text-sm text-gray-500">{setting.description}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTypeBadgeVariant(setting.type)}>
                                {setting.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">{setting.category}</span>
                            </TableCell>
                            <TableCell>
                              {renderSettingValue(setting)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {setting.isPublic ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm">
                                  {setting.isPublic ? 'Public' : 'Private'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {setting.isEditable ? (
                                  <Unlock className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Lock className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm">
                                  {setting.isEditable ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSetting(setting)
                                    setEditingValue(setting.value || '')
                                    setShowSettingDialog(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {setting.isEditable && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteSetting(setting.key)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedSettings.GENERAL || {}).map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category.replace('_', ' ')} Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(categorySettings as SystemSetting[]).map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{setting.key.split('.').pop()}</div>
                          {setting.description && (
                            <div className="text-sm text-gray-500">{setting.description}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {setting.value && (
                            <span className="text-sm font-medium">{setting.value}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSetting(setting)
                              setEditingValue(setting.value || '')
                              setShowSettingDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedSettings.PAYMENT || {}).map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category.replace('_', ' ')} Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(categorySettings as SystemSetting[]).map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{setting.key.split('.').pop()}</div>
                          {setting.description && (
                            <div className="text-sm text-gray-500">{setting.description}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {setting.value && (
                            <span className="text-sm font-medium">{setting.value}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSetting(setting)
                              setEditingValue(setting.value || '')
                              setShowSettingDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedSettings.SECURITY || {}).map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category.replace('_', ' ')} Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(categorySettings as SystemSetting[]).map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{setting.key.split('.').pop()}</div>
                          {setting.description && (
                            <div className="text-sm text-gray-500">{setting.description}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {setting.value && (
                            <span className="text-sm font-medium">{setting.value}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSetting(setting)
                              setEditingValue(setting.value || '')
                              setShowSettingDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedSettings.FEATURE_FLAG || {}).map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category.replace('_', ' ')} Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(categorySettings as SystemSetting[]).map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{setting.key.split('.').pop()}</div>
                          {setting.description && (
                            <div className="text-sm text-gray-500">{setting.description}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={setting.value === 'true'}
                            onCheckedChange={(checked) => {
                              updateSetting(setting.key, checked ? 'true' : 'false')
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Setting Dialog */}
      <Dialog open={showSettingDialog} onOpenChange={setShowSettingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
          </DialogHeader>
          {selectedSetting && (
            <div className="space-y-4">
              <div>
                <Label>Key</Label>
                <Input value={selectedSetting.key} disabled />
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm text-gray-600">{selectedSetting.description || 'No description'}</p>
              </div>

              <div>
                <Label>Current Value</Label>
                {selectedSetting.key.toLowerCase().includes('password') || selectedSetting.key.toLowerCase().includes('secret') ? (
                  <Input
                    type="password"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder="Enter new value"
                  />
                ) : selectedSetting.value && (selectedSetting.value === 'true' || selectedSetting.value === 'false') ? (
                  <Select value={editingValue} onValueChange={setEditingValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder="Enter new value"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Changes will take effect immediately</span>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSettingDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateSetting(selectedSetting.key, editingValue)}
                  disabled={!selectedSetting.isEditable}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Setting Dialog */}
      <Dialog open={showNewSettingDialog} onOpenChange={setShowNewSettingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Setting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key</Label>
              <Input
                value={newSetting.key}
                onChange={(e) => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
                placeholder="e.g., app.feature_name"
              />
            </div>

            <div>
              <Label>Value</Label>
              <Input
                value={newSetting.value}
                onChange={(e) => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Setting value"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={newSetting.type} onValueChange={(value) => setNewSetting(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="NOTIFICATION">Notification</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="RIDESHARE">Rideshare</SelectItem>
                  <SelectItem value="COMMISSION">Commission</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                  <SelectItem value="FEATURE_FLAG">Feature Flag</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Input
                value={newSetting.category}
                onChange={(e) => setNewSetting(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., branding, pricing, limits"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newSetting.description}
                onChange={(e) => setNewSetting(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the setting"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newSetting.isPublic}
                  onCheckedChange={(checked) => setNewSetting(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label>Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newSetting.isEditable}
                  onCheckedChange={(checked) => setNewSetting(prev => ({ ...prev, isEditable: checked }))}
                />
                <Label>Editable</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowNewSettingDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createSetting}
                disabled={!newSetting.key || !newSetting.value}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Setting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

