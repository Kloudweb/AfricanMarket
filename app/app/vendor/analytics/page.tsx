
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { prisma } from "@/lib/db";
import VendorAnalytics from "@/components/vendor/analytics-dashboard";

export default async function VendorAnalyticsPage() {
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

  return (
    <VendorAnalytics vendor={vendor} />
  );
}
