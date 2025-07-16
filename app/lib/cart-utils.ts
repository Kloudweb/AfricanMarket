
// Cart utility functions

export interface CartCalculation {
  subtotal: number
  tax: number
  deliveryFee: number
  discountAmount: number
  total: number
  taxRate: number
}

export interface DeliveryZone {
  id: string
  name: string
  baseFee: number
  feePerKm?: number
  minimumOrder?: number
  maxDistance?: number
  estimatedTime?: string
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate tax for Newfoundland and Labrador
export function calculateTax(subtotal: number): {
  hst: number
  totalTax: number
  taxRate: number
} {
  const taxRate = 0.15 // 15% HST for Newfoundland and Labrador
  const hst = subtotal * taxRate
  
  return {
    hst,
    totalTax: hst,
    taxRate
  }
}

// Calculate delivery fee based on distance and zones
export function calculateDeliveryFee(
  distance: number,
  zones: DeliveryZone[],
  fallbackFee: number = 5.99
): {
  fee: number
  zone?: DeliveryZone
} {
  for (const zone of zones) {
    if (distance <= (zone.maxDistance || 50)) {
      let fee = zone.baseFee
      if (zone.feePerKm) {
        fee += distance * zone.feePerKm
      }
      return { fee, zone }
    }
  }
  
  // Default calculation if no zones match
  const distanceFee = distance * 0.50 // $0.50 per km
  return { fee: fallbackFee + distanceFee }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Format distance
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  }
  return `${distance.toFixed(1)}km`
}

// Validate postal code (Canadian format)
export function validatePostalCode(postalCode: string): boolean {
  const canadianPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/
  return canadianPostalCodeRegex.test(postalCode)
}

// Generate order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `AM${timestamp}${random}`.toUpperCase()
}

// Calculate cart summary
export function calculateCartSummary(
  items: any[],
  isDelivery: boolean = true,
  promoDiscount: number = 0,
  deliveryFee: number = 0
): CartCalculation {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const taxCalculation = calculateTax(subtotal)
  const finalDeliveryFee = isDelivery ? deliveryFee : 0
  const total = subtotal + taxCalculation.totalTax + finalDeliveryFee - promoDiscount
  
  return {
    subtotal,
    tax: taxCalculation.totalTax,
    deliveryFee: finalDeliveryFee,
    discountAmount: promoDiscount,
    total,
    taxRate: taxCalculation.taxRate
  }
}

// Group cart items by vendor
export function groupItemsByVendor(items: any[]): Record<string, any> {
  return items.reduce((acc, item) => {
    const vendorId = item.vendorId
    if (!acc[vendorId]) {
      acc[vendorId] = {
        vendor: item.product?.vendor || item.vendor,
        items: [],
        subtotal: 0
      }
    }
    acc[vendorId].items.push(item)
    acc[vendorId].subtotal += item.subtotal || (item.quantity * item.price)
    return acc
  }, {})
}

// Check if minimum order is met for vendor
export function checkMinimumOrder(
  vendorSubtotal: number,
  minimumAmount: number = 0
): {
  met: boolean
  remaining: number
} {
  const met = vendorSubtotal >= minimumAmount
  const remaining = met ? 0 : minimumAmount - vendorSubtotal
  
  return { met, remaining }
}

// Get estimated delivery time
export function getEstimatedDeliveryTime(
  prepTime: number = 30,
  deliveryTime: number = 15
): Date {
  const now = new Date()
  const totalMinutes = prepTime + deliveryTime
  return new Date(now.getTime() + totalMinutes * 60 * 1000)
}

// Validate promo code format
export function validatePromoCodeFormat(code: string): boolean {
  // Basic validation - alphanumeric, 3-20 characters
  const promoCodeRegex = /^[A-Za-z0-9]{3,20}$/
  return promoCodeRegex.test(code)
}

// Get order status display text
export function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Order Placed',
    CONFIRMED: 'Order Confirmed',
    PREPARING: 'Being Prepared',
    READY_FOR_PICKUP: 'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  }
  
  return statusMap[status] || status
}

// Get order status color
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'text-yellow-600 bg-yellow-50',
    CONFIRMED: 'text-blue-600 bg-blue-50',
    PREPARING: 'text-orange-600 bg-orange-50',
    READY_FOR_PICKUP: 'text-purple-600 bg-purple-50',
    OUT_FOR_DELIVERY: 'text-indigo-600 bg-indigo-50',
    DELIVERED: 'text-green-600 bg-green-50',
    CANCELLED: 'text-red-600 bg-red-50'
  }
  
  return colorMap[status] || 'text-gray-600 bg-gray-50'
}

// Debounce function for search/input
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Local storage helpers
export const cartStorage = {
  getCart: () => {
    if (typeof window === 'undefined') return null
    try {
      const cart = localStorage.getItem('cart')
      return cart ? JSON.parse(cart) : null
    } catch {
      return null
    }
  },
  
  setCart: (cart: any) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('cart', JSON.stringify(cart))
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  },
  
  clearCart: () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem('cart')
    } catch (error) {
      console.error('Failed to clear cart from localStorage:', error)
    }
  }
}

// Address formatting
export function formatAddress(address: {
  address: string
  city: string
  province: string
  postalCode: string
  apartment?: string
}): string {
  const parts = []
  
  if (address.apartment) {
    parts.push(`${address.apartment} - ${address.address}`)
  } else {
    parts.push(address.address)
  }
  
  parts.push(`${address.city}, ${address.province} ${address.postalCode}`)
  
  return parts.join(', ')
}

// Phone number formatting
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Format Canadian phone number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  return phone
}
