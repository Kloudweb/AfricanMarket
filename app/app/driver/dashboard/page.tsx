
import { Suspense } from 'react'
import { ComprehensiveDriverDashboard } from '@/components/driver/comprehensive-driver-dashboard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function DriverDashboardPage() {
  return (
    <Suspense fallback={<DriverDashboardSkeleton />}>
      <ComprehensiveDriverDashboard />
    </Suspense>
  )
}

function DriverDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading driver dashboard...</p>
      </div>
    </div>
  )
}
