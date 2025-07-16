
'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Edit,
  RotateCcw,
  Download,
  Upload,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BarChart3,
  Eye,
  History,
} from "lucide-react";
import Image from "next/image";
import { formatDateTime, timeAgo } from "@/lib/utils";

interface VendorInventoryManagerProps {
  vendor: any;
  products: any[];
}

export default function VendorInventoryManager({ vendor, products }: VendorInventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "set">("add");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || (() => {
      switch (selectedStatus) {
        case "in_stock":
          return product.stockQuantity > 0;
        case "low_stock":
          return product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockAlert || 10);
        case "out_of_stock":
          return product.stockQuantity <= 0;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus;
  });

  const getStockStatus = (product: any) => {
    if (product.stockQuantity <= 0) return { status: "out_of_stock", label: "Out of Stock", color: "bg-red-100 text-red-800", icon: XCircle };
    if (product.stockQuantity <= (product.lowStockAlert || 10)) return { status: "low_stock", label: "Low Stock", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
    return { status: "in_stock", label: "In Stock", color: "bg-green-100 text-green-800", icon: CheckCircle };
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || !adjustmentQuantity || !adjustmentReason) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/vendor/inventory/${selectedProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: adjustmentType,
          quantity: parseInt(adjustmentQuantity),
          reason: adjustmentReason
        })
      });
      
      if (response.ok) {
        toast.success("Stock updated successfully");
        setIsAdjustmentOpen(false);
        setAdjustmentQuantity("");
        setAdjustmentReason("");
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update stock");
      }
    } catch (error) {
      toast.error("An error occurred while updating stock");
    } finally {
      setIsUpdating(false);
    }
  };

  const getInventoryStats = () => {
    const total = products.length;
    const inStock = products.filter(p => p.stockQuantity > 0).length;
    const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockAlert || 10)).length;
    const outOfStock = products.filter(p => p.stockQuantity <= 0).length;
    
    return { total, inStock, lowStock, outOfStock };
  };

  const stats = getInventoryStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600">Track and manage your product inventory</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-blue-400 to-blue-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Products</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-green-400 to-green-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">In Stock</p>
                    <p className="text-2xl font-bold">{stats.inStock}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Low Stock</p>
                    <p className="text-2xl font-bold">{stats.lowStock}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-red-400 to-red-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Out of Stock</p>
                    <p className="text-2xl font-bold">{stats.outOfStock}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-200" />
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
                    placeholder="Search products..."
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
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
            <CardDescription>
              Manage stock levels for your products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnimatePresence>
                {filteredProducts.map((product, index) => {
                  const stockStatus = getStockStatus(product);
                  const Icon = stockStatus.icon;
                  
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{product.name}</h3>
                              <Badge className={stockStatus.color}>
                                <Icon className="h-3 w-3 mr-1" />
                                {stockStatus.label}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span>SKU: {product.sku || 'N/A'}</span>
                              <span>Category: {product.productCategory?.name || product.category}</span>
                              <span>Updated: {timeAgo(product.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {product.stockQuantity}
                            </p>
                            <p className="text-sm text-gray-500">
                              Alert at {product.lowStockAlert || 10}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsAdjustmentOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedStatus !== "all"
                    ? "Try adjusting your filters"
                    : "No products are currently tracking inventory"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Stock</Label>
                  <p className="text-2xl font-bold">{selectedProduct.stockQuantity}</p>
                </div>
                <div>
                  <Label>Low Stock Alert</Label>
                  <p className="text-lg">{selectedProduct.lowStockAlert || 10}</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <Label className="text-base font-medium">Recent Activity</Label>
                <div className="mt-2 space-y-2">
                  {selectedProduct.inventoryLogs && selectedProduct.inventoryLogs.length > 0 ? (
                    selectedProduct.inventoryLogs.map((log: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            log.type === 'STOCK_IN' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {log.type === 'STOCK_IN' ? 
                              <Plus className="h-4 w-4 text-green-600" /> : 
                              <Minus className="h-4 w-4 text-red-600" />
                            }
                          </div>
                          <div>
                            <p className="font-medium">{log.type.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-600">{log.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {log.type === 'STOCK_IN' ? '+' : '-'}{log.quantity}
                          </p>
                          <p className="text-sm text-gray-500">
                            {timeAgo(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Current Stock</Label>
              <p className="text-lg font-bold">{selectedProduct?.stockQuantity}</p>
            </div>

            <div>
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                  <SelectItem value="set">Set Stock Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Enter reason for adjustment"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAdjustmentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStockAdjustment}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update Stock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
