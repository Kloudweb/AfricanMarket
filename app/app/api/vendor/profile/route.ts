
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";

// GET /api/vendor/profile - Get vendor profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            isVerified: true,
            emailVerified: true,
            phoneVerified: true,
            kycVerified: true,
            profileCompleted: true,
          }
        },
        settings: true,
        hours: true,
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/profile - Update vendor profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessName,
      businessType,
      description,
      logo,
      coverImage,
      address,
      city,
      province,
      postalCode,
      latitude,
      longitude,
      phone,
      businessEmail,
      businessWebsite,
      businessCategory,
      businessSubcategory,
      cuisineTypes,
      servingRadius,
      minimumOrderAmount,
      deliveryFee,
      deliveryTime,
      acceptsPreorders,
      acceptsCashOnDelivery,
      acceptsCardPayment,
      acceptsDigitalPayment,
    } = body;

    const updatedVendor = await prisma.vendor.update({
      where: { userId: session.user.id },
      data: {
        businessName,
        businessType,
        description,
        logo,
        coverImage,
        address,
        city,
        province,
        postalCode,
        latitude,
        longitude,
        phone,
        businessEmail,
        businessWebsite,
        businessCategory,
        businessSubcategory,
        cuisineTypes,
        servingRadius,
        minimumOrderAmount,
        deliveryFee,
        deliveryTime,
        acceptsPreorders,
        acceptsCashOnDelivery,
        acceptsCardPayment,
        acceptsDigitalPayment,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            isVerified: true,
            emailVerified: true,
            phoneVerified: true,
            kycVerified: true,
            profileCompleted: true,
          }
        },
        settings: true,
        hours: true,
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          }
        }
      }
    });

    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
