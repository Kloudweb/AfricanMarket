
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { 
  ShoppingCart, 
  Car, 
  Store, 
  Users,
  DollarSign,
  Star,
  Clock,
  MapPin
} from "lucide-react"
import Link from "next/link"
import { UserRole } from "@prisma/client"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Get user statistics based on role
  const getUserStats = async () => {
    const userId = session.user.id
    
    if (session.user.role === UserRole.CUSTOMER) {
      const [totalOrders, totalRides, recentOrders] = await Promise.all([
        prisma.order.count({ where: { customerId: userId } }),
        prisma.ride.count({ where: { customerId: userId } }),
        prisma.order.findMany({
          where: { customerId: userId },
          include: {
            vendor: true,
            items: {
              include: { product: true }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 5
        })
      ])
      
      return { totalOrders, totalRides, recentOrders }
    }
    
    if (session.user.role === UserRole.VENDOR) {
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        include: {
          products: true,
          orders: {
            include: {
              items: true,
              customer: true
            },
            orderBy: { createdAt: "desc" },
            take: 5
          }
        }
      })
      
      return { vendor }
    }
    
    if (session.user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findUnique({
        where: { userId },
        include: {
          deliveryOrders: {
            include: {
              vendor: true,
              customer: true
            },
            orderBy: { createdAt: "desc" },
            take: 5
          },
          rides: {
            include: {
              customer: true
            },
            orderBy: { createdAt: "desc" },
            take: 5
          }
        }
      })
      
      return { driver }
    }
    
    return {}
  }

  const stats = await getUserStats()

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your account
          </p>
        </div>

        {/* Customer Dashboard */}
        {session.user.role === UserRole.CUSTOMER && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    Food orders placed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRides}</div>
                  <p className="text-xs text-muted-foreground">
                    Rides completed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    2024
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Community member
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Order Food</span>
                  </CardTitle>
                  <CardDescription>
                    Browse restaurants and order your favorite dishes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/marketplace">Browse Restaurants</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5" />
                    <span>Book a Ride</span>
                  </CardTitle>
                  <CardDescription>
                    Get a safe and affordable ride to your destination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/rideshare">Book Ride</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            {stats.recentOrders && stats.recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Your latest food orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-orange-100 p-2 rounded-full">
                            <Store className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">{order.vendor.businessName}</p>
                            <p className="text-sm text-gray-600">
                              {order.items.length} items • ${order.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Vendor Dashboard */}
        {session.user.role === UserRole.VENDOR && stats.vendor && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.vendor.orders?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Orders received
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.vendor.products?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Items in menu
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.vendor.rating.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.vendor.totalReviews} reviews
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <Badge variant={stats.vendor.isActive ? 'default' : 'secondary'}>
                    {stats.vendor.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.vendor.verificationStatus}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verification status
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Menu</CardTitle>
                  <CardDescription>
                    Add, edit, or remove items from your menu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/vendor/menu">Manage Menu</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>View Orders</CardTitle>
                  <CardDescription>
                    Check and manage incoming orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/vendor/orders">View Orders</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Driver Dashboard */}
        {session.user.role === UserRole.DRIVER && stats.driver && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.driver.totalDeliveries}</div>
                  <p className="text-xs text-muted-foreground">
                    Food deliveries
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rides</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.driver.totalRides}</div>
                  <p className="text-xs text-muted-foreground">
                    Rides completed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.driver.rating.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.driver.totalReviews} reviews
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <Badge variant={stats.driver.isAvailable ? 'default' : 'secondary'}>
                    {stats.driver.isAvailable ? 'Available' : 'Offline'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.driver.verificationStatus}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verification status
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Go Online</CardTitle>
                  <CardDescription>
                    Start accepting delivery and ride requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/driver/dashboard">Driver Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Earnings</CardTitle>
                  <CardDescription>
                    View your earnings and payment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/driver/earnings">View Earnings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  )
}
