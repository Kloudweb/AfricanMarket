
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";

// GET /api/vendor/products/[id] - Get specific product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        id: params.id,
        vendorId: vendor.id,
      },
      include: {
        productCategory: true,
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        inventoryLogs: {
          take: 10,
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            orderItems: true,
            reviews: true,
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      category,
      categoryId,
      image,
      images,
      isAvailable,
      ingredients,
      allergens,
      isSpicy,
      prepTime,
      sku,
      stockQuantity,
      lowStockAlert,
      isTrackingStock,
      weight,
      dimensions,
      nutritionInfo,
      dietaryInfo,
      spiceLevel,
      isSignatureDish,
      displayOrder,
      originalPrice,
      discountPercent,
      promotionStart,
      promotionEnd,
      tags,
      metaTitle,
      metaDescription,
    } = body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Check if product exists and belongs to vendor
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Generate slug from name if name is being updated
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : existingProduct.slug;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        description,
        price,
        category,
        categoryId,
        image,
        images: images || existingProduct.images,
        isAvailable,
        ingredients,
        allergens,
        isSpicy,
        prepTime,
        sku,
        stockQuantity,
        lowStockAlert,
        isTrackingStock,
        weight,
        dimensions,
        nutritionInfo,
        dietaryInfo: dietaryInfo || existingProduct.dietaryInfo,
        spiceLevel,
        isSignatureDish,
        displayOrder,
        originalPrice,
        discountPercent,
        promotionStart: promotionStart ? new Date(promotionStart) : undefined,
        promotionEnd: promotionEnd ? new Date(promotionEnd) : undefined,
        slug,
        tags: tags || existingProduct.tags,
        metaTitle,
        metaDescription,
      },
      include: {
        productCategory: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
          }
        }
      }
    });

    // Create inventory log if stock quantity changed
    if (isTrackingStock && stockQuantity !== undefined && stockQuantity !== existingProduct.stockQuantity) {
      const difference = stockQuantity - (existingProduct.stockQuantity || 0);
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          vendorId: vendor.id,
          type: difference > 0 ? "STOCK_IN" : "STOCK_OUT",
          quantity: Math.abs(difference),
          previousStock: existingProduct.stockQuantity || 0,
          currentStock: stockQuantity,
          reason: "Manual adjustment",
          userId: session.user.id,
        }
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/vendor/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check if product exists and belongs to vendor
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has any order items
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: params.id }
    });

    if (orderItemsCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete product with existing orders. Consider marking it as unavailable instead." 
      }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
