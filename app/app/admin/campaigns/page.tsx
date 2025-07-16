
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminCampaignManagement from '@/components/admin/admin-campaign-management'

export default async function AdminCampaignsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
        <p className="text-gray-600 mt-2">
          Create and manage promotional campaigns and marketing initiatives
        </p>
      </div>
      
      <AdminCampaignManagement />
    </div>
  )
}

