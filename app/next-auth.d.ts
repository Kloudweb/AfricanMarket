
import NextAuth from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
    avatar?: string
    isVerified: boolean
    emailVerified: boolean
    phoneVerified: boolean
    kycVerified: boolean
    profileCompleted: boolean
    vendorProfile?: any
    driverProfile?: any
  }

  interface Session {
    user: User & {
      id: string
      provider?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    avatar?: string
    isVerified: boolean
    emailVerified: boolean
    phoneVerified: boolean
    kycVerified: boolean
    profileCompleted: boolean
    vendorProfile?: any
    driverProfile?: any
    provider?: string
  }
}
