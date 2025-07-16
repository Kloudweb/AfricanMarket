
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { AuthUtils } from "./auth-utils"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const ipAddress = AuthUtils.getIPAddress(req)
        const userAgent = AuthUtils.getUserAgent(req)

        // Check if user is locked out
        const lockoutCheck = await AuthUtils.checkUserLockout(credentials.email)
        if (lockoutCheck.locked) {
          await AuthUtils.recordLoginAttempt(
            credentials.email,
            ipAddress,
            userAgent,
            false,
            'Account locked'
          )
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            vendorProfile: true,
            driverProfile: true
          }
        })

        if (!user || !user.password) {
          await AuthUtils.recordLoginAttempt(
            credentials.email,
            ipAddress,
            userAgent,
            false,
            'Invalid credentials'
          )
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          await AuthUtils.recordLoginAttempt(
            credentials.email,
            ipAddress,
            userAgent,
            false,
            'Invalid password'
          )
          return null
        }

        // Record successful login
        await AuthUtils.recordLoginAttempt(
          credentials.email,
          ipAddress,
          userAgent,
          true
        )

        // Create audit log
        await AuthUtils.createAuditLog(
          user.id,
          'LOGIN',
          'user',
          user.id,
          { method: 'credentials' },
          ipAddress,
          userAgent
        )

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
          avatar: user.avatar || undefined,
          isVerified: Boolean(user.isVerified),
          emailVerified: Boolean(user.emailVerified),
          phoneVerified: Boolean(user.phoneVerified),
          kycVerified: Boolean(user.kycVerified),
          profileCompleted: Boolean(user.profileCompleted),
          vendorProfile: user.vendorProfile,
          driverProfile: user.driverProfile
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || ""
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        // Handle social login
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingUser) {
            // Update social providers array
            const socialProviders = existingUser.socialProviders || []
            if (!socialProviders.includes(account.provider)) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  socialProviders: [...socialProviders, account.provider]
                }
              })
            }

            // Create audit log for social login
            await AuthUtils.createAuditLog(
              existingUser.id,
              'LOGIN',
              'user',
              existingUser.id,
              { method: account.provider, provider: account.provider }
            )
          } else {
            // Create new user for social login
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || undefined,
                avatar: user.image || undefined,
                role: UserRole.CUSTOMER,
                emailVerified: true, // Social accounts are pre-verified
                emailVerifiedAt: new Date(),
                socialProviders: [account.provider]
              }
            })

            // Create audit log for social signup
            await AuthUtils.createAuditLog(
              newUser.id,
              'SIGNUP',
              'user',
              newUser.id,
              { method: account.provider, provider: account.provider }
            )
          }
        } catch (error) {
          console.error('Social login error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
        token.avatar = user.avatar
        token.isVerified = Boolean(user.isVerified)
        token.emailVerified = Boolean(user.emailVerified)
        token.phoneVerified = Boolean(user.phoneVerified)
        token.kycVerified = Boolean(user.kycVerified)
        token.profileCompleted = Boolean(user.profileCompleted)
        token.vendorProfile = user.vendorProfile
        token.driverProfile = user.driverProfile
      }

      // Add account provider info to token
      if (account) {
        token.provider = account.provider
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.avatar = (token.avatar as string) || undefined
        session.user.isVerified = Boolean(token.isVerified)
        session.user.emailVerified = Boolean(token.emailVerified)
        session.user.phoneVerified = Boolean(token.phoneVerified)
        session.user.kycVerified = Boolean(token.kycVerified)
        session.user.profileCompleted = Boolean(token.profileCompleted)
        session.user.vendorProfile = token.vendorProfile
        session.user.driverProfile = token.driverProfile
        session.user.provider = token.provider as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
}
