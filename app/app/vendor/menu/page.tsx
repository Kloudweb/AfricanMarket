
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { prisma } from "@/lib/db";
import VendorMenuManager from "@/components/vendor/menu-manager";

export default async function VendorMenuPage() {
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

  // Get categories and products
  const [categories, products] = await Promise.all([
    prisma.productCategory.findMany({
      where: { vendorId: vendor.id },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" }
      ]
    }),
    prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: {
        productCategory: true,
        _count: {
          select: {
            orderItems: true,
            reviews: true,
          }
        }
      },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "desc" }
      ]
    })
  ]);

  return (
    <VendorMenuManager
      vendor={vendor}
      categories={categories}
      products={products}
    />
  );
}
