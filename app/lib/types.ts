
import { UserRole, OrderStatus, RideStatus, PaymentStatus, VerificationStatus } from "@prisma/client"

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  avatar?: string
  isVerified: boolean
  vendorProfile?: any
  driverProfile?: any
}

export interface Vendor {
  id: string
  businessName: string
  businessType: string
  description?: string
  logo?: string
  coverImage?: string
  address: string
  city: string
  province: string
  postalCode: string
  phone: string
  rating: number
  totalReviews: number
  verificationStatus: VerificationStatus
  isActive: boolean
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  category: string
  image?: string
  images: string[]
  isAvailable: boolean
  ingredients?: string
  allergens?: string
  isSpicy: boolean
  prepTime?: number
  vendor: Vendor
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  tax: number
  totalAmount: number
  paymentStatus: PaymentStatus
  isDelivery: boolean
  deliveryAddress?: string
  estimatedDelivery?: Date
  createdAt: Date
  items: OrderItem[]
  vendor: Vendor
  customer: User
  driver?: Driver
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  subtotal: number
  notes?: string
  product: Product
}

export interface Driver {
  id: string
  licenseNumber: string
  vehicleType: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear: number
  vehicleColor: string
  vehiclePlate: string
  rating: number
  totalReviews: number
  verificationStatus: VerificationStatus
  isAvailable: boolean
  totalDeliveries: number
  totalRides: number
  user: User
}

export interface Ride {
  id: string
  rideNumber: string
  status: RideStatus
  pickupAddress: string
  destinationAddress: string
  distance?: number
  estimatedFare?: number
  actualFare?: number
  paymentStatus: PaymentStatus
  requestedAt: Date
  customer: User
  driver?: Driver
}

export interface CartItem {
  product: Product
  quantity: number
  notes?: string
}

export interface Address {
  id: string
  type: string
  address: string
  city: string
  province: string
  postalCode: string
  isDefault: boolean
}

export interface Review {
  id: string
  rating: number
  comment?: string
  images: string[]
  createdAt: Date
  user: User
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}
