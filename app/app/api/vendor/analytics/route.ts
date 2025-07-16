
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole, OrderStatus } from "@/lib/types";

// GET /api/vendor/analytics - Get vendor analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    let dateRange: { gte: Date; lte: Date };

    if (startDate && endDate) {
      dateRange = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      const daysMap: { [key: string]: number } = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365
      };
      const days = daysMap[period] || 30;
      dateRange = {
        gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
        lte: now
      };
    }

    // Get comprehensive analytics
    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      totalRevenue,
      revenueData,
      topProducts,
      ordersByDay,
      customerStats,
      ratingStats,
      productStats
    ] = await Promise.all([
      // Total orders
      prisma.order.count({
        where: {
          vendorId: vendor.id,
          createdAt: dateRange
        }
      }),
      
      // Completed orders
      prisma.order.count({
        where: {
          vendorId: vendor.id,
          status: OrderStatus.DELIVERED,
          createdAt: dateRange
        }
      }),
      
      // Cancelled orders
      prisma.order.count({
        where: {
          vendorId: vendor.id,
          status: OrderStatus.CANCELLED,
          createdAt: dateRange
        }
      }),
      
      // Pending orders
      prisma.order.count({
        where: {
          vendorId: vendor.id,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING]
          }
        }
      }),
      
      // Total revenue
      prisma.order.aggregate({
        where: {
          vendorId: vendor.id,
          status: OrderStatus.DELIVERED,
          createdAt: dateRange
        },
        _sum: {
          totalAmount: true
        }
      }),
      
      // Revenue by day
      prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          vendorId: vendor.id,
          status: OrderStatus.DELIVERED,
          createdAt: dateRange
        },
        _sum: {
          totalAmount: true
        },
        _count: {
          _all: true
        }
      }),
      
      // Top products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            vendorId: vendor.id,
            status: OrderStatus.DELIVERED,
            createdAt: dateRange
          }
        },
        _sum: {
          quantity: true,
          subtotal: true
        },
        _count: {
          _all: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 10
      }),
      
      // Orders by day
      prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          vendorId: vendor.id,
          createdAt: dateRange
        },
        _count: {
          _all: true
        }
      }),
      
      // Customer stats
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          vendorId: vendor.id,
          status: OrderStatus.DELIVERED,
          createdAt: dateRange
        },
        _count: {
          _all: true
        },
        _sum: {
          totalAmount: true
        }
      }),
      
      // Rating stats
      prisma.review.aggregate({
        where: {
          vendorId: vendor.id,
          createdAt: dateRange
        },
        _avg: {
          rating: true
        },
        _count: {
          _all: true
        }
      }),
      
      // Product stats
      prisma.product.count({
        where: {
          vendorId: vendor.id,
          isAvailable: true
        }
      })
    ]);

    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: {
        id: {
          in: topProductIds
        }
      },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        category: true
      }
    });

    // Format top products with details
    const formattedTopProducts = topProducts.map(item => {
      const product = productDetails.find(p => p.id === item.productId);
      return {
        ...item,
        product
      };
    });

    // Calculate metrics
    const avgOrderValue = totalOrders > 0 ? (totalRevenue._sum.totalAmount || 0) / totalOrders : 0;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const totalCustomers = customerStats.length;
    const returningCustomers = customerStats.filter(c => c._count._all > 1).length;
    const newCustomers = totalCustomers - returningCustomers;

    // Process daily data for charts
    const dailyData = processDailyData(ordersByDay, revenueData, dateRange);

    const analytics = {
      overview: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        avgOrderValue,
        conversionRate,
        totalCustomers,
        newCustomers,
        returningCustomers,
        avgRating: ratingStats._avg.rating || 0,
        totalReviews: ratingStats._count._all || 0,
        activeProducts: productStats,
      },
      topProducts: formattedTopProducts,
      dailyData,
      period,
      dateRange
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function processDailyData(ordersByDay: any[], revenueData: any[], dateRange: { gte: Date; lte: Date }) {
  const dailyMap = new Map();
  
  // Initialize with zero values for all days in range
  const current = new Date(dateRange.gte);
  while (current <= dateRange.lte) {
    const dateStr = current.toISOString().split('T')[0];
    dailyMap.set(dateStr, {
      date: dateStr,
      orders: 0,
      revenue: 0
    });
    current.setDate(current.getDate() + 1);
  }
  
  // Fill in actual order data
  ordersByDay.forEach(item => {
    const dateStr = item.createdAt.toISOString().split('T')[0];
    if (dailyMap.has(dateStr)) {
      dailyMap.get(dateStr).orders = item._count._all;
    }
  });
  
  // Fill in actual revenue data
  revenueData.forEach(item => {
    const dateStr = item.createdAt.toISOString().split('T')[0];
    if (dailyMap.has(dateStr)) {
      dailyMap.get(dateStr).revenue = item._sum.totalAmount || 0;
    }
  });
  
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
