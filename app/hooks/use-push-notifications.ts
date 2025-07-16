
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { pushNotificationClient } from '@/lib/push-notification-client'

interface PushNotificationState {
  supported: boolean
  permission: 'granted' | 'denied' | 'prompt'
  subscribed: boolean
  subscription: PushSubscription | null
  loading: boolean
  error: string | null
}

interface NotificationPreferences {
  orderUpdates: boolean
  preparationTime: boolean
  driverAssigned: boolean
  driverLocation: boolean
  deliveryConfirmation: boolean
  promotions: boolean
  email: boolean
  sms: boolean
  push: boolean
  realTimeUpdates: boolean
  digest: boolean
  quietHours: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}

export const usePushNotifications = () => {
  const { data: session } = useSession()
  const [state, setState] = useState<PushNotificationState>({
    supported: false,
    permission: 'prompt',
    subscribed: false,
    subscription: null,
    loading: false,
    error: null
  })

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loadingPreferences, setLoadingPreferences] = useState(false)

  // Initialize push notification client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initializeClient = async () => {
        try {
          const initialized = await pushNotificationClient.initialize()
          const status = pushNotificationClient.getSubscriptionStatus()
          
          setState(prev => ({
            ...prev,
            supported: status.supported,
            permission: status.permission.granted ? 'granted' : 
                       status.permission.denied ? 'denied' : 'prompt',
            subscribed: status.subscribed,
            subscription: status.subscription
          }))
        } catch (error) {
          console.error('Error initializing push notifications:', error)
          setState(prev => ({
            ...prev,
            error: 'Failed to initialize push notifications'
          }))
        }
      }

      initializeClient()
    }
  }, [])

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoadingPreferences(true)
      const prefs = await pushNotificationClient.getNotificationPreferences(session.user.id)
      setPreferences(prefs)
    } catch (error) {
      console.error('Error loading notification preferences:', error)
    } finally {
      setLoadingPreferences(false)
    }
  }, [session?.user?.id])

  // Load preferences when session is available
  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences()
    }
  }, [session?.user?.id, loadPreferences])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!session?.user?.id) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const subscription = await pushNotificationClient.subscribe(session.user.id)
      
      setState(prev => ({
        ...prev,
        subscribed: true,
        subscription,
        loading: false
      }))
      
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      }))
      return false
    }
  }, [session?.user?.id])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!session?.user?.id) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const result = await pushNotificationClient.unsubscribe(session.user.id)
      
      setState(prev => ({
        ...prev,
        subscribed: false,
        subscription: null,
        loading: false
      }))
      
      return result
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }))
      return false
    }
  }, [session?.user?.id])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const permission = await pushNotificationClient.requestPermission()
      
      setState(prev => ({
        ...prev,
        permission: permission.granted ? 'granted' : 
                   permission.denied ? 'denied' : 'prompt',
        loading: false
      }))
      
      return permission.granted
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to request permission'
      }))
      return false
    }
  }, [])

  // Test notification
  const testNotification = useCallback(async () => {
    try {
      await pushNotificationClient.testNotification(
        'Test Notification',
        'This is a test notification from AfricanMarket'
      )
      return true
    } catch (error) {
      console.error('Error showing test notification:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to show test notification'
      }))
      return false
    }
  }, [])

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!session?.user?.id) return false

    try {
      setLoadingPreferences(true)
      const updatedPrefs = await pushNotificationClient.updateNotificationPreferences(
        session.user.id,
        newPreferences
      )
      setPreferences(updatedPrefs)
      return true
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    } finally {
      setLoadingPreferences(false)
    }
  }, [session?.user?.id])

  // Get subscription status
  const getSubscriptionStatus = useCallback(() => {
    return pushNotificationClient.getSubscriptionStatus()
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Check if specific notification type is enabled
  const isNotificationEnabled = useCallback((type: string) => {
    if (!preferences) return true

    const typeMap: Record<string, keyof NotificationPreferences> = {
      'ride_status': 'driverAssigned',
      'safety_alert': 'realTimeUpdates',
      'incoming_call': 'realTimeUpdates',
      'new_message': 'realTimeUpdates',
      'eta_update': 'driverLocation',
      'order_update': 'orderUpdates',
      'trip_share': 'realTimeUpdates',
      'promotion': 'promotions'
    }

    const prefKey = typeMap[type]
    return prefKey ? preferences[prefKey] : true
  }, [preferences])

  // Check if quiet hours are active
  const isQuietHoursActive = useCallback(() => {
    if (!preferences?.quietHours || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number)
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number)
    
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime
    }
  }, [preferences])

  return {
    // State
    supported: state.supported,
    permission: state.permission,
    subscribed: state.subscribed,
    subscription: state.subscription,
    loading: state.loading,
    error: state.error,
    
    // Preferences
    preferences,
    loadingPreferences,
    
    // Actions
    subscribe,
    unsubscribe,
    requestPermission,
    testNotification,
    updatePreferences,
    loadPreferences,
    clearError,
    
    // Utilities
    getSubscriptionStatus,
    isNotificationEnabled,
    isQuietHoursActive,
    
    // Computed values
    canSubscribe: state.supported && state.permission === 'granted' && !state.subscribed,
    needsPermission: state.supported && state.permission === 'prompt',
    permissionDenied: state.permission === 'denied',
    ready: state.supported && state.permission === 'granted' && state.subscribed
  }
}

// Hook for notification preferences only
export const useNotificationPreferences = () => {
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPreferences = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)
      const prefs = await pushNotificationClient.getNotificationPreferences(session.user.id)
      setPreferences(prefs)
    } catch (error) {
      console.error('Error loading notification preferences:', error)
      setError(error instanceof Error ? error.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!session?.user?.id) return false

    try {
      setLoading(true)
      setError(null)
      const updatedPrefs = await pushNotificationClient.updateNotificationPreferences(
        session.user.id,
        newPreferences
      )
      setPreferences(updatedPrefs)
      return true
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      setError(error instanceof Error ? error.message : 'Failed to update preferences')
      return false
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences()
    }
  }, [session?.user?.id, loadPreferences])

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    loadPreferences,
    clearError: () => setError(null)
  }
}
