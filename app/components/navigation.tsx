
'use client'

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { CartSidebar } from "@/components/cart/cart-sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { 
  Menu, 
  User, 
  ShoppingCart, 
  Car, 
  Store, 
  Settings, 
  LogOut, 
  Bell,
  Heart,
  MapPin
} from "lucide-react"
import { UserRole } from "@prisma/client"

export default function Navigation() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/marketplace", label: "Food Delivery", icon: Store },
    { href: "/rideshare", label: "Rideshare", icon: Car },
  ]

  const getUserItems = () => {
    if (!session?.user) return []
    
    const items = [
      { href: "/dashboard", label: "Dashboard", icon: User },
      { href: "/orders", label: "My Orders", icon: ShoppingCart },
      { href: "/rides", label: "My Rides", icon: Car },
      { href: "/favorites", label: "Favorites", icon: Heart },
      { href: "/addresses", label: "Addresses", icon: MapPin },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ]

    // Add role-specific items
    if (session.user.role === UserRole.VENDOR) {
      items.splice(1, 0, { href: "/vendor/dashboard", label: "Vendor Dashboard", icon: Store })
    }
    
    if (session.user.role === UserRole.DRIVER) {
      items.splice(1, 0, { href: "/driver/dashboard", label: "Driver Dashboard", icon: Car })
    }
    
    if (session.user.role === UserRole.ADMIN) {
      items.splice(1, 0, { href: "/admin/dashboard", label: "Admin Dashboard", icon: Settings })
    }

    return items
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-orange-500 text-white font-bold text-xl w-10 h-10 rounded-lg flex items-center justify-center">
              AM
            </div>
            <span className="font-bold text-xl text-foreground">AfricanMarket</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center space-x-2"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Cart Sidebar */}
            <CartSidebar />
            
            {status === "loading" ? (
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.avatar || ""} alt={session.user.name || ""} />
                      <AvatarFallback>
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {session.user.role?.toLowerCase()}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {getUserItems().map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="flex items-center space-x-2">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Sign up</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>Navigate to different sections</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  {session?.user && getUserItems().map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
