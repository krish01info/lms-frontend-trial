import { BookOpen, DollarSign, TrendingUp, Users } from 'lucide-react'
import { ChartCard } from '@/components/common/Charts'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { CardSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminDashboardStats } from '@/hooks/useAdmin'
import { formatINR } from '@/utils/transformers'

export function AdminDashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading, isError, refetch } = useAdminDashboardStats()

  const roleDistribution = stats
    ? Object.entries(stats.usersByRole).map(([role, count]) => ({ name: role, value: count }))
    : []

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description={`Welcome back, ${user?.name}`} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Couldn't load dashboard stats." onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Users" value={stats!.totalUsers.toLocaleString()} icon={Users} />
            <StatCard label="Active Courses" value={stats!.activeCourses} icon={BookOpen} iconClassName="bg-secondary/10" />
            <StatCard
              label="Revenue"
              value={formatINR(stats!.totalRevenue)}
              icon={DollarSign}
              iconClassName="bg-emerald-500/10"
            />
            <StatCard label="Completion Rate" value={`${stats!.completionRate}%`} icon={TrendingUp} />
          </div>

          {roleDistribution.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="User Distribution" data={roleDistribution} type="pie" />
            </div>
          )}
        </>
      )}
    </div>
  )
}