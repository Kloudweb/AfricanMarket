
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import VendorDashboard from "@/components/vendor/vendor-dashboard";
import { prisma } from "@/lib/db";

export default async function VendorDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== UserRole.VENDOR) {
    redirect("/auth/signin");
  }

  // Get vendor data with initial metrics
  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
        }
      },
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
    redirect("/vendor/onboarding");
  }

  // Get recent orders for quick view
  const recentOrders = await prisma.order.findMany({
    where: { vendorId: vendor.id },
    include: {
      customer: {
        select: {
          name: true,
          avatar: true,
        }
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
              image: true,
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // Get unread notifications
  const unreadNotifications = await prisma.vendorNotification.findMany({
    where: {
      vendorId: vendor.id,
      isRead: false,
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  // Get today's metrics
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [todayOrders, todayRevenue, lowStockProducts] = await Promise.all([
    prisma.order.count({
      where: {
        vendorId: vendor.id,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        }
      }
    }),
    prisma.order.aggregate({
      where: {
        vendorId: vendor.id,
        status: "DELIVERED",
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        }
      },
      _sum: {
        totalAmount: true,
      }
    }),
    prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        isTrackingStock: true,
        stockQuantity: { lte: 10 },
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockAlert: true,
        image: true,
      },
      take: 5
    })
  ]);

  return (
    <VendorDashboard
      vendor={vendor}
      recentOrders={recentOrders}
      unreadNotifications={unreadNotifications}
      todayStats={{
        orders: todayOrders,
        revenue: todayRevenue._sum.totalAmount || 0,
      }}
      lowStockProducts={lowStockProducts}
    />
  );
}
