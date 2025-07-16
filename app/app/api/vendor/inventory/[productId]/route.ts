
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";

// GET /api/vendor/inventory/[productId] - Get product inventory details
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.productId,
        vendorId: vendor.id,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        image: true,
        stockQuantity: true,
        lowStockAlert: true,
        isAvailable: true,
        isTrackingStock: true,
        price: true,
        updatedAt: true,
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get inventory logs
    const inventoryLogs = await prisma.inventoryLog.findMany({
      where: {
        productId: params.productId,
        vendorId: vendor.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({
      product,
      inventoryLogs,
      stockStatus: getStockStatus(product),
    });
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/inventory/[productId] - Update product stock
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quantity, reason, type } = body; // type: "add", "remove", "set"

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.productId,
        vendorId: vendor.id,
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousStock = product.stockQuantity || 0;
    let newStock: number;
    let logType: string;
    let logQuantity: number;

    switch (type) {
      case "add":
        newStock = previousStock + quantity;
        logType = "STOCK_IN";
        logQuantity = quantity;
        break;
      case "remove":
        newStock = Math.max(0, previousStock - quantity);
        logType = "STOCK_OUT";
        logQuantity = quantity;
        break;
      case "set":
        newStock = quantity;
        logType = quantity > previousStock ? "STOCK_IN" : "STOCK_OUT";
        logQuantity = Math.abs(quantity - previousStock);
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Update product stock
    const updatedProduct = await prisma.product.update({
      where: { id: params.productId },
      data: {
        stockQuantity: newStock,
        isAvailable: newStock > 0 || !product.isTrackingStock,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        image: true,
        stockQuantity: true,
        lowStockAlert: true,
        isAvailable: true,
        isTrackingStock: true,
        price: true,
        updatedAt: true,
      }
    });

    // Create inventory log
    await prisma.inventoryLog.create({
      data: {
        productId: params.productId,
        vendorId: vendor.id,
        type: logType,
        quantity: logQuantity,
        previousStock,
        currentStock: newStock,
        reason: reason || "Manual adjustment",
        userId: session.user.id,
      }
    });

    // Check for low stock alert
    if (updatedProduct.lowStockAlert && newStock <= updatedProduct.lowStockAlert) {
      await prisma.vendorNotification.create({
        data: {
          vendorId: vendor.id,
          type: "LOW_STOCK",
          title: "Low Stock Alert",
          message: `${updatedProduct.name} is running low on stock (${newStock} remaining)`,
          priority: "HIGH",
          data: {
            productId: params.productId,
            productName: updatedProduct.name,
            currentStock: newStock,
            lowStockAlert: updatedProduct.lowStockAlert,
          }
        }
      });
    }

    return NextResponse.json({
      product: updatedProduct,
      stockStatus: getStockStatus(updatedProduct),
      previousStock,
      newStock,
    });
  } catch (error) {
    console.error("Error updating product inventory:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getStockStatus(product: any): string {
  if (!product.isTrackingStock) return "not_tracked";
  if (product.stockQuantity <= 0) return "out_of_stock";
  if (product.lowStockAlert && product.stockQuantity <= product.lowStockAlert) return "low_stock";
  return "in_stock";
}
