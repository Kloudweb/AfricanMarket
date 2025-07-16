
import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create test admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      password: await bcrypt.hash("johndoe123", 10),
      name: "John Doe",
      role: UserRole.ADMIN,
      isVerified: true,
      phone: "+1-709-555-0001"
    }
  })

  // Create sample customer
  const customer = await prisma.user.upsert({
    where: { email: "alice@customer.com" },
    update: {},
    create: {
      email: "alice@customer.com",
      password: await bcrypt.hash("password123", 10),
      name: "Alice Johnson",
      role: UserRole.CUSTOMER,
      isVerified: true,
      phone: "+1-709-555-0002"
    }
  })

  // Create sample vendor user
  const vendorUser = await prisma.user.upsert({
    where: { email: "mama@kitchen.com" },
    update: {},
    create: {
      email: "mama@kitchen.com",
      password: await bcrypt.hash("password123", 10),
      name: "Mama Adunni",
      role: UserRole.VENDOR,
      isVerified: true,
      phone: "+1-709-555-0004"
    }
  })

  // Create vendor profile
  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Mama's Kitchen",
      businessType: "Nigerian Restaurant",
      description: "Authentic Nigerian cuisine made with love",
      address: "123 Water Street",
      city: "St. John's",
      province: "Newfoundland and Labrador",
      postalCode: "A1B 2C3",
      phone: "+1-709-555-0004",
      verificationStatus: VerificationStatus.VERIFIED,
      rating: 4.8,
      totalReviews: 127
    }
  })

  // Create sample products
  await prisma.product.create({
    data: {
      vendorId: vendor.id,
      name: "Jollof Rice",
      description: "Fragrant rice cooked with tomatoes and spices",
      price: 18.99,
      category: "Main Course",
      ingredients: "Rice, tomatoes, onions, chicken, spices",
      isSpicy: true,
      prepTime: 25
    }
  })

  await prisma.product.create({
    data: {
      vendorId: vendor.id,
      name: "Suya Platter",
      description: "Grilled skewered meat with spicy suya spice",
      price: 16.99,
      category: "Appetizer",
      ingredients: "Beef, suya spice, onions, tomatoes",
      isSpicy: true,
      prepTime: 20
    }
  })

  // Create sample driver
  const driverUser = await prisma.user.upsert({
    where: { email: "driver1@africanmarket.com" },
    update: {},
    create: {
      email: "driver1@africanmarket.com",
      password: await bcrypt.hash("password123", 10),
      name: "Samuel Okafor",
      role: UserRole.DRIVER,
      isVerified: true,
      phone: "+1-709-555-0007"
    }
  })

  // Create driver profile
  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      serviceTypes: ["RIDESHARE", "DELIVERY"],
      isAvailable: true,
      currentLatitude: 47.5615,
      currentLongitude: -52.7126,
    },
    create: {
      userId: driverUser.id,
      licenseNumber: "NL123456789",
      vehicleType: "Sedan",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: 2020,
      vehicleColor: "Blue",
      vehiclePlate: "ABC 123",
      verificationStatus: VerificationStatus.VERIFIED,
      rating: 4.7,
      totalReviews: 89,
      totalDeliveries: 245,
      totalRides: 156,
      isAvailable: true,
      currentLatitude: 47.5615,
      currentLongitude: -52.7126,
      serviceTypes: ["RIDESHARE", "DELIVERY"]
    }
  })

  // Create another driver
  const driverUser2 = await prisma.user.upsert({
    where: { email: "driver2@africanmarket.com" },
    update: {},
    create: {
      email: "driver2@africanmarket.com",
      password: await bcrypt.hash("password123", 10),
      name: "Grace Mensah",
      role: UserRole.DRIVER,
      isVerified: true,
      phone: "+1-709-555-0008"
    }
  })

  const driver2 = await prisma.driver.upsert({
    where: { userId: driverUser2.id },
    update: {
      serviceTypes: ["RIDESHARE", "DELIVERY"],
      isAvailable: true,
      currentLatitude: 47.5744,
      currentLongitude: -52.7285,
    },
    create: {
      userId: driverUser2.id,
      licenseNumber: "NL987654321",
      vehicleType: "SUV",
      vehicleMake: "Honda",
      vehicleModel: "CR-V",
      vehicleYear: 2021,
      vehicleColor: "Red",
      vehiclePlate: "XYZ 789",
      verificationStatus: VerificationStatus.VERIFIED,
      rating: 4.9,
      totalReviews: 112,
      totalDeliveries: 189,
      totalRides: 203,
      isAvailable: true,
      currentLatitude: 47.5744,
      currentLongitude: -52.7285,
      serviceTypes: ["RIDESHARE", "DELIVERY"]
    }
  })

  // Seed rideshare data
  console.log("🚗 Seeding rideshare data...")

  // Create ride types
  const rideTypes = [
    {
      name: 'STANDARD',
      displayName: 'Standard',
      description: 'Comfortable ride for up to 4 passengers',
      icon: '🚗',
      baseFare: 3.99,
      perKmRate: 2.50,
      perMinuteRate: 0.35,
      minimumFare: 6.99,
      maximumFare: 150.00,
      capacity: 4,
      isActive: true,
      vehicleTypes: ['SEDAN', 'COMPACT', 'SUV'],
      minYear: 2010,
      features: ['AIR_CONDITIONING', 'BLUETOOTH'],
      surgePricing: true,
      maxSurge: 3.0,
      availableHours: {
        MONDAY: { start: '06:00', end: '23:00', available: true },
        TUESDAY: { start: '06:00', end: '23:00', available: true },
        WEDNESDAY: { start: '06:00', end: '23:00', available: true },
        THURSDAY: { start: '06:00', end: '23:00', available: true },
        FRIDAY: { start: '06:00', end: '23:00', available: true },
        SATURDAY: { start: '06:00', end: '23:00', available: true },
        SUNDAY: { start: '08:00', end: '22:00', available: true },
      },
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    },
    {
      name: 'PREMIUM',
      displayName: 'Premium',
      description: 'Higher-end vehicles with extra comfort and amenities',
      icon: '👑',
      baseFare: 4.99,
      perKmRate: 3.50,
      perMinuteRate: 0.50,
      minimumFare: 8.99,
      maximumFare: 200.00,
      capacity: 4,
      isActive: true,
      vehicleTypes: ['LUXURY', 'SUV'],
      minYear: 2015,
      features: ['AIR_CONDITIONING', 'LEATHER_SEATS', 'WIFI', 'WATER_BOTTLES'],
      surgePricing: true,
      maxSurge: 2.5,
      availableHours: {
        MONDAY: { start: '06:00', end: '23:00', available: true },
        TUESDAY: { start: '06:00', end: '23:00', available: true },
        WEDNESDAY: { start: '06:00', end: '23:00', available: true },
        THURSDAY: { start: '06:00', end: '23:00', available: true },
        FRIDAY: { start: '06:00', end: '23:00', available: true },
        SATURDAY: { start: '06:00', end: '23:00', available: true },
        SUNDAY: { start: '08:00', end: '22:00', available: true },
      },
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    },
    {
      name: 'SHARED',
      displayName: 'Shared',
      description: 'Share your ride with others going the same direction',
      icon: '👥',
      baseFare: 2.99,
      perKmRate: 1.50,
      perMinuteRate: 0.25,
      minimumFare: 4.99,
      maximumFare: 75.00,
      capacity: 4,
      isActive: true,
      vehicleTypes: ['SEDAN', 'COMPACT', 'SUV'],
      minYear: 2010,
      features: ['AIR_CONDITIONING'],
      surgePricing: false,
      maxSurge: 1.0,
      availableHours: {
        MONDAY: { start: '06:00', end: '23:00', available: true },
        TUESDAY: { start: '06:00', end: '23:00', available: true },
        WEDNESDAY: { start: '06:00', end: '23:00', available: true },
        THURSDAY: { start: '06:00', end: '23:00', available: true },
        FRIDAY: { start: '06:00', end: '23:00', available: true },
        SATURDAY: { start: '06:00', end: '23:00', available: true },
        SUNDAY: { start: '08:00', end: '22:00', available: true },
      },
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    },
  ]

  console.log('📝 Creating ride types...')
  for (const rideType of rideTypes) {
    await prisma.rideType.upsert({
      where: { name: rideType.name },
      update: rideType,
      create: rideType,
    })
  }

  // Create driver preferences
  console.log('🚗 Setting up driver preferences...')
  await prisma.driverPreference.upsert({
    where: { driverId: driver.id },
    update: {
      maxDistance: 15,
      rideTypes: ['STANDARD', 'PREMIUM'],
    },
    create: {
      driverId: driver.id,
      maxDistance: 15,
      rideTypes: ['STANDARD', 'PREMIUM'],
      workingHours: {
        MONDAY: { start: '06:00', end: '22:00', isWorking: true },
        TUESDAY: { start: '06:00', end: '22:00', isWorking: true },
        WEDNESDAY: { start: '06:00', end: '22:00', isWorking: true },
        THURSDAY: { start: '06:00', end: '22:00', isWorking: true },
        FRIDAY: { start: '06:00', end: '23:00', isWorking: true },
        SATURDAY: { start: '08:00', end: '23:00', isWorking: true },
        SUNDAY: { start: '10:00', end: '20:00', isWorking: false },
      },
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      minRating: 3.0,
      allowPets: false,
      allowSmoking: false,
      allowFood: true,
      soundEnabled: true,
      vibrationEnabled: true,
      autoAcceptEnabled: false,
      autoAcceptDistance: 5,
    }
  })

  await prisma.driverPreference.upsert({
    where: { driverId: driver2.id },
    update: {
      maxDistance: 20,
      rideTypes: ['STANDARD', 'PREMIUM', 'SHARED'],
    },
    create: {
      driverId: driver2.id,
      maxDistance: 20,
      rideTypes: ['STANDARD', 'PREMIUM', 'SHARED'],
      workingHours: {
        MONDAY: { start: '07:00', end: '21:00', isWorking: true },
        TUESDAY: { start: '07:00', end: '21:00', isWorking: true },
        WEDNESDAY: { start: '07:00', end: '21:00', isWorking: true },
        THURSDAY: { start: '07:00', end: '21:00', isWorking: true },
        FRIDAY: { start: '07:00', end: '23:00', isWorking: true },
        SATURDAY: { start: '09:00', end: '23:00', isWorking: true },
        SUNDAY: { start: '10:00', end: '20:00', isWorking: true },
      },
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      minRating: 2.5,
      allowPets: true,
      allowSmoking: false,
      allowFood: true,
      soundEnabled: true,
      vibrationEnabled: true,
      autoAcceptEnabled: false,
      autoAcceptDistance: 8,
    }
  })

  // Add current driver locations (remove existing recent ones first)
  console.log('📍 Setting up driver locations...')
  
  // Remove recent locations for these drivers to avoid duplicates
  await prisma.driverLocation.deleteMany({
    where: {
      OR: [
        { driverId: driver.id },
        { driverId: driver2.id }
      ],
      timestamp: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    }
  })

  await prisma.driverLocation.create({
    data: {
      driverId: driver.id,
      latitude: 47.5615,
      longitude: -52.7126,
      heading: 45,
      speed: 0,
      accuracy: 5,
      timestamp: new Date(),
      isOnline: true,
      isDelivering: false,
      batteryLevel: 85,
      appVersion: '1.0.0',
    }
  })

  await prisma.driverLocation.create({
    data: {
      driverId: driver2.id,
      latitude: 47.5744,
      longitude: -52.7285,
      heading: 180,
      speed: 0,
      accuracy: 5,
      timestamp: new Date(),
      isOnline: true,
      isDelivering: false,
      batteryLevel: 92,
      appVersion: '1.0.0',
    }
  })

  console.log("✅ Database seeded successfully!")
  console.log("🔐 Admin login: john@doe.com / johndoe123")
  console.log("👥 Sample users created with password: password123")
  console.log("🏪 1 vendor created with sample products")
  console.log("🚗 2 drivers created and available for rideshare")
  console.log("🚗 3 ride types created (Standard, Premium, Shared)")
  console.log("📍 Driver preferences and locations configured")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
