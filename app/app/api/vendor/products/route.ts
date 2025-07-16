
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/vendor/products - Get vendor products
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
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";

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
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status === "available") {
      where.isAvailable = true;
    } else if (status === "unavailable") {
      where.isAvailable = false;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          productCategory: true,
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true,
              user: {
                select: {
                  name: true,
                  avatar: true,
                }
              },
              createdAt: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" }
          },
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { displayOrder: "asc" },
          { createdAt: "desc" }
        ]
      }),
      prisma.product.count({ where })
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/vendor/products - Create new product
export async function POST(request: NextRequest) {
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

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name,
        description,
        price,
        category,
        categoryId,
        image,
        images: images || [],
        ingredients,
        allergens,
        isSpicy: isSpicy || false,
        prepTime,
        sku,
        stockQuantity,
        lowStockAlert,
        isTrackingStock: isTrackingStock || false,
        weight,
        dimensions,
        nutritionInfo,
        dietaryInfo: dietaryInfo || [],
        spiceLevel,
        isSignatureDish: isSignatureDish || false,
        displayOrder,
        originalPrice,
        discountPercent,
        promotionStart: promotionStart ? new Date(promotionStart) : undefined,
        promotionEnd: promotionEnd ? new Date(promotionEnd) : undefined,
        slug,
        tags: tags || [],
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

    // Create initial inventory log if tracking stock
    if (isTrackingStock && stockQuantity !== undefined) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          vendorId: vendor.id,
          type: "STOCK_IN",
          quantity: stockQuantity,
          previousStock: 0,
          currentStock: stockQuantity,
          reason: "Initial stock",
          userId: session.user.id,
        }
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
