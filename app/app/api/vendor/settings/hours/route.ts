
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/vendor/settings/hours - Get business hours
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

    const hours = await prisma.vendorHours.findMany({
      where: { vendorId: vendor.id },
      orderBy: { dayOfWeek: "asc" }
    });

    // If no hours exist, create default hours
    if (hours.length === 0) {
      const defaultHours = [];
      for (let i = 0; i < 7; i++) {
        defaultHours.push({
          vendorId: vendor.id,
          dayOfWeek: i,
          isOpen: i === 0 ? false : true, // Closed on Sunday by default
          openTime: "09:00",
          closeTime: "21:00",
        });
      }
      
      await prisma.vendorHours.createMany({
        data: defaultHours
      });
      
      return NextResponse.json(await prisma.vendorHours.findMany({
        where: { vendorId: vendor.id },
        orderBy: { dayOfWeek: "asc" }
      }));
    }

    return NextResponse.json(hours);
  } catch (error) {
    console.error("Error fetching business hours:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/settings/hours - Update business hours
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { hours } = body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Delete existing hours
    await prisma.vendorHours.deleteMany({
      where: { vendorId: vendor.id }
    });

    // Create new hours
    const hoursData = hours.map((hour: any) => ({
      vendorId: vendor.id,
      dayOfWeek: hour.dayOfWeek,
      isOpen: hour.isOpen,
      openTime: hour.openTime,
      closeTime: hour.closeTime,
      isHoliday: hour.isHoliday || false,
      holidayName: hour.holidayName,
      specialDate: hour.specialDate ? new Date(hour.specialDate) : undefined,
    }));

    await prisma.vendorHours.createMany({
      data: hoursData
    });

    const updatedHours = await prisma.vendorHours.findMany({
      where: { vendorId: vendor.id },
      orderBy: { dayOfWeek: "asc" }
    });

    return NextResponse.json(updatedHours);
  } catch (error) {
    console.error("Error updating business hours:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
