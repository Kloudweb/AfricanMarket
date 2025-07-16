
import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create test admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "john@doe.com",
      password: await bcrypt.hash("johndoe123", 10),
      name: "John Doe",
      role: UserRole.ADMIN,
      isVerified: true,
      phone: "+1-709-555-0001"
    }
  })

  // Create sample customer
  const customer = await prisma.user.create({
    data: {
      email: "alice@customer.com",
      password: await bcrypt.hash("password123", 10),
      name: "Alice Johnson",
      role: UserRole.CUSTOMER,
      isVerified: true,
      phone: "+1-709-555-0002"
    }
  })

  // Create sample vendor user
  const vendorUser = await prisma.user.create({
    data: {
      email: "mama@kitchen.com",
      password: await bcrypt.hash("password123", 10),
      name: "Mama Adunni",
      role: UserRole.VENDOR,
      isVerified: true,
      phone: "+1-709-555-0004"
    }
  })

  // Create vendor profile
  const vendor = await prisma.vendor.create({
    data: {
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
  const driverUser = await prisma.user.create({
    data: {
      email: "driver1@africanmarket.com",
      password: await bcrypt.hash("password123", 10),
      name: "Samuel Okafor",
      role: UserRole.DRIVER,
      isVerified: true,
      phone: "+1-709-555-0007"
    }
  })

  // Create driver profile
  await prisma.driver.create({
    data: {
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
      currentLongitude: -52.7126
    }
  })

  console.log("✅ Database seeded successfully!")
  console.log("🔐 Admin login: john@doe.com / johndoe123")
  console.log("👥 Sample users created with password: password123")
  console.log("🏪 1 vendor created with sample products")
  console.log("🚗 1 driver created and available")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
