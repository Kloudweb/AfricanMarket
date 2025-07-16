
'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  Bell,
  Package,
  Users,
  BarChart3,
  Settings,
  Plus,
  Eye,
  ArrowRight,
  ChevronRight,
  Activity,
  Calendar,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface VendorDashboardProps {
  vendor: any;
  recentOrders: any[];
  unreadNotifications: any[];
  todayStats: {
    orders: number;
    revenue: number;
  };
  lowStockProducts: any[];
}

export default function VendorDashboard({
  vendor,
  recentOrders,
  unreadNotifications,
  todayStats,
  lowStockProducts
}: VendorDashboardProps) {
  const [isOnline, setIsOnline] = useState(vendor.isActive);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleOnlineStatus = async () => {
    try {
      const response = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !isOnline,
        }),
      });

      if (response.ok) {
        setIsOnline(!isOnline);
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const completionPercentage = Math.round((vendor.profileCompletionScore || 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={vendor.logo || vendor.user.avatar} alt={vendor.businessName} />
                <AvatarFallback>{vendor.businessName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {getGreeting()}, {vendor.businessName}!
                </h1>
                <p className="text-sm text-gray-600">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Online Status Toggle */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                <Button
                  variant={isOnline ? "default" : "secondary"}
                  onClick={toggleOnlineStatus}
                  className="text-sm"
                >
                  {isOnline ? "Online" : "Offline"}
                </Button>
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/vendor/notifications">
                    <Bell className="h-4 w-4" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </Link>
                </Button>
              </div>

              {/* Settings */}
              <Button variant="outline" size="sm" asChild>
                <Link href="/vendor/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Alert */}
        {completionPercentage < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Complete your profile to get more customers
                      </p>
                      <p className="text-xs text-amber-600">
                        {completionPercentage}% complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Progress value={completionPercentage} className="w-32" />
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/vendor/profile">
                        Complete Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Today's Orders</p>
                    <p className="text-3xl font-bold">{todayStats.orders}</p>
                    <p className="text-blue-100 text-xs mt-1">
                      {todayStats.orders > 0 ? '+' : ''}
                      {todayStats.orders} from yesterday
                    </p>
                  </div>
                  <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Today's Revenue</p>
                    <p className="text-3xl font-bold">{formatCurrency(todayStats.revenue)}</p>
                    <p className="text-green-100 text-xs mt-1">
                      After commission
                    </p>
                  </div>
                  <div className="bg-green-400 bg-opacity-30 p-3 rounded-full">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Rating</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-3xl font-bold">{vendor.rating.toFixed(1)}</p>
                      <Star className="h-5 w-5 text-yellow-300 fill-current" />
                    </div>
                    <p className="text-purple-100 text-xs mt-1">
                      {vendor.totalReviews} reviews
                    </p>
                  </div>
                  <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full">
                    <Star className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Active Products</p>
                    <p className="text-3xl font-bold">{vendor._count.products}</p>
                    <p className="text-orange-100 text-xs mt-1">
                      Menu items
                    </p>
                  </div>
                  <div className="bg-orange-400 bg-opacity-30 p-3 rounded-full">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button asChild className="h-20 flex-col space-y-2">
                    <Link href="/vendor/menu">
                      <Plus className="h-6 w-6" />
                      <span className="text-sm">Add Product</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-20 flex-col space-y-2">
                    <Link href="/vendor/orders">
                      <Eye className="h-6 w-6" />
                      <span className="text-sm">View Orders</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-20 flex-col space-y-2">
                    <Link href="/vendor/analytics">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-sm">Analytics</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-20 flex-col space-y-2">
                    <Link href="/vendor/inventory">
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Inventory</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Recent Orders</span>
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/vendor/orders">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <AnimatePresence>
                    {recentOrders.map((order, index) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={order.customer.avatar} alt={order.customer.name} />
                            <AvatarFallback>{order.customer.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{order.customer.name}</p>
                            <p className="text-sm text-gray-600">
                              {order.items.length} items • {formatCurrency(order.totalAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={
                            order.status === 'DELIVERED' ? 'default' :
                            order.status === 'PREPARING' ? 'secondary' :
                            order.status === 'CANCELLED' ? 'destructive' : 'outline'
                          }>
                            {order.status}
                          </Badge>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/vendor/orders/${order.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {recentOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent orders</p>
                      <p className="text-sm">Orders will appear here when customers place them</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </CardTitle>
                {unreadNotifications.length > 0 && (
                  <Badge variant="destructive">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unreadNotifications.slice(0, 5).map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {notification.priority}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                  
                  {unreadNotifications.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  )}
                  
                  {unreadNotifications.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                      <Link href="/vendor/notifications">
                        View All Notifications
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Low Stock Alert</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lowStockProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-amber-700" />
                          </div>
                          <div>
                            <p className="font-medium text-amber-900">{product.name}</p>
                            <p className="text-sm text-amber-700">
                              {product.stockQuantity} remaining
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/vendor/inventory/${product.id}`}>
                            Update
                          </Link>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Total Orders</span>
                    </div>
                    <span className="font-medium">{vendor._count.orders}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Total Reviews</span>
                    </div>
                    <span className="font-medium">{vendor._count.reviews}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Delivery Radius</span>
                    </div>
                    <span className="font-medium">{vendor.servingRadius || 'N/A'} km</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
