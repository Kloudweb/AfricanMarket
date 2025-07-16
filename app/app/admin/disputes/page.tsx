
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminDisputeResolution from '@/components/admin/admin-dispute-resolution'

export default async function AdminDisputesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution</h1>
        <p className="text-gray-600 mt-2">
          Manage customer disputes and support cases
        </p>
      </div>
      
      <AdminDisputeResolution />
    </div>
  )
}
