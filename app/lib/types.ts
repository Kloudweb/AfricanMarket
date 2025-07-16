

import { 
  UserRole, 
  OrderStatus, 
  RideStatus, 
  PaymentStatus, 
  VerificationStatus,
  TokenType,
  DocumentType,
  DocumentStatus,
  KYCStatus,
  PromoCodeType,
  DriverAvailabilityStatusType,
  AssignmentStatus,
  ServiceType,
  MatchingAlgorithmType
} from "@prisma/client"

// Re-export for components
export type { RideStatus, DriverAvailabilityStatusType, AssignmentStatus, ServiceType, MatchingAlgorithmType } from "@prisma/client"

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  avatar?: string
  isVerified: boolean
  vendorProfile?: any
  driverProfile?: any
  
  // Enhanced authentication fields
  emailVerified: boolean
  emailVerifiedAt?: Date
  phoneVerified: boolean
  phoneVerifiedAt?: Date
  kycVerified: boolean
  kycVerifiedAt?: Date
  profileCompleted: boolean
  profileCompletedAt?: Date
  
  // Security fields
  failedLoginAttempts: number
  lockedUntil?: Date
  
  // Two-factor authentication
  twoFactorEnabled: boolean
  
  // Social login fields
  socialProviders: string[]
  
  // Additional profile fields
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  gender?: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  timezone?: string
  language?: string
  phone?: string
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
  rideType: string
  pickupAddress: string
  pickupLatitude: number
  pickupLongitude: number
  destinationAddress: string
  destinationLatitude: number
  destinationLongitude: number
  distance?: number
  estimatedDuration?: number
  estimatedFare?: number
  actualFare?: number
  baseFare?: number
  distanceFare?: number
  timeFare?: number
  surgeFare?: number
  surgeMultiplier?: number
  paymentStatus: PaymentStatus
  paymentMethod?: string
  notes?: string
  passengers: number
  isScheduled: boolean
  scheduledFor?: Date
  cancelReason?: string
  cancelledBy?: string
  requestedAt: Date
  acceptedAt?: Date
  arrivedAt?: Date
  startedAt?: Date
  completedAt?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
  customer: User
  driver?: Driver
  rideRequest?: RideRequest
  fareEstimate?: FareEstimate
  tracking: RideTracking[]
}

// Shopping Cart Types
export interface CartItem {
  id: string
  productId: string
  vendorId: string
  quantity: number
  price: number
  subtotal: number
  notes?: string
  product: Product
  vendor: Vendor
  addedAt: Date
  updatedAt: Date
}

export interface Cart {
  id: string
  userId: string
  items: CartItem[]
  subtotal: number
  tax: number
  deliveryFee: number
  total: number
  appliedPromoCode?: string
  discountAmount: number
  isDelivery: boolean
  deliveryAddress?: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  specialInstructions?: string
  createdAt: Date
  updatedAt: Date
}

export interface PromoCode {
  id: string
  code: string
  type: PromoCodeType
  discountValue: number
  minimumOrderAmount?: number
  maxDiscountAmount?: number
  vendorId?: string
  description?: string
  isActive: boolean
  usageLimit?: number
  usageCount: number
  userLimit?: number
  validFrom: Date
  validUntil?: Date
  vendor?: Vendor
}

export interface PromoCodeUsage {
  id: string
  userId: string
  promoCodeId: string
  orderId?: string
  discountAmount: number
  usedAt: Date
  user: User
  promoCode: PromoCode
  order?: Order
}

export interface SavedAddress {
  id: string
  userId: string
  label: string
  firstName?: string
  lastName?: string
  company?: string
  address: string
  apartment?: string
  city: string
  province: string
  postalCode: string
  country: string
  phone?: string
  latitude?: number
  longitude?: number
  isDefault: boolean
  deliveryInstructions?: string
  createdAt: Date
  updatedAt: Date
}

export interface VendorOrder {
  id: string
  orderId: string
  vendorId: string
  orderNumber: string
  status: OrderStatus
  items: VendorOrderItem[]
  subtotal: number
  tax: number
  deliveryFee: number
  total: number
  discountAmount: number
  specialInstructions?: string
  estimatedPickupTime?: Date
  estimatedDeliveryTime?: Date
  actualPickupTime?: Date
  actualDeliveryTime?: Date
  createdAt: Date
  updatedAt: Date
}

export interface VendorOrderItem {
  id: string
  vendorOrderId: string
  productId: string
  quantity: number
  price: number
  subtotal: number
  notes?: string
  product: Product
}

export interface TaxCalculation {
  id: string
  orderId?: string
  province: string
  city?: string
  postalCode?: string
  subtotal: number
  hst: number
  gst: number
  pst: number
  totalTax: number
  taxRate: number
  createdAt: Date
}

export interface DeliveryZone {
  id: string
  vendorId: string
  name: string
  description?: string
  boundaries: any // JSON
  baseFee: number
  feePerKm?: number
  minimumOrder?: number
  maxDistance?: number
  estimatedTime?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
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

// Enhanced Authentication Types

export interface VerificationToken {
  id: string
  userId: string
  type: TokenType
  token: string
  code?: string
  expiresAt: Date
  used: boolean
  usedAt?: Date
  attempts: number
  maxAttempts: number
  createdAt: Date
}

export interface Document {
  id: string
  userId: string
  type: DocumentType
  title: string
  description?: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  cloudinaryId?: string
  status: DocumentStatus
  uploadedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  rejectionReason?: string
  expiresAt?: Date
  metadata?: any
  createdAt: Date
}

export interface KYCApplication {
  id: string
  userId: string
  status: KYCStatus
  applicationLevel: string
  submittedAt?: Date
  reviewedAt?: Date
  approvedAt?: Date
  rejectedAt?: Date
  expiresAt?: Date
  reviewedBy?: string
  rejectionReason?: string
  notes?: string
  completionScore: number
  
  // Required documents checklist
  profilePhotoRequired: boolean
  governmentIdRequired: boolean
  proofOfAddressRequired: boolean
  businessLicenseRequired: boolean
  foodSafetyRequired: boolean
  driversLicenseRequired: boolean
  vehicleRegistrationRequired: boolean
  vehicleInsuranceRequired: boolean
  
  // Document verification status
  profilePhotoVerified: boolean
  governmentIdVerified: boolean
  proofOfAddressVerified: boolean
  businessLicenseVerified: boolean
  foodSafetyVerified: boolean
  driversLicenseVerified: boolean
  vehicleRegistrationVerified: boolean
  vehicleInsuranceVerified: boolean
  
  metadata?: any
  createdAt: Date
  documents: Document[]
}

export interface LoginAttempt {
  id: string
  email: string
  ipAddress: string
  userAgent?: string
  successful: boolean
  failureReason?: string
  timestamp: Date
  country?: string
  city?: string
  device?: string
}

export interface PasswordResetLog {
  id: string
  userId: string
  email: string
  ipAddress: string
  userAgent?: string
  tokenUsed: string
  successful: boolean
  timestamp: Date
}

export interface AuditLog {
  id: string
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// Enhanced Profile Types

export interface EnhancedUser extends User {
  documents: Document[]
  kycApplications: KYCApplication[]
  verificationTokens: VerificationToken[]
}

export interface ProfileCompletionInfo {
  completionScore: number
  missingFields: string[]
  completedSections: string[]
  nextSteps: string[]
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  passwordLastChanged?: Date
  recentLoginAttempts: LoginAttempt[]
  activeDevices: string[]
  trustedDevices: string[]
}

// Form Data Types

export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  role: UserRole
  acceptTerms: boolean
  acceptMarketing?: boolean
}

export interface VendorRegistrationData extends SignUpFormData {
  businessName: string
  businessType: string
  businessCategory: string
  businessSubcategory?: string
  businessAddress: string
  businessCity: string
  businessProvince: string
  businessPostalCode: string
  businessPhone: string
  businessEmail?: string
  businessWebsite?: string
  cuisineTypes?: string[]
  description?: string
}

export interface DriverRegistrationData extends SignUpFormData {
  licenseNumber: string
  licenseClass: string
  licenseExpiry: Date
  licenseIssuedBy: string
  vehicleType: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear: number
  vehicleColor: string
  vehiclePlate: string
  vehicleVin?: string
  serviceTypes: string[]
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
}

export interface EmailVerificationData {
  email: string
  code: string
  token: string
}

export interface PhoneVerificationData {
  phone: string
  code: string
  token: string
}

export interface PasswordResetData {
  email: string
  token: string
  newPassword: string
  confirmPassword: string
}

export interface DocumentUploadData {
  file: File
  type: DocumentType
  title: string
  description?: string
  expiresAt?: Date
}

// Cart-specific types
export interface CartCalculation {
  subtotal: number
  tax: number
  deliveryFee: number
  discountAmount: number
  total: number
}

export interface VendorGroup {
  vendor: Vendor
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  minimumOrderAmount: number
}

export interface CheckoutData {
  paymentMethod: string
  deliveryAddress?: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  isDelivery: boolean
  specialInstructions?: string
  addressId?: string
}

// Order tracking types
export interface OrderTracking {
  id: string
  orderId: string
  status: OrderStatus
  message?: string
  latitude?: number
  longitude?: number
  timestamp: Date
  updatedBy?: string
  estimatedTime?: Date
  actualTime?: Date
  metadata?: any
}

// Enhanced tracking types
export interface DriverLocation {
  id: string
  driverId: string
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  accuracy?: number
  timestamp: Date
  isOnline: boolean
  isDelivering: boolean
  currentOrderId?: string
  batteryLevel?: number
  appVersion?: string
}

export interface PreparationTime {
  id: string
  vendorId: string
  orderId?: string
  baseTime: number
  complexity: number
  rush: boolean
  estimatedTime: number
  actualTime?: number
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryConfirmation {
  id: string
  orderId: string
  driverId: string
  customerId: string
  latitude: number
  longitude: number
  photos: string[]
  signature?: string
  notes?: string
  timestamp: Date
  verified: boolean
  verifiedAt?: Date
  driver?: Driver
}

export interface NotificationPreferences {
  id: string
  userId: string
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
  digestFrequency?: string
  quietHours: boolean
  quietStart?: string
  quietEnd?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderChat {
  id: string
  orderId: string
  senderId: string
  senderRole: UserRole
  message: string
  messageType: string
  metadata?: any
  isRead: boolean
  readAt?: Date
  createdAt: Date
  sender: User
}

export interface PushNotification {
  id: string
  userId: string
  title: string
  body: string
  data?: any
  sent: boolean
  sentAt?: Date
  delivered: boolean
  deliveredAt?: Date
  clicked: boolean
  clickedAt?: Date
  orderId?: string
  rideId?: string
  createdAt: Date
  user: User
  order?: Order
  ride?: Ride
}

export interface DriverShift {
  id: string
  driverId: string
  startTime: Date
  endTime?: Date
  status: string
  totalEarnings: number
  totalDeliveries: number
  totalDistance: number
  totalTime: number
  createdAt: Date
  updatedAt: Date
}

export interface OrderTimeEstimate {
  id: string
  orderId: string
  preparationTime: number
  pickupTime: number
  deliveryTime: number
  totalTime: number
  estimatedPickup?: Date
  estimatedDelivery?: Date
  actualPickup?: Date
  actualDelivery?: Date
  accuracy?: number
  createdAt: Date
  updatedAt: Date
}

export interface DriverAssignment {
  id: string
  orderId: string
  driverId: string
  priority: number
  distance: number
  eta: number
  status: string
  assignedAt: Date
  respondedAt?: Date
  response?: string
  expiresAt: Date
  order: Order
  driver: Driver
}

export interface Geofence {
  id: string
  name: string
  type: string
  latitude: number
  longitude: number
  radius: number
  vendorId?: string
  orderId?: string
  isActive: boolean
  createdAt: Date
  vendor?: Vendor
  order?: Order
}

export interface DeliveryRoute {
  id: string
  driverId: string
  orderIds: string[]
  route: any
  distance: number
  duration: number
  optimized: boolean
  status: string
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  driver: Driver
}

// Rideshare specific types
export interface RideRequest {
  id: string
  rideId: string
  customerId: string
  pickupAddress: string
  pickupLatitude: number
  pickupLongitude: number
  destinationAddress: string
  destinationLatitude: number
  destinationLongitude: number
  rideType: string
  passengers: number
  isScheduled: boolean
  scheduledFor?: Date
  notes?: string
  maxFare?: number
  preferredDriverId?: string
  autoAccept: boolean
  expiresAt: Date
  minRating?: number
  allowShared: boolean
  requireChild: boolean
  requireWheelchair: boolean
  createdAt: Date
  updatedAt: Date
  ride: Ride
  customer: User
  driverResponses: DriverResponse[]
}

export interface SavedLocation {
  id: string
  userId: string
  rideId?: string
  type: string
  name: string
  address: string
  latitude: number
  longitude: number
  apartment?: string
  notes?: string
  isDefault: boolean
  usageCount: number
  lastUsed?: Date
  createdAt: Date
  updatedAt: Date
}

export interface FareEstimate {
  id: string
  rideId: string
  rideType: string
  distance: number
  duration: number
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeFare?: number
  surgeMultiplier: number
  totalFare: number
  currency: string
  fareBreakdown: any
  peakHours: boolean
  weatherImpact: boolean
  demandLevel: string
  validUntil: Date
  createdAt: Date
  breakdown: {
    distance: number
    duration: number
    rideType: string
    surgeActive: boolean
    estimatedTime: string
    estimatedDistance: string
  }
}

export interface RideType {
  id: string
  name: string
  displayName: string
  description?: string
  icon?: string
  baseFare: number
  perKmRate: number
  perMinuteRate: number
  minimumFare: number
  maximumFare?: number
  capacity: number
  isActive: boolean
  vehicleTypes: string[]
  minYear?: number
  features: string[]
  surgePricing: boolean
  maxSurge: number
  availableHours?: any
  availableDays: string[]
  availableDrivers?: number
  estimatedWaitTime?: string
  createdAt: Date
  updatedAt: Date
}

export interface DriverResponse {
  id: string
  rideRequestId: string
  driverId: string
  response: string
  estimatedArrival?: number
  notes?: string
  respondedAt: Date
  expiresAt: Date
  driverLatitude?: number
  driverLongitude?: number
  distanceToPickup?: number
  createdAt: Date
  rideRequest: RideRequest
  driver: Driver
}

export interface SurgeZone {
  id: string
  name: string
  boundaries: any
  multiplier: number
  isActive: boolean
  startTime: Date
  endTime?: Date
  reason?: string
  activeRides: number
  activeDrivers: number
  demandLevel: string
  createdAt: Date
  updatedAt: Date
}

export interface RideSchedule {
  id: string
  customerId: string
  rideType: string
  pickupAddress: string
  pickupLatitude: number
  pickupLongitude: number
  destinationAddress: string
  destinationLatitude: number
  destinationLongitude: number
  scheduledFor: Date
  isRecurring: boolean
  recurringType?: string
  recurringDays: string[]
  recurringUntil?: Date
  passengers: number
  notes?: string
  preferredDriverId?: string
  maxFare?: number
  status: string
  nextRideAt?: Date
  lastRideAt?: Date
  createdAt: Date
  updatedAt: Date
  customer: User
}

export interface DriverPreference {
  id: string
  driverId: string
  maxDistance?: number
  rideTypes: string[]
  workingHours?: any
  breakTimes?: any
  workingDays: string[]
  minRating?: number
  allowPets: boolean
  allowSmoking: boolean
  allowFood: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  autoAcceptEnabled: boolean
  autoAcceptDistance?: number
  createdAt: Date
  updatedAt: Date
}

export interface RideStatistics {
  id: string
  date: Date
  totalRides: number
  completedRides: number
  cancelledRides: number
  totalRevenue: number
  totalDistance: number
  averageRating: number
  peakHourRides: number
  surgeHourRides: number
  standardRides: number
  premiumRides: number
  sharedRides: number
  averageWaitTime: number
  averageRideTime: number
  driverUtilization: number
  createdAt: Date
  updatedAt: Date
}

export interface RideTracking {
  id: string
  rideId: string
  status: RideStatus
  message?: string
  latitude?: number
  longitude?: number
  timestamp: Date
  ride: Ride
}

// Enhanced Driver type for rideshare
export interface EnhancedDriver extends Driver {
  distance?: number
  eta?: number
  etaText?: string
  heading?: number
  speed?: number
  isOnline?: boolean
  lastLocationUpdate?: Date
  preferences?: DriverPreference
}

// Rideshare form data types
export interface RideRequestFormData {
  pickupAddress: string
  pickupLatitude: number
  pickupLongitude: number
  destinationAddress: string
  destinationLatitude: number
  destinationLongitude: number
  rideType: string
  passengers: number
  isScheduled: boolean
  scheduledFor?: string
  notes?: string
  maxFare?: number
  preferredDriverId?: string
  autoAccept: boolean
  minRating?: number
  allowShared: boolean
  requireChild: boolean
  requireWheelchair: boolean
}

export interface LocationSearchResult {
  address: string
  formattedAddress: string
  latitude: number
  longitude: number
  placeId: string
  types: string[]
  components: {
    streetNumber?: string
    route?: string
    locality?: string
    administrativeAreaLevel1?: string
    country?: string
    postalCode?: string
  }
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Enhanced Matching Algorithm Types

export interface DriverAvailabilityStatus {
  id: string
  driverId: string
  status: DriverAvailabilityStatusType
  reason?: string
  startTime: Date
  endTime?: Date
  latitude?: number
  longitude?: number
  batteryLevel?: number
  connectionStrength?: number
  appVersion?: string
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface DriverPerformanceMetrics {
  id: string
  driverId: string
  period: string
  periodStart: Date
  periodEnd: Date
  totalAssignments: number
  acceptedAssignments: number
  rejectedAssignments: number
  expiredAssignments: number
  completedAssignments: number
  acceptanceRate: number
  completionRate: number
  avgResponseTime: number
  avgPickupTime: number
  avgDeliveryTime: number
  avgRating: number
  totalReviews: number
  customerComplaints: number
  totalDistance: number
  totalEarnings: number
  totalOnlineTime: number
  totalActiveTime: number
  latePickups: number
  lateDeliveries: number
  cancellations: number
  noShows: number
  ordersPerHour: number
  milesPerOrder: number
  revenuePerHour: number
  matchingScore: number
  priorityLevel: number
  createdAt: Date
  updatedAt: Date
}

export interface DriverMatchingPreferences {
  id: string
  driverId: string
  serviceTypes: ServiceType[]
  maxDistance: number
  maxOrderValue?: number
  minOrderValue?: number
  preferredCuisines: string[]
  avoidCuisines: string[]
  acceptCashOnDelivery: boolean
  acceptLargeOrders: boolean
  acceptBulkOrders: boolean
  acceptScheduledOrders: boolean
  acceptSharedRides: boolean
  acceptLongRides: boolean
  acceptAirportRides: boolean
  maxPassengers: number
  preferredAreas: string[]
  avoidAreas: string[]
  workingHours?: any
  breakDuration: number
  maxConsecutiveHours: number
  enablePushNotifications: boolean
  enableSmsNotifications: boolean
  enableEmailNotifications: boolean
  notificationSound?: string
  vibrationEnabled: boolean
  autoAcceptOrders: boolean
  autoAcceptThreshold?: number
  responseTimeLimit: number
  createdAt: Date
  updatedAt: Date
}

export interface DriverAssignmentHistory {
  id: string
  driverId: string
  orderId?: string
  rideId?: string
  assignmentId?: string
  assignmentType: string
  status: AssignmentStatus
  priority: number
  distance: number
  eta: number
  assignedAt: Date
  offeredAt?: Date
  respondedAt?: Date
  acceptedAt?: Date
  rejectedAt?: Date
  expiredAt?: Date
  completedAt?: Date
  responseTime?: number
  rejectionReason?: string
  autoAccepted: boolean
  pickupTime?: Date
  deliveryTime?: Date
  actualDistance?: number
  actualDuration?: number
  customerRating?: number
  matchingScore?: number
  algorithmVersion?: string
  factors?: any
  createdAt: Date
  updatedAt: Date
}

export interface DriverWorkingHours {
  id: string
  driverId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
  timezone: string
  breakStart?: string
  breakEnd?: string
  isHoliday: boolean
  holidayName?: string
  createdAt: Date
  updatedAt: Date
}

export interface DriverServiceArea {
  id: string
  driverId: string
  name: string
  type: string
  coordinates: any
  radius?: number
  isActive: boolean
  priority: number
  serviceTypes: string[]
  minimumFare?: number
  maximumFare?: number
  createdAt: Date
  updatedAt: Date
}

export interface DriverBatteryStatus {
  id: string
  driverId: string
  batteryLevel: number
  isCharging: boolean
  lowBattery: boolean
  criticalBattery: boolean
  estimatedTime?: number
  timestamp: Date
}

export interface DriverConnectionStatus {
  id: string
  driverId: string
  connectionType: string
  signalStrength: number
  networkProvider?: string
  isConnected: boolean
  latency?: number
  timestamp: Date
}

export interface DriverGeofenceStatus {
  id: string
  driverId: string
  geofenceId: string
  status: string
  latitude: number
  longitude: number
  timestamp: Date
}

export interface MatchingAlgorithmConfig {
  id: string
  name: string
  algorithmType: MatchingAlgorithmType
  isActive: boolean
  version: string
  distanceWeight: number
  ratingWeight: number
  completionRateWeight: number
  responseTimeWeight: number
  availabilityWeight: number
  maxDistance: number
  maxAssignments: number
  assignmentTimeout: number
  reassignmentDelay: number
  minRating: number
  minCompletionRate: number
  maxResponseTime: number
  enableSurgeMatching: boolean
  enableBatchMatching: boolean
  enablePredictiveMatching: boolean
  testingEnabled: boolean
  testingPercentage: number
  configuration?: any
  createdAt: Date
  updatedAt: Date
}

export interface MatchingAssignment {
  id: string
  configId: string
  driverId: string
  orderId?: string
  rideId?: string
  assignmentType: string
  status: AssignmentStatus
  priority: number
  totalScore: number
  distanceScore: number
  ratingScore: number
  completionRateScore: number
  responseTimeScore: number
  availabilityScore: number
  distance: number
  eta: number
  responseTimeout: Date
  driverLatitude: number
  driverLongitude: number
  assignedAt: Date
  offeredAt?: Date
  respondedAt?: Date
  acceptedAt?: Date
  rejectedAt?: Date
  expiredAt?: Date
  reassignedAt?: Date
  responseTime?: number
  rejectionReason?: string
  autoAccepted: boolean
  successful: boolean
  customerSatisfaction?: number
  createdAt: Date
  updatedAt: Date
}

export interface ReassignmentQueue {
  id: string
  orderId?: string
  rideId?: string
  assignmentType: string
  priority: number
  attempt: number
  maxAttempts: number
  originalDriverId?: string
  originalRejectionReason?: string
  status: string
  processedAt?: Date
  completedAt?: Date
  escalationLevel: number
  escalatedAt?: Date
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface SystemPerformanceMetrics {
  id: string
  timestamp: Date
  totalAssignments: number
  successfulAssignments: number
  failedAssignments: number
  avgMatchingTime: number
  totalActiveDrivers: number
  totalAvailableDrivers: number
  avgDriverUtilization: number
  avgResponseTime: number
  avgAcceptanceRate: number
  avgCustomerRating: number
  avgWaitTime: number
  systemLoad: number
  databaseResponseTime: number
  apiResponseTime: number
  createdAt: Date
}

// Matching Service Types
export interface MatchingLocation {
  latitude: number
  longitude: number
  address?: string
}

export interface MatchingRequest {
  id: string
  type: 'ORDER' | 'RIDE'
  pickupLocation: MatchingLocation
  destinationLocation?: MatchingLocation
  serviceType: ServiceType
  estimatedValue?: number
  priority?: number
  preferredDriverId?: string
  requirements?: {
    vehicleType?: string
    minRating?: number
    maxDistance?: number
    specialRequirements?: string[]
  }
  scheduledFor?: Date
  customerPreferences?: {
    allowShared?: boolean
    preferredGender?: string
    accessibilityNeeds?: string[]
  }
}

export interface DriverMatch {
  driverId: string
  distance: number
  eta: number
  totalScore: number
  scores: {
    distance: number
    rating: number
    completionRate: number
    responseTime: number
    availability: number
  }
  driver: {
    id: string
    rating: number
    totalDeliveries: number
    totalRides: number
    vehicleType: string
    currentLatitude: number
    currentLongitude: number
    user: {
      name: string
      phone: string
    }
  }
  isAvailable: boolean
  batteryLevel?: number
  connectionStrength?: number
}

export interface MatchingResult {
  success: boolean
  matches: DriverMatch[]
  assignmentId?: string
  estimatedWaitTime?: number
  error?: string
  algorithm: {
    type: MatchingAlgorithmType
    version: string
    processingTime: number
  }
}

export interface ReassignmentOptions {
  originalDriverId: string
  rejectionReason?: string
  escalationLevel?: number
  expandRadius?: boolean
  increasePriority?: boolean
}

export interface MatchingStatistics {
  totalAssignments: number
  successfulAssignments: number
  failedAssignments: number
  successRate: number
  avgResponseTime: number
  acceptanceRate: number
  assignments: MatchingAssignment[]
}

export interface DriverAvailabilityUpdate {
  driverId: string
  status: DriverAvailabilityStatusType
  reason?: string
  location?: {
    latitude: number
    longitude: number
  }
  batteryLevel?: number
  connectionStrength?: number
  appVersion?: string
  metadata?: any
}

export interface DriverScores {
  distance: number
  rating: number
  completionRate: number
  responseTime: number
  availability: number
}

export interface AssignmentResponse {
  assignmentId: string
  driverId: string
  response: 'ACCEPTED' | 'REJECTED'
  rejectionReason?: string
  responseTime?: number
  autoAccepted?: boolean
}
