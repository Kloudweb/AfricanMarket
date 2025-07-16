
'use client'

interface PushNotificationClientOptions {
  vapidPublicKey?: string
  autoRegister?: boolean
  debug?: boolean
}

interface NotificationPermission {
  granted: boolean
  denied: boolean
  prompt: boolean
}

export class PushNotificationClient {
  private static instance: PushNotificationClient
  private vapidPublicKey: string
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private debug: boolean = false
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map()

  constructor(options: PushNotificationClientOptions = {}) {
    this.vapidPublicKey = options.vapidPublicKey || 'BMfzY8S8tx8cR7q4V7jZOjNmzYqAm4gTLfnkpZ2s2vJ7VqhPQRLdNxBGlZoLTBGC6Z8QWUVkVVFkqBjW8qHZDw8'
    this.debug = options.debug || false
    
    if (options.autoRegister !== false) {
      this.initialize()
    }
  }

  static getInstance(options?: PushNotificationClientOptions): PushNotificationClient {
    if (!PushNotificationClient.instance) {
      PushNotificationClient.instance = new PushNotificationClient(options)
    }
    return PushNotificationClient.instance
  }

  // Initialize push notifications
  async initialize() {
    try {
      if (!this.isSupported()) {
        this.log('Push notifications are not supported in this browser')
        return false
      }

      // Register service worker
      await this.registerServiceWorker()
      
      // Check existing subscription
      await this.checkExistingSubscription()
      
      this.log('Push notification client initialized')
      return true
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      return false
    }
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return !!(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  // Register service worker
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js')
        this.log('Service worker registered')
        
        // Handle service worker updates
        this.registration.addEventListener('updatefound', () => {
          this.log('Service worker update found')
          this.emit('service_worker_update', {})
        })
        
        return this.registration
      } catch (error) {
        console.error('Service worker registration failed:', error)
        throw error
      }
    }
    throw new Error('Service workers not supported')
  }

  // Check existing subscription
  private async checkExistingSubscription() {
    if (!this.registration) return

    try {
      this.subscription = await this.registration.pushManager.getSubscription()
      if (this.subscription) {
        this.log('Existing subscription found')
        this.emit('subscription_found', { subscription: this.subscription })
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error)
    }
  }

  // Get notification permission status
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return { granted: false, denied: true, prompt: false }
    }

    return {
      granted: Notification.permission === 'granted',
      denied: Notification.permission === 'denied',
      prompt: Notification.permission === 'default'
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported')
      }

      const permission = await Notification.requestPermission()
      this.log(`Notification permission: ${permission}`)
      
      const result = this.getPermission()
      this.emit('permission_changed', result)
      
      return result
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      throw error
    }
  }

  // Subscribe to push notifications
  async subscribe(userId: string): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        throw new Error('Service worker not registered')
      }

      const permission = this.getPermission()
      if (!permission.granted) {
        const newPermission = await this.requestPermission()
        if (!newPermission.granted) {
          throw new Error('Notification permission denied')
        }
      }

      // Create subscription
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      })

      this.log('Push subscription created')

      // Send subscription to server
      await this.sendSubscriptionToServer(userId, this.subscription)
      
      this.emit('subscribed', { subscription: this.subscription })
      return this.subscription
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      this.emit('subscription_error', { error })
      throw error
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      if (!this.subscription) {
        this.log('No subscription to unsubscribe from')
        return true
      }

      // Unsubscribe from browser
      await this.subscription.unsubscribe()
      
      // Remove from server
      await this.removeSubscriptionFromServer(userId)
      
      this.subscription = null
      this.log('Unsubscribed from push notifications')
      
      this.emit('unsubscribed', {})
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      this.emit('subscription_error', { error })
      throw error
    }
  }

  // Send subscription to server
  private async sendSubscriptionToServer(userId: string, subscription: PushSubscription) {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }

    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    }

    const response = await fetch('/api/push-notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        subscription: subscriptionData,
        deviceInfo
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send subscription to server')
    }

    this.log('Subscription sent to server')
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(userId: string) {
    const response = await fetch('/api/push-notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        endpoint: this.subscription?.endpoint
      })
    })

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server')
    }

    this.log('Subscription removed from server')
  }

  // Test notification
  async testNotification(title: string = 'Test Notification', body: string = 'This is a test notification') {
    try {
      const permission = this.getPermission()
      if (!permission.granted) {
        throw new Error('Notification permission not granted')
      }

      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test',
        requireInteraction: false,
        actions: []
      })

      notification.onclick = () => {
        this.log('Test notification clicked')
        notification.close()
      }

      this.log('Test notification shown')
      return true
    } catch (error) {
      console.error('Error showing test notification:', error)
      throw error
    }
  }

  // Get subscription status
  getSubscriptionStatus() {
    return {
      supported: this.isSupported(),
      permission: this.getPermission(),
      subscribed: !!this.subscription,
      subscription: this.subscription,
      serviceWorkerRegistered: !!this.registration
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string) {
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to get notification preferences')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      throw error
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId: string, preferences: any) {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          preferences
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update notification preferences')
      }

      this.log('Notification preferences updated')
      return await response.json()
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      throw error
    }
  }

  // Event listener management
  on(event: string, handler: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(handler)
  }

  off(event: string, handler?: (data: any) => void) {
    if (!this.eventListeners.has(event)) return

    const handlers = this.eventListeners.get(event)!
    if (handler) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    } else {
      this.eventListeners.set(event, [])
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventListeners.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error('Error in event handler:', error)
      }
    })
  }

  // Utility functions
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    return window.btoa(binary)
  }

  private log(message: string) {
    if (this.debug) {
      console.log(`[PushNotificationClient] ${message}`)
    }
  }
}

// Export singleton instance
export const pushNotificationClient = PushNotificationClient.getInstance()
