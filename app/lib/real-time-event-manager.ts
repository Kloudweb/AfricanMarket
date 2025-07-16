
// Real-time event management system
import { prisma } from '@/lib/db'
import { WebSocketEvent } from '@/lib/types'
import { webSocketService } from './comprehensive-websocket-service'

export class RealTimeEventManager {
  // Handle incoming event
  async handleEvent(socket: any, event: WebSocketEvent): Promise<void> {
    try {
      // Validate event
      if (!this.validateEvent(event)) {
        socket.emit('event_error', { message: 'Invalid event format' })
        return
      }

      // Process event based on type
      switch (event.type) {
        case 'order_status_update':
          await this.handleOrderStatusUpdate(socket, event)
          break
        case 'driver_location_update':
          await this.handleDriverLocationUpdate(socket, event)
          break
        case 'inventory_update':
          await this.handleInventoryUpdate(socket, event)
          break
        case 'pricing_update':
          await this.handlePricingUpdate(socket, event)
          break
        case 'chat_message':
          await this.handleChatMessage(socket, event)
          break
        case 'notification_event':
          await this.handleNotificationEvent(socket, event)
          break
        case 'analytics_event':
          await this.handleAnalyticsEvent(socket, event)
          break
        default:
          console.warn(`Unknown event type: ${event.type}`)
      }

      // Log event
      await this.logEvent(socket, event)

    } catch (error) {
      console.error('Error handling event:', error)
      socket.emit('event_error', { message: 'Failed to process event' })
    }
  }

  // Validate event
  private validateEvent(event: WebSocketEvent): boolean {
    return (
      event &&
      typeof event.type === 'string' &&
      event.data &&
      event.timestamp
    )
  }

  // Handle order status update
  private async handleOrderStatusUpdate(socket: any, event: WebSocketEvent): Promise<void> {
    const { orderId, status, message, location } = event.data

    if (!orderId || !status) return

    // Create order status update
    await prisma.orderStatusUpdate.create({
      data: {
        orderId,
        newStatus: status,
        message,
        latitude: location?.latitude,
        longitude: location?.longitude,
        address: location?.address,
        updatedBy: socket.userId,
        updatedByRole: socket.userRole,
        source: 'manual',
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Broadcast to relevant users
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true, vendorId: true, driverId: true }
    })

    if (order) {
      // Broadcast to order participants
      webSocketService.emitToUser(order.customerId, 'order_status_update', {
        orderId,
        status,
        message,
        location,
        timestamp: event.timestamp
      })

      webSocketService.emitToUser(order.vendorId, 'order_status_update', {
        orderId,
        status,
        message,
        location,
        timestamp: event.timestamp
      })

      if (order.driverId) {
        webSocketService.emitToUser(order.driverId, 'order_status_update', {
          orderId,
          status,
          message,
          location,
          timestamp: event.timestamp
        })
      }

      // Broadcast to order room
      webSocketService.emitToRoom(`order:${orderId}`, 'order_status_update', {
        orderId,
        status,
        message,
        location,
        timestamp: event.timestamp
      })
    }
  }

  // Handle driver location update
  private async handleDriverLocationUpdate(socket: any, event: WebSocketEvent): Promise<void> {
    const { 
      latitude, 
      longitude, 
      heading, 
      speed, 
      accuracy,
      isOnline,
      isDelivering,
      isRiding,
      currentOrderId,
      currentRideId,
      batteryLevel
    } = event.data

    if (!latitude || !longitude) return

    // Create driver location update
    await prisma.driverLocationUpdate.create({
      data: {
        driverId: socket.userId,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        isOnline: isOnline ?? true,
        isDelivering: isDelivering ?? false,
        isRiding: isRiding ?? false,
        currentOrderId,
        currentRideId,
        batteryLevel,
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Broadcast to relevant users
    const locationUpdate = {
      driverId: socket.userId,
      latitude,
      longitude,
      heading,
      speed,
      accuracy,
      isOnline,
      isDelivering,
      isRiding,
      batteryLevel,
      timestamp: event.timestamp
    }

    // Broadcast to current order/ride
    if (currentOrderId) {
      const order = await prisma.order.findUnique({
        where: { id: currentOrderId },
        select: { customerId: true, vendorId: true }
      })

      if (order) {
        webSocketService.emitToUser(order.customerId, 'driver_location_update', locationUpdate)
        webSocketService.emitToUser(order.vendorId, 'driver_location_update', locationUpdate)
        webSocketService.emitToRoom(`order:${currentOrderId}`, 'driver_location_update', locationUpdate)
      }
    }

    if (currentRideId) {
      const ride = await prisma.ride.findUnique({
        where: { id: currentRideId },
        select: { customerId: true }
      })

      if (ride) {
        webSocketService.emitToUser(ride.customerId, 'driver_location_update', locationUpdate)
        webSocketService.emitToRoom(`ride:${currentRideId}`, 'driver_location_update', locationUpdate)
      }
    }

    // Broadcast to driver management room
    webSocketService.emitToRoom('driver_management', 'driver_location_update', locationUpdate)
  }

  // Handle inventory update
  private async handleInventoryUpdate(socket: any, event: WebSocketEvent): Promise<void> {
    const { productId, newStock, changeType, orderId, notes } = event.data

    if (!productId || newStock === undefined) return

    // Get current stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, vendorId: true }
    })

    if (!product) return

    const previousStock = product.stockQuantity || 0
    const changeAmount = newStock - previousStock

    // Update product stock
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newStock }
    })

    // Create inventory update record
    await prisma.inventoryUpdate.create({
      data: {
        productId,
        vendorId: product.vendorId,
        previousStock,
        newStock,
        changeAmount,
        changeType: changeType || 'manual',
        orderId,
        userId: socket.userId,
        source: 'manual',
        notes,
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Broadcast update
    const inventoryUpdate = {
      productId,
      previousStock,
      newStock,
      changeAmount,
      changeType,
      notes,
      timestamp: event.timestamp
    }

    webSocketService.emitToRoom(`vendor:${product.vendorId}`, 'inventory_update', inventoryUpdate)
    webSocketService.emitToRoom(`product:${productId}`, 'inventory_update', inventoryUpdate)
  }

  // Handle pricing update
  private async handlePricingUpdate(socket: any, event: WebSocketEvent): Promise<void> {
    const { productId, newPrice, reason, effectiveUntil } = event.data

    if (!productId || newPrice === undefined) return

    // Get current price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, vendorId: true }
    })

    if (!product) return

    const previousPrice = product.price
    const changeAmount = newPrice - previousPrice
    const changePercent = (changeAmount / previousPrice) * 100

    // Update product price
    await prisma.product.update({
      where: { id: productId },
      data: { price: newPrice }
    })

    // Create pricing update record
    await prisma.pricingUpdate.create({
      data: {
        productId,
        vendorId: product.vendorId,
        previousPrice,
        newPrice,
        changeAmount,
        changePercent,
        userId: socket.userId,
        source: 'manual',
        reason,
        effectiveUntil,
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Broadcast update
    const pricingUpdate = {
      productId,
      previousPrice,
      newPrice,
      changeAmount,
      changePercent,
      reason,
      effectiveUntil,
      timestamp: event.timestamp
    }

    webSocketService.emitToRoom(`vendor:${product.vendorId}`, 'pricing_update', pricingUpdate)
    webSocketService.emitToRoom(`product:${productId}`, 'pricing_update', pricingUpdate)
  }

  // Handle chat message
  private async handleChatMessage(socket: any, event: WebSocketEvent): Promise<void> {
    try {
      const { roomId, message, messageType, mediaUrl, replyToId } = event.data

      if (!roomId || !message) return

      // Use ChatService to handle the message
      const { ChatService } = await import('./chat-service')
      const chatService = new ChatService()
      
      await chatService.handleMessage(socket, {
        roomId,
        message,
        messageType: messageType || 'text',
        mediaUrl,
        replyToId
      })
    } catch (error) {
      console.error('Error handling chat message:', error)
    }
  }

  // Handle notification event
  private async handleNotificationEvent(socket: any, event: WebSocketEvent): Promise<void> {
    try {
      const { type, title, body, data, urgent } = event.data

      if (!type || !title || !body) return

      // Send notification via orchestrator
      const { NotificationOrchestrator } = await import('./notification-orchestrator')
      const orchestrator = new NotificationOrchestrator()
      
      await orchestrator.sendNotification({
        userId: socket.userId,
        title,
        body,
        type,
        data,
        urgent: urgent || false
      })
    } catch (error) {
      console.error('Error handling notification event:', error)
    }
  }

  // Handle analytics event
  private async handleAnalyticsEvent(socket: any, event: WebSocketEvent): Promise<void> {
    try {
      const {
        eventType,
        eventCategory,
        eventAction,
        eventLabel,
        eventValue,
        pageUrl,
        pageTitle,
        referrer,
        customData
      } = event.data

      if (!eventType) return

      // Save analytics event
      await prisma.analyticsEvent.create({
        data: {
          userId: socket.userId,
          sessionId: socket.sessionId,
          eventType,
          eventCategory,
          eventAction,
          eventLabel,
          eventValue,
          pageUrl,
          pageTitle,
          referrer,
          userAgent: socket.userAgent,
          ipAddress: socket.ipAddress,
          deviceType: socket.deviceType,
          platform: socket.platform,
          customData,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Error handling analytics event:', error)
    }
  }

  // Log event
  private async logEvent(socket: any, event: WebSocketEvent): Promise<void> {
    try {
      await prisma.realTimeEvent.create({
        data: {
          eventType: event.type,
          eventData: event.data,
          targetUserId: socket.userId,
          targetRole: socket.userRole,
          roomId: event.roomId,
          priority: event.priority || 'NORMAL',
          broadcast: false,
          sent: true,
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging event:', error)
    }
  }
}
