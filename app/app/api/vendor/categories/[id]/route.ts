
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/vendor/categories/[id] - Get specific category
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

    const category = await prisma.productCategory.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            image: true,
          }
        },
        children: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                price: true,
                isAvailable: true,
                image: true,
              }
            }
          }
        },
        parent: true,
        _count: {
          select: {
            products: true,
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/categories/[id] - Update category
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
      image,
      isActive,
      parentId,
      displayOrder,
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

    // Check if category exists and belongs to vendor
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Generate slug from name if name is being updated
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : existingCategory.slug;

    const category = await prisma.productCategory.update({
      where: { id: params.id },
      data: {
        name,
        description,
        image,
        isActive,
        parentId,
        displayOrder,
        slug,
        metaTitle,
        metaDescription,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            image: true,
          }
        },
        children: true,
        parent: true,
        _count: {
          select: {
            products: true,
          }
        }
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/vendor/categories/[id] - Delete category
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

    // Check if category exists and belongs to vendor
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      },
      include: {
        products: true,
        children: true,
      }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if category has products
    if (existingCategory.products.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete category with products. Move products to another category first." 
      }, { status: 400 });
    }

    // Check if category has subcategories
    if (existingCategory.children.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete category with subcategories. Delete subcategories first." 
      }, { status: 400 });
    }

    await prisma.productCategory.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
