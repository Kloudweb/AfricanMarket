
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Clock,
  MapPin,
  Phone,
  User,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Calendar,
  MessageSquare,
  Eye,
  RefreshCw,
  Download,
  Bell,
  Star,
  ChevronRight,
  Timer,
  CreditCard,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import { formatCurrency, formatDateTime, timeAgo } from "@/lib/utils";

interface VendorOrdersManagerProps {
  vendor: any;
  orders: any[];
}

const orderStatusConfig = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    actions: ["confirm", "cancel"]
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle,
    actions: ["preparing", "cancel"]
  },
  PREPARING: {
    label: "Preparing",
    color: "bg-purple-100 text-purple-800",
    icon: Utensils,
    actions: ["ready"]
  },
  READY_FOR_PICKUP: {
    label: "Ready for Pickup",
    color: "bg-green-100 text-green-800",
    icon: Package,
    actions: ["out_for_delivery"]
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    color: "bg-indigo-100 text-indigo-800",
    icon: Truck,
    actions: ["delivered"]
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    actions: []
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    actions: []
  }
};

export default function VendorOrdersManager({ vendor, orders }: VendorOrdersManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      window.location.reload();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    
    const matchesTimeRange = selectedTimeRange === "all" || (() => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      
      switch (selectedTimeRange) {
        case "today":
          return diffInHours <= 24;
        case "week":
          return diffInHours <= 168;
        case "month":
          return diffInHours <= 720;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesTimeRange;
  });

  const handleOrderAction = async (orderId: string, action: string) => {
    setIsUpdatingOrder(true);
    
    try {
      const statusMap: { [key: string]: string } = {
        confirm: "CONFIRMED",
        preparing: "PREPARING",
        ready: "READY_FOR_PICKUP",
        out_for_delivery: "OUT_FOR_DELIVERY",
        delivered: "DELIVERED",
        cancel: "CANCELLED"
      };
      
      const response = await fetch(`/api/vendor/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusMap[action],
          estimatedDelivery: estimatedTime ? new Date(estimatedTime).toISOString() : undefined,
          rejectionReason: action === "cancel" ? rejectionReason : undefined
        })
      });
      
      if (response.ok) {
        toast.success(`Order ${action === "cancel" ? "cancelled" : "updated"} successfully`);
        setIsOrderDetailOpen(false);
        setEstimatedTime("");
        setRejectionReason("");
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update order");
      }
    } catch (error) {
      toast.error("An error occurred while updating the order");
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const config = orderStatusConfig[status as keyof typeof orderStatusConfig];
    if (!config) return null;
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getOrderPriority = (order: any) => {
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    if (order.status === "PENDING" && diffInMinutes > 15) return "high";
    if (order.status === "CONFIRMED" && diffInMinutes > 30) return "high";
    if (order.status === "PREPARING" && diffInMinutes > 45) return "high";
    
    return "normal";
  };

  const pendingOrdersCount = orders.filter(order => order.status === "PENDING").length;
  const preparingOrdersCount = orders.filter(order => order.status === "PREPARING").length;
  const readyOrdersCount = orders.filter(order => order.status === "READY_FOR_PICKUP").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
              <p className="text-gray-600">Manage your incoming orders</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto Refresh {autoRefresh ? "ON" : "OFF"}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Orders
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notification Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Pending</p>
                    <p className="text-2xl font-bold">{pendingOrdersCount}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-purple-400 to-purple-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Preparing</p>
                    <p className="text-2xl font-bold">{preparingOrdersCount}</p>
                  </div>
                  <Utensils className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-green-400 to-green-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Ready</p>
                    <p className="text-2xl font-bold">{readyOrdersCount}</p>
                  </div>
                  <Package className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-blue-400 to-blue-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Today</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PREPARING">Preparing</SelectItem>
                    <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order, index) => {
              const priority = getOrderPriority(order);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${priority === "high" ? "ring-2 ring-red-200" : ""}`}
                >
                  <Card className={`hover:shadow-md transition-shadow ${priority === "high" ? "bg-red-50" : ""}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={order.customer.avatar} alt={order.customer.name} />
                              <AvatarFallback>{order.customer.name?.[0]}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-medium truncate">
                                Order #{order.orderNumber}
                              </h3>
                              {getOrderStatusBadge(order.status)}
                              {priority === "high" && (
                                <Badge variant="destructive" className="animate-pulse">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {order.customer.name}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {timeAgo(order.createdAt)}
                              </span>
                              <span className="flex items-center">
                                <Package className="h-4 w-4 mr-1" />
                                {order.items.length} items
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.paymentMethod}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                      
                      {/* Order Items Preview */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center space-x-4">
                          {order.items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                {item.product.image ? (
                                  <Image
                                    src={item.product.image}
                                    alt={item.product.name}
                                    width={32}
                                    height={32}
                                    className="rounded-full object-cover"
                                  />
                                ) : (
                                  <Utensils className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <span className="text-sm">
                                {item.quantity}x {item.product.name}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-sm text-gray-500">
                              +{order.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedStatus !== "all" || selectedTimeRange !== "all"
                ? "Try adjusting your filters"
                : "Orders will appear here when customers place them"}
            </p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Status and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getOrderStatusBadge(selectedOrder.status)}
                  <span className="text-sm text-gray-500">
                    {formatDateTime(selectedOrder.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {orderStatusConfig[selectedOrder.status as keyof typeof orderStatusConfig]?.actions.map(action => (
                    <Button
                      key={action}
                      size="sm"
                      variant={action === "cancel" ? "destructive" : "default"}
                      onClick={() => {
                        if (action === "cancel") {
                          // Show cancellation reason input
                          const reason = prompt("Please provide a reason for cancellation:");
                          if (reason) {
                            setRejectionReason(reason);
                            handleOrderAction(selectedOrder.id, action);
                          }
                        } else {
                          handleOrderAction(selectedOrder.id, action);
                        }
                      }}
                      disabled={isUpdatingOrder}
                    >
                      {action === "confirm" && "Confirm Order"}
                      {action === "preparing" && "Start Preparing"}
                      {action === "ready" && "Mark Ready"}
                      {action === "out_for_delivery" && "Out for Delivery"}
                      {action === "delivered" && "Mark Delivered"}
                      {action === "cancel" && "Cancel Order"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Customer Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedOrder.customer.avatar} alt={selectedOrder.customer.name} />
                        <AvatarFallback>{selectedOrder.customer.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedOrder.customer.name}</p>
                        <p className="text-sm text-gray-600">{selectedOrder.customer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedOrder.customer.phone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Order Items</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            {item.product.image ? (
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                width={48}
                                height={48}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <Utensils className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(item.price)} x {item.quantity}
                            </p>
                            {item.notes && (
                              <p className="text-sm text-gray-500 italic">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              {selectedOrder.isDelivery && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Delivery Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label>Delivery Address</Label>
                        <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress}</p>
                      </div>
                      {selectedOrder.specialInstructions && (
                        <div>
                          <Label>Special Instructions</Label>
                          <p className="text-sm text-gray-600">{selectedOrder.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Payment Method:</span>
                      <span>{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Payment Status:</span>
                      <Badge variant={selectedOrder.payment?.status === "COMPLETED" ? "default" : "secondary"}>
                        {selectedOrder.payment?.status || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
