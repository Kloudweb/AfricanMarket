
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";

// GET /api/vendor/settings - Get vendor settings
export async function GET(request: NextRequest) {
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

    // Get or create settings
    let settings = await prisma.vendorSettings.findUnique({
      where: { vendorId: vendor.id }
    });

    if (!settings) {
      settings = await prisma.vendorSettings.create({
        data: {
          vendorId: vendor.id
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching vendor settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/settings - Update vendor settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      autoAcceptOrders,
      maxOrdersPerHour,
      minOrderAmount,
      maxOrderAmount,
      emailNotifications,
      smsNotifications,
      pushNotifications,
      defaultPreparationTime,
      allowPreorders,
      preorderDays,
      autoDisableOutOfStock,
      lowStockThreshold,
      sendLowStockAlerts,
      customOrderFields,
      integrationSettings,
    } = body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const settings = await prisma.vendorSettings.upsert({
      where: { vendorId: vendor.id },
      update: {
        autoAcceptOrders,
        maxOrdersPerHour,
        minOrderAmount,
        maxOrderAmount,
        emailNotifications,
        smsNotifications,
        pushNotifications,
        defaultPreparationTime,
        allowPreorders,
        preorderDays,
        autoDisableOutOfStock,
        lowStockThreshold,
        sendLowStockAlerts,
        customOrderFields,
        integrationSettings,
      },
      create: {
        vendorId: vendor.id,
        autoAcceptOrders,
        maxOrdersPerHour,
        minOrderAmount,
        maxOrderAmount,
        emailNotifications,
        smsNotifications,
        pushNotifications,
        defaultPreparationTime,
        allowPreorders,
        preorderDays,
        autoDisableOutOfStock,
        lowStockThreshold,
        sendLowStockAlerts,
        customOrderFields,
        integrationSettings,
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating vendor settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
