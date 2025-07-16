
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import VendorInventoryManager from "@/components/vendor/inventory-manager";

export default async function VendorInventoryPage() {
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

  // Get products with inventory tracking
  const products = await prisma.product.findMany({
    where: { 
      vendorId: vendor.id,
      isTrackingStock: true 
    },
    include: {
      productCategory: true,
      inventoryLogs: {
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <VendorInventoryManager
      vendor={vendor}
      products={products}
    />
  );
}
