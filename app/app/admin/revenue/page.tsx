
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminRevenueAnalytics from '@/components/admin/admin-revenue-analytics'

export default async function AdminRevenuePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive financial reports and revenue analysis
        </p>
      </div>
      
      <AdminRevenueAnalytics />
    </div>
  )
}
