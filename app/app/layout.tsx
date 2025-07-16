
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProviders from "@/lib/auth-providers"
import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/lib/cart-context"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AfricanMarket - Your Community Marketplace",
  description: "Food delivery and rideshare services for the African community in Newfoundland",
  icons: {
    icon: "/favicon.ico"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProviders>
            <CartProvider>
              {children}
              <Toaster richColors />
            </CartProvider>
          </AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
