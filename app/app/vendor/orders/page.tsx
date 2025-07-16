
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import VendorOrdersManager from "@/components/vendor/orders-manager";

export default async function VendorOrdersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== UserRole.VENDOR) {
    redirect("/auth/signin");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
    select: { id: true, businessName: true }
  });

  if (!vendor) {
    redirect("/vendor/onboarding");
  }

  // Get orders with related data
  const orders = await prisma.order.findMany({
    where: { vendorId: vendor.id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
        }
      },
      driver: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              phone: true,
              avatar: true,
            }
          },
          vehicleType: true,
          vehiclePlate: true,
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
            }
          }
        }
      },
      tracking: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
      payment: {
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          amount: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <VendorOrdersManager
      vendor={vendor}
      orders={orders}
    />
  );
}
