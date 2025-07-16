
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";

// GET /api/vendor/inventory - Get inventory status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || ""; // low_stock, out_of_stock, in_stock

    const skip = (page - 1) * limit;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const where: any = {
      vendorId: vendor.id,
      isTrackingStock: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add status filtering
    if (status === "low_stock") {
      where.AND = [
        { stockQuantity: { gt: 0 } },
        { stockQuantity: { lte: { lowStockAlert: true } } }
      ];
    } else if (status === "out_of_stock") {
      where.stockQuantity = { lte: 0 };
    } else if (status === "in_stock") {
      where.stockQuantity = { gt: 0 };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.product.count({ where })
    ]);

    // Get low stock and out of stock counts
    const [lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({
        where: {
          vendorId: vendor.id,
          isTrackingStock: true,
          stockQuantity: { gt: 0 },
          // This would need a custom query for low stock alert comparison
        }
      }),
      prisma.product.count({
        where: {
          vendorId: vendor.id,
          isTrackingStock: true,
          stockQuantity: { lte: 0 }
        }
      })
    ]);

    // Enhanced products with stock status
    const enhancedProducts = products.map(product => ({
      ...product,
      stockStatus: getStockStatus(product),
    }));

    return NextResponse.json({
      products: enhancedProducts,
      summary: {
        totalTracked: total,
        lowStockCount,
        outOfStockCount,
        inStockCount: total - outOfStockCount,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/vendor/inventory - Bulk inventory update
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body; // Array of { productId, quantity, reason }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const results = [];

    for (const update of updates) {
      const { productId, quantity, reason } = update;
      
      // Get current product
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          vendorId: vendor.id,
        }
      });

      if (!product) {
        results.push({
          productId,
          success: false,
          error: "Product not found"
        });
        continue;
      }

      const previousStock = product.stockQuantity || 0;
      const newStock = Math.max(0, previousStock + quantity);

      // Update product stock
      await prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: newStock,
          isAvailable: newStock > 0 || !product.isTrackingStock,
        }
      });

      // Create inventory log
      await prisma.inventoryLog.create({
        data: {
          productId,
          vendorId: vendor.id,
          type: quantity > 0 ? "STOCK_IN" : "STOCK_OUT",
          quantity: Math.abs(quantity),
          previousStock,
          currentStock: newStock,
          reason: reason || "Bulk update",
          userId: session.user.id,
        }
      });

      results.push({
        productId,
        success: true,
        previousStock,
        newStock,
      });
    }

    return NextResponse.json({
      results,
      summary: {
        total: updates.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }
    });
  } catch (error) {
    console.error("Error updating inventory:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getStockStatus(product: any): string {
  if (!product.isTrackingStock) return "not_tracked";
  if (product.stockQuantity <= 0) return "out_of_stock";
  if (product.lowStockAlert && product.stockQuantity <= product.lowStockAlert) return "low_stock";
  return "in_stock";
}
