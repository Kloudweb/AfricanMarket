
import NextAuth from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
    avatar?: string
    isVerified: boolean
    vendorProfile?: any
    driverProfile?: any
  }

  interface Session {
    user: User & {
      id: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    avatar?: string
    isVerified: boolean
    vendorProfile?: any
    driverProfile?: any
  }
}
