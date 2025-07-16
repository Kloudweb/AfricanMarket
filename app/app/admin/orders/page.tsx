
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminOrderMonitoring from '@/components/admin/admin-order-monitoring'

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Order Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Monitor all orders, track performance, and handle interventions
        </p>
      </div>
      
      <AdminOrderMonitoring />
    </div>
  )
}
