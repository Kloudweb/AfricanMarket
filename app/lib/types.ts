

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
  AssignmentStatus,
  PaymentProvider,
  WalletType,
  PaymentMethodType,
  AdminPermissionLevel,
  DisputeStatus,
  DisputeType,
  DisputeCategory,
  CampaignStatus,
  CampaignType,
  SystemSettingType,
  ComplianceActionType,
  RevenueReportType,
  SystemHealthStatus,
  BulkOperationType,
  PayoutStatus,
  PayoutFrequency,
  CallType,
  CallStatus,
  MessageType,
  TripStatus,
  TransactionType,
  RefundStatus,
  SafetyAlertType,
  IncidentType,
  TripShareStatus
} from "@prisma/client"

// Define missing enums that should be in the schema
export enum DriverAvailabilityStatusType {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  ON_BREAK = 'ON_BREAK',
  BREAK = 'BREAK',
  EMERGENCY = 'EMERGENCY',
  MAINTENANCE = 'MAINTENANCE'
}

export enum ServiceType {
  DELIVERY = 'DELIVERY',
  FOOD_DELIVERY = 'FOOD_DELIVERY',
  RIDESHARE = 'RIDESHARE',
  BOTH = 'BOTH'
}

export enum MatchingAlgorithmType {
  NEAREST_FIRST = 'NEAREST_FIRST',
  BALANCED = 'BALANCED',
  PRIORITY_BASED = 'PRIORITY_BASED',
  PROXIMITY_BASED = 'PROXIMITY_BASED',
  PERFORMANCE_BASED = 'PERFORMANCE_BASED',
  HYBRID = 'HYBRID',
  MACHINE_LEARNING = 'MACHINE_LEARNING'
}

// Re-export for components
export { 
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
  AssignmentStatus, 
  PaymentProvider,
  WalletType,
  PaymentMethodType,
  AdminPermissionLevel,
  DisputeStatus,
  DisputeType,
  DisputeCategory,
  CampaignStatus,
  CampaignType,
  SystemSettingType,
  ComplianceActionType,
  RevenueReportType,
  SystemHealthStatus,
  BulkOperationType,
  PayoutStatus,
  PayoutFrequency,
  CallType,
  CallStatus,
  MessageType,
  TripStatus,
  TransactionType,
  RefundStatus,
  SafetyAlertType,
  IncidentType,
  TripShareStatus
} from "@prisma/client"



// Additional type exports for compatibility - already exported above

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

// ============================================================================
// COMPREHENSIVE REAL-TIME INFRASTRUCTURE TYPES
// ============================================================================

// WebSocket Connection Management
export interface WebSocketConnection {
  id: string
  userId: string
  socketId: string
  userAgent?: string
  ipAddress?: string
  connectedAt: Date
  lastActivity: Date
  disconnectedAt?: Date
  isActive: boolean
  
  // Connection metadata
  platform?: string
  appVersion?: string
  deviceId?: string
  deviceType?: string
  
  // Real-time rooms
  rooms: string[]
  
  // Performance metrics
  latency?: number
  packetsReceived: number
  packetsSent: number
  
  createdAt: Date
  updatedAt: Date
}

// Real-time Event Management
export interface RealTimeEvent {
  id: string
  eventType: string
  eventData: any
  targetUserId?: string
  targetRole?: string
  roomId?: string
  
  // Event metadata
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  customerId?: string
  
  // Broadcasting
  broadcast: boolean
  priority: string
  
  // Delivery tracking
  sent: boolean
  sentAt?: Date
  delivered: boolean
  deliveredAt?: Date
  failed: boolean
  failureReason?: string
  retryCount: number
  maxRetries: number
  
  // Scheduling
  scheduleFor?: Date
  expiresAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

// Device Token Management
export interface DeviceToken {
  id: string
  userId: string
  token: string
  platform: string
  deviceId?: string
  deviceName?: string
  appVersion?: string
  osVersion?: string
  
  // Token status
  isActive: boolean
  lastUsed: Date
  expiresAt?: Date
  
  // Notification preferences
  enabled: boolean
  categories: string[]
  
  // Metadata
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

// Enhanced Push Notification System
export interface PushNotificationQueue {
  id: string
  userId: string
  title: string
  body: string
  data?: any
  
  // Targeting
  deviceTokens: string[]
  platforms: string[]
  
  // Notification options
  badge?: number
  sound?: string
  category?: string
  icon?: string
  image?: string
  clickAction?: string
  
  // Delivery tracking
  status: string
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  failureReason?: string
  
  // Analytics
  clicked: boolean
  clickedAt?: Date
  dismissed: boolean
  dismissedAt?: Date
  
  // Scheduling
  scheduleFor?: Date
  expiresAt?: Date
  
  // Retry logic
  retryCount: number
  maxRetries: number
  nextRetryAt?: Date
  
  // Metadata
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  metadata?: any
  
  createdAt: Date
  updatedAt: Date
}

// SMS Notification System
export interface SmsNotification {
  id: string
  userId?: string
  phoneNumber: string
  message: string
  type: string
  
  // SMS metadata
  countryCode?: string
  carrier?: string
  messageId?: string
  
  // Delivery tracking
  status: string
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  failureReason?: string
  
  // Cost tracking
  cost?: number
  segments?: number
  
  // Scheduling
  scheduleFor?: Date
  expiresAt?: Date
  
  // Retry logic
  retryCount: number
  maxRetries: number
  nextRetryAt?: Date
  
  // Metadata
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  metadata?: any
  
  createdAt: Date
  updatedAt: Date
}

// Email Notification System
export interface EmailNotification {
  id: string
  userId?: string
  email: string
  subject: string
  body: string
  template?: string
  
  // Email metadata
  fromEmail?: string
  fromName?: string
  replyTo?: string
  attachments: string[]
  
  // Delivery tracking
  status: string
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  failedAt?: Date
  failureReason?: string
  
  // Email provider data
  messageId?: string
  provider?: string
  
  // Analytics
  openCount: number
  clickCount: number
  
  // Scheduling
  scheduleFor?: Date
  expiresAt?: Date
  
  // Retry logic
  retryCount: number
  maxRetries: number
  nextRetryAt?: Date
  
  // Metadata
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  metadata?: any
  
  createdAt: Date
  updatedAt: Date
}

// In-App Notification Center
export interface InAppNotification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  category?: string
  
  // Notification data
  data?: any
  imageUrl?: string
  iconUrl?: string
  actionUrl?: string
  actionText?: string
  
  // Status tracking
  isRead: boolean
  readAt?: Date
  isStarred: boolean
  starredAt?: Date
  isArchived: boolean
  archivedAt?: Date
  
  // Priority and urgency
  priority: string
  urgent: boolean
  
  // Expiration
  expiresAt?: Date
  
  // Metadata
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  metadata?: any
  
  createdAt: Date
  updatedAt: Date
}

// Notification Preferences Management
export interface NotificationChannel {
  id: string
  userId: string
  
  // Channel preferences
  pushEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  
  // Category preferences
  orderUpdates: boolean
  rideUpdates: boolean
  paymentUpdates: boolean
  marketingUpdates: boolean
  systemUpdates: boolean
  
  // Timing preferences
  quietHours: boolean
  quietStart?: string
  quietEnd?: string
  timezone?: string
  
  // Frequency preferences
  realTime: boolean
  digest: boolean
  digestFrequency?: string
  digestTime?: string
  
  // Advanced preferences
  priority: string
  languages: string[]
  
  createdAt: Date
  updatedAt: Date
}

// Real-time Order Status Updates
export interface OrderStatusUpdate {
  id: string
  orderId: string
  previousStatus?: OrderStatus
  newStatus: OrderStatus
  message?: string
  
  // Update source
  updatedBy?: string
  updatedByRole?: string
  source?: string
  
  // Location data
  latitude?: number
  longitude?: number
  address?: string
  
  // Timing data
  estimatedTime?: Date
  actualTime?: Date
  
  // Metadata
  notes?: string
  photos: string[]
  metadata?: any
  
  // Broadcasting
  broadcast: boolean
  broadcastAt?: Date
  
  createdAt: Date
}

// Real-time Driver Location Tracking
export interface DriverLocationUpdate {
  id: string
  driverId: string
  latitude: number
  longitude: number
  accuracy?: number
  heading?: number
  speed?: number
  altitude?: number
  
  // Driver status
  isOnline: boolean
  isDelivering: boolean
  isRiding: boolean
  
  // Current assignments
  currentOrderId?: string
  currentRideId?: string
  
  // Device info
  deviceId?: string
  batteryLevel?: number
  
  // Location metadata
  address?: string
  city?: string
  province?: string
  postalCode?: string
  
  // Geofence data
  geofences: string[]
  
  // Broadcasting
  broadcast: boolean
  broadcastAt?: Date
  
  timestamp: Date
}

// Real-time Chat System
export interface ChatRoom {
  id: string
  type: string
  participants: string[]
  
  // Room metadata
  name?: string
  description?: string
  avatarUrl?: string
  
  // Associated records
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  
  // Room settings
  isActive: boolean
  isPrivate: boolean
  allowMessages: boolean
  allowMedia: boolean
  
  // Room statistics
  messageCount: number
  lastMessageAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

export interface ChatRoomMessage {
  id: string
  roomId: string
  senderId: string
  message?: string
  messageType: string
  
  // Message data
  data?: any
  mediaUrl?: string
  mediaType?: string
  mediaSize?: number
  
  // Message status
  isRead: boolean
  readAt?: Date
  isEdited: boolean
  editedAt?: Date
  isDeleted: boolean
  deletedAt?: Date
  
  // Reply functionality
  replyToId?: string
  
  // Metadata
  metadata?: any
  
  createdAt: Date
  updatedAt: Date
}

// Real-time Analytics Events
export interface AnalyticsEvent {
  id: string
  userId?: string
  sessionId?: string
  
  // Event data
  eventType: string
  eventCategory?: string
  eventAction?: string
  eventLabel?: string
  eventValue?: number
  
  // Page/screen data
  pageUrl?: string
  pageTitle?: string
  referrer?: string
  
  // Device/browser data
  userAgent?: string
  ipAddress?: string
  deviceType?: string
  platform?: string
  
  // Location data
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  
  // Custom dimensions
  customData?: any
  
  // Metadata
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
  
  timestamp: Date
}

// System Health and Monitoring
export interface SystemHealth {
  id: string
  component: string
  status: string
  
  // Performance metrics
  responseTime?: number
  uptime?: number
  errorRate?: number
  
  // Resource usage
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
  
  // Service specific metrics
  activeConnections?: number
  messagesSent?: number
  messagesQueued?: number
  
  // Metadata
  details?: any
  
  timestamp: Date
}

// Message Queue for Reliable Delivery
export interface MessageQueue {
  id: string
  queueName: string
  messageType: string
  payload: any
  
  // Queue management
  status: string
  priority: number
  maxRetries: number
  retryCount: number
  
  // Timing
  processAt: Date
  processedAt?: Date
  completedAt?: Date
  failedAt?: Date
  
  // Error handling
  error?: string
  errorDetails?: any
  
  // Metadata
  metadata?: any
  
  createdAt: Date
  updatedAt: Date
}

// Real-time Inventory Updates
export interface InventoryUpdate {
  id: string
  productId: string
  vendorId: string
  
  // Stock changes
  previousStock: number
  newStock: number
  changeAmount: number
  changeType: string
  
  // Update source
  orderId?: string
  userId?: string
  source?: string
  
  // Broadcasting
  broadcast: boolean
  broadcastAt?: Date
  
  // Metadata
  notes?: string
  metadata?: any
  
  createdAt: Date
}

// Real-time Pricing Updates
export interface PricingUpdate {
  id: string
  productId: string
  vendorId: string
  
  // Price changes
  previousPrice: number
  newPrice: number
  changeAmount: number
  changePercent: number
  
  // Update source
  userId?: string
  source?: string
  reason?: string
  
  // Timing
  effectiveFrom: Date
  effectiveUntil?: Date
  
  // Broadcasting
  broadcast: boolean
  broadcastAt?: Date
  
  // Metadata
  notes?: string
  metadata?: any
  
  createdAt: Date
}

// Real-time Notification Types
export interface NotificationPayload {
  userId: string
  title: string
  body: string
  type: string
  data?: any
  urgent?: boolean
  orderId?: string
  rideId?: string
  vendorId?: string
  driverId?: string
}

export interface FCMNotificationPayload {
  token: string
  notification: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  android?: {
    priority?: 'normal' | 'high'
    notification?: {
      icon?: string
      color?: string
      sound?: string
      tag?: string
      click_action?: string
    }
  }
  apns?: {
    payload?: {
      aps?: {
        alert?: {
          title?: string
          body?: string
        }
        badge?: number
        sound?: string
        category?: string
        'content-available'?: number
      }
    }
  }
  webpush?: {
    headers?: Record<string, string>
    data?: Record<string, string>
    notification?: {
      title?: string
      body?: string
      icon?: string
      badge?: string
      image?: string
      vibrate?: number[]
      timestamp?: number
      actions?: Array<{
        action: string
        title: string
        icon?: string
      }>
    }
  }
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string
  data: any
  timestamp: Date
  userId?: string
  roomId?: string
  priority?: string
}

// Real-time Connection Stats
export interface ConnectionStats {
  totalConnections: number
  uniqueUsers: number
  activeRooms: number
  connectedUsers: string[]
  activeRoomIds: string[]
  userConnections: Array<{
    userId: string
    connectionCount: number
    lastActivity: number
  }>
}

// Real-time Event Handlers
export interface EventHandler {
  event: string
  handler: (data: any, socket: any) => void
  middleware?: ((socket: any, next: (err?: Error) => void) => void)[]
}

// Real-time Service Configuration
export interface RealTimeConfig {
  port: number
  cors: {
    origin: string[]
    methods: string[]
    credentials: boolean
  }
  rateLimiting: {
    windowMs: number
    maxRequests: number
  }
  heartbeat: {
    interval: number
    timeout: number
  }
  rooms: {
    maxSize: number
    cleanupInterval: number
  }
}

// Notification Template Types
export interface NotificationTemplate {
  id: string
  name: string
  type: string
  category: string
  subject?: string
  body: string
  variables: string[]
  channels: string[]
  isActive: boolean
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

// Notification Delivery Status
export interface DeliveryStatus {
  channel: string
  status: string
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  failureReason?: string
  retryCount: number
  cost?: number
}

// Admin-specific interfaces
export interface AdminPermission {
  id: string
  userId: string
  level: AdminPermissionLevel
  permissions: string[]
  canManageUsers: boolean
  canManageOrders: boolean
  canManageVendors: boolean
  canManageDrivers: boolean
  canViewReports: boolean
  canManageSettings: boolean
  canManageDisputes: boolean
  canAccessFinancials: boolean
  canManageCampaigns: boolean
  canViewAuditLogs: boolean
  canBulkOperations: boolean
  canSystemHealth: boolean
  ipWhitelist: string[]
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  user: User
}

export interface AdminAuditLog {
  id: string
  userId: string
  action: string
  resource?: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  description?: string
  ipAddress?: string
  userAgent?: string
  method?: string
  endpoint?: string
  statusCode?: number
  duration?: number
  metadata?: any
  timestamp: Date
  user: User
}

export interface AdminSession {
  id: string
  userId: string
  sessionToken: string
  ipAddress: string
  userAgent?: string
  location?: string
  device?: string
  browser?: string
  isActive: boolean
  lastActivity: Date
  expiresAt: Date
  createdAt: Date
  user: User
}

export interface Dispute {
  id: string
  disputeNumber: string
  type: DisputeType
  category: DisputeCategory
  status: DisputeStatus
  priority: number
  subject: string
  description: string
  evidence: string[]
  metadata?: any
  
  // Involved parties
  customerId?: string
  vendorId?: string
  driverId?: string
  orderId?: string
  rideId?: string
  
  // Resolution details
  resolution?: string
  resolutionNotes?: string
  refundAmount?: number
  compensationAmount?: number
  
  // Tracking
  reportedAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  escalatedAt?: Date
  
  // Assignment
  assignedTo?: string
  assignedAt?: Date
  
  createdAt: Date
  updatedAt: Date
  
  // Relations
  customer?: User
  vendor?: Vendor
  driver?: Driver
  order?: Order
  ride?: Ride
  assignee?: User
  reviews: DisputeReview[]
}

export interface DisputeReview {
  id: string
  disputeId: string
  reviewerId: string
  action: string
  comment?: string
  evidence: string[]
  internalNotes?: string
  timeSpent?: number
  createdAt: Date
  dispute: Dispute
  reviewer: User
}

export interface SystemSetting {
  id: string
  key: string
  value?: string
  type: SystemSettingType
  category: string
  description?: string
  isPublic: boolean
  isEditable: boolean
  validationRules?: any
  metadata?: any
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  creator?: User
  updater?: User
}

export interface PromotionalCampaign {
  id: string
  name: string
  description?: string
  type: CampaignType
  status: CampaignStatus
  
  // Discount details
  discountType?: string
  discountValue?: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number
  
  // Targeting
  targetAudience: string[]
  targetUserRoles: UserRole[]
  targetLocations: string[]
  targetVendors: string[]
  targetProducts: string[]
  
  // Scheduling
  scheduledStart?: Date
  scheduledEnd?: Date
  actualStart?: Date
  actualEnd?: Date
  
  // Usage limits
  totalUsageLimit?: number
  perUserUsageLimit?: number
  currentUsageCount: number
  
  // Budget
  budget?: number
  currentSpend: number
  costPerUsage?: number
  
  // Analytics
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  
  // Auto-generated promo code
  promoCode?: string
  
  // Metadata
  metadata?: any
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
  creator: User
  updater?: User
}

export interface RevenueReport {
  id: string
  type: RevenueReportType
  period: string
  startDate: Date
  endDate: Date
  
  // Revenue breakdown
  totalRevenue: number
  orderRevenue: number
  deliveryRevenue: number
  rideRevenue: number
  
  // Commission breakdown
  vendorCommission: number
  driverCommission: number
  platformRevenue: number
  
  // Volume metrics
  totalOrders: number
  totalRides: number
  totalUsers: number
  activeVendors: number
  activeDrivers: number
  
  // Performance metrics
  avgOrderValue: number
  avgRideValue: number
  customerRetention: number
  
  // Costs
  operatingCosts: number
  marketingCosts: number
  paymentFees: number
  refunds: number
  
  // Profit
  grossProfit: number
  netProfit: number
  profitMargin: number
  
  // Detailed data
  data?: any
  metadata?: any
  
  generatedAt: Date
  generatedBy: string
  generator: User
}

export interface ComplianceAction {
  id: string
  type: ComplianceActionType
  targetType: string
  targetId: string
  reason: string
  description?: string
  severity: string
  evidence: string[]
  
  // Action details
  actionTaken?: string
  effectiveDate?: Date
  expirationDate?: Date
  
  // Financial impact
  fineAmount?: number
  refundAmount?: number
  
  // Follow-up
  followUpRequired: boolean
  followUpDate?: Date
  followUpNotes?: string
  
  // Status
  isActive: boolean
  isAppealed: boolean
  appealNotes?: string
  
  // Metadata
  metadata?: any
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
  creator: User
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  type: string
  priority: string
  category: string
  
  // Targeting
  targetRoles: AdminPermissionLevel[]
  targetUsers: string[]
  
  // Status
  isRead: boolean
  isArchived: boolean
  expiresAt?: Date
  
  // Actions
  actionRequired: boolean
  actionUrl?: string
  actionLabel?: string
  
  // Metadata
  metadata?: any
  createdAt: Date
  readAt?: Date
}

export interface BulkOperation {
  id: string
  type: BulkOperationType
  name: string
  description?: string
  
  // Target data
  targetType: string
  targetCriteria?: any
  targetIds: string[]
  
  // Operation details
  operation: string
  operationData?: any
  
  // Status
  status: string
  progress: number
  totalRecords: number
  processedRecords: number
  successCount: number
  errorCount: number
  
  // Results
  results?: any
  errors?: any
  summary?: string
  
  // Scheduling
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  
  // Metadata
  metadata?: any
  createdAt: Date
  createdBy: string
  creator: User
}

export interface SystemHealth {
  id: string
  service: string
  status: SystemHealthStatus
  
  // Metrics
  responseTime?: number
  errorRate?: number
  uptime?: number
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
  
  // Details
  message?: string
  details?: any
  metadata?: any
  
  // Alerting
  alertSent: boolean
  alertSentAt?: Date
  resolvedAt?: Date
  
  timestamp: Date
}

export interface CommissionStructure {
  id: string
  name: string
  description?: string
  
  // Applicability
  serviceType: string
  entityType: string
  entityId?: string
  
  // Commission rates
  baseRate: number
  tieredRates?: any
  
  // Conditions
  minimumOrder?: number
  maximumOrder?: number
  timeBasedRates?: any
  locationRates?: any
  
  // Validity
  isActive: boolean
  validFrom: Date
  validUntil?: Date
  
  // Metadata
  metadata?: any
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
  creator: User
}

// Admin dashboard specific types
export interface AdminDashboardStats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  totalDisputes: number
  recentActivity: AdminAuditLog[]
  systemHealth: SystemHealth[]
  pendingReviews: number
  activeAlerts: number
}

export interface AdminUserFilters {
  role?: UserRole
  isActive?: boolean
  isVerified?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  searchTerm?: string
}

export interface AdminOrderFilters {
  status?: OrderStatus
  vendorId?: string
  driverId?: string
  dateRange?: {
    start: Date
    end: Date
  }
  searchTerm?: string
}

export interface AdminDisputeFilters {
  status?: DisputeStatus
  type?: DisputeType
  category?: DisputeCategory
  assignedTo?: string
  dateRange?: {
    start: Date
    end: Date
  }
  searchTerm?: string
}

export interface AdminRevenueFilters {
  type?: RevenueReportType
  period?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface AdminCampaignFilters {
  status?: CampaignStatus
  type?: CampaignType
  dateRange?: {
    start: Date
    end: Date
  }
  searchTerm?: string
}
