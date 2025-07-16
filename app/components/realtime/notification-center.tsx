
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, Star, Archive, X, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { InAppNotification } from '@/lib/types'

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  // Load notifications
  useEffect(() => {
    if (session?.user?.id) {
      loadNotifications()
    }
  }, [session?.user?.id, selectedCategory, showUnreadOnly])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      })
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      if (showUnreadOnly) {
        params.append('unread', 'true')
      }

      const response = await fetch(`/api/realtime/notifications?${params}`)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
        setStats(data.stats || {})
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load notifications',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/realtime/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'mark_read' })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        ))
        
        setStats((prev: any) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }))
      } else {
        toast({
          title: 'Error',
          description: 'Failed to mark notification as read',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      })
    }
  }

  // Star notification
  const starNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/realtime/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'star' })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isStarred: true, starredAt: new Date() }
            : notification
        ))
        
        toast({
          title: 'Success',
          description: 'Notification starred'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to star notification',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error starring notification:', error)
      toast({
        title: 'Error',
        description: 'Failed to star notification',
        variant: 'destructive'
      })
    }
  }

  // Archive notification
  const archiveNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/realtime/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'archive' })
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
        
        toast({
          title: 'Success',
          description: 'Notification archived'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to archive notification',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error archiving notification:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive notification',
        variant: 'destructive'
      })
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/realtime/notifications/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'mark_all_read',
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date()
        })))
        
        setStats((prev: any) => ({
          ...prev,
          unread: 0,
          byCategory: Object.keys(prev.byCategory || {}).reduce((acc: any, cat: string) => {
            acc[cat] = {
              ...prev.byCategory[cat],
              unread: selectedCategory === 'all' || selectedCategory === cat ? 0 : prev.byCategory[cat].unread
            }
            return acc
          }, {})
        }))
        
        toast({
          title: 'Success',
          description: 'All notifications marked as read'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to mark all notifications as read',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      })
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '🛍️'
      case 'ride':
        return '🚗'
      case 'payment':
        return '💳'
      case 'system':
        return '⚙️'
      case 'marketing':
        return '📢'
      default:
        return '📋'
    }
  }

  // Get category count
  const getCategoryCount = (category: string) => {
    if (category === 'all') {
      return showUnreadOnly ? stats.unread : stats.total
    }
    return stats.byCategory?.[category] ? 
      (showUnreadOnly ? stats.byCategory[category].unread : stats.byCategory[category].total) : 0
  }

  if (!session?.user?.id) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {stats.unread > 0 && (
            <Badge variant="destructive" className="ml-2">
              {stats.unread}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showUnreadOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showUnreadOnly ? 'Show All' : 'Unread Only'}
              </Button>
              {stats.unread > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Check className="h-4 w-4 mr-2" />
                      Mark All Read
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark All as Read</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to mark all notifications as read?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={markAllAsRead}>
                        Mark All Read
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">
                All ({getCategoryCount('all')})
              </TabsTrigger>
              <TabsTrigger value="orders">
                Orders ({getCategoryCount('orders')})
              </TabsTrigger>
              <TabsTrigger value="rides">
                Rides ({getCategoryCount('rides')})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({getCategoryCount('payments')})
              </TabsTrigger>
              <TabsTrigger value="system">
                System ({getCategoryCount('system')})
              </TabsTrigger>
              <TabsTrigger value="marketing">
                Marketing ({getCategoryCount('marketing')})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              <ScrollArea className="h-96">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notifications found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          notification.isRead ? 'bg-muted/50' : 'bg-background'
                        } ${notification.urgent ? 'border-red-200 bg-red-50' : 'border-border'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`font-medium ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {notification.category}
                                  </Badge>
                                  {notification.urgent && (
                                    <Badge variant="destructive" className="text-xs">
                                      Urgent
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(notification.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => starNotification(notification.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Star className={`h-4 w-4 ${notification.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => archiveNotification(notification.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}

