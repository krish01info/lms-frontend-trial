import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  GraduationCap,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AssignmentCard } from '@/components/common/AssignmentCard'
import { ChartCard } from '@/components/common/Charts'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { transformCourse, transformAssignment } from '@/utils/transformers'
import api from '@/services/api'
import { toast } from 'sonner'

const quickActions = [
  { label: 'My Courses', href: '/student/courses', icon: BookOpen },
  { label: 'Assignments', href: '/student/assignments', icon: ClipboardList },
  { label: 'Quizzes', href: '/student/quizzes', icon: GraduationCap },
  { label: 'Calendar', href: '/student/calendar', icon: Calendar },
]

// Converts an ISO timestamp into a relative "time ago" string for the activity feed.
function timeAgo(dateString: string): string {
  const now = new Date().getTime()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

export function StudentDashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Live enrolled courses — shares cache with CoursesPage/ProfilePage
  const { data: courseData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ['enrolled-courses'],
    queryFn: async () => {
      const res = await api.get('/courses/enrolled')
      return res.data.data.courses.map(transformCourse)
    },
  })

  // Live progress — shares cache with ProgressPage/ProfilePage/CertificatesPage
  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: ['progress-my'],
    queryFn: async () => {
      const res = await api.get('/progress/my')
      return res.data.data.progress
    },
  })

  // Live weekly study hours — powers both the chart and the Learning Hours stat card
  const { data: weeklyHoursData, isLoading: isWeeklyHoursLoading } = useQuery({
    queryKey: ['progress-weekly-hours'],
    queryFn: async () => {
      const res = await api.get('/progress/my/weekly-hours')
      return res.data.data.weeklyHours as Array<{ name: string; hours: number }>
    },
  })

  // Live recent activity — synthesized backend feed from lessons/quizzes/assignments
  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activity-my'],
    queryFn: async () => {
      const res = await api.get('/activity/my')
      return res.data.data.activity as Array<{
        id: string
        type: string
        action: string
        courseId: string
        timestamp: string
      }>
    },
  })

  // Live attendance — shares cache with AttendancePage/ProfilePage/ProgressPage
  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['attendance-my'],
    queryFn: async () => {
      const res = await api.get('/attendance/my')
      return res.data.data
    },
  })

  // Live GPA — shares cache with ResultsPage
  const { data: resultsData, isLoading: isResultsLoading } = useQuery({
    queryKey: ['results-my'],
    queryFn: async () => {
      const res = await api.get('/results/my')
      return res.data.data
    },
  })

  // Pending parent link requests — poll every 30s
  const { data: linkRequestData } = useQuery({
    queryKey: ['student-link-requests'],
    queryFn: async () => {
      const res = await api.get('/users/link-requests')
      return res.data.data.requests as Array<{
        id: string
        parent: { id: string; name: string; email: string; avatar?: string }
        createdAt: string
      }>
    },
    refetchInterval: 30000,
  })

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'accept' | 'reject' }) => {
      await api.post(`/users/link-requests/${requestId}/respond`, { action })
      return action
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ['student-link-requests'] })
      toast.success(action === 'accept' ? 'Parent linked to your account!' : 'Request rejected.')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to respond to request.')
    },
  })

  const pendingRequests = linkRequestData || []

  // Live announcements — institute-wide + enrolled-course announcements
  const { data: announcementsData, isLoading: isAnnouncementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get('/announcements')
      return res.data.data.announcements
    },
  })

  // Live assignments — enrolled-course assignments; status derived client-side
  // from dueDate only (API doesn't return per-student submission status here)
  const { data: assignmentsData, isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments')
      return res.data.data.assignments.map(transformAssignment)
    },
  })

  const courses = courseData || []
  const progress = progressData || []
  const announcements = announcementsData || []
  const allAssignments = assignmentsData || []
  const weeklyHours = weeklyHoursData || []
  const recentActivity = activityData || []
  const isLoading = isCoursesLoading || isProgressLoading || isAttendanceLoading
  const attendancePercentage = attendanceData?.overallPercentage ?? 0

  // Real GPA from /results/my — same source ResultsPage uses, no more sample data
  const gpa = resultsData?.gpa ?? null
  const percentile = resultsData?.percentile ?? null

  // Sum this week's hours for the stat card from the same weekly-hours response
  const totalWeeklyHours = weeklyHours.reduce((sum, day) => sum + day.hours, 0)

  const dueAssignments = allAssignments.filter((a: any) => a.status === 'pending' || a.status === 'overdue')

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}! 👋`}
        description="Here's what's happening with your learning today."
      />

      {/* ── Parent Link Request Approval Banner ─────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Parent Link Request</p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{req.parent.name}</span>
                    {' '}({req.parent.email}) wants to monitor your account
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ requestId: req.id, action: 'reject' })}
                >
                  <XCircle className="h-4 w-4 mr-1.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ requestId: req.id, action: 'accept' })}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Accept
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-white sm:p-8"
      >
        <div className="relative z-10">
          <p className="text-sm text-white/80">{user?.grade}</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Keep up the great work!</h2>
          <p className="mt-2 max-w-md text-white/80">
            You have {dueAssignments.length} assignments due this week.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="glass" asChild>
              <Link to="/student/assignments">View Assignments</Link>
            </Button>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link to="/student/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-white/5" />
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${Math.round(attendancePercentage)}%`} icon={Users} />
        <StatCard
          label="Current GPA"
          value={isResultsLoading ? '—' : gpa !== null ? gpa.toFixed(2) : 'N/A'}
          change={!isResultsLoading && percentile !== null ? `Top ${100 - percentile}% of class` : undefined}
          trend="up"
          icon={Award}
          iconClassName="bg-emerald-500/10"
        />
        <StatCard
          label="Courses Active"
          value={isCoursesLoading ? '—' : courses.length}
          icon={BookOpen}
          iconClassName="bg-secondary/10"
        />
        <StatCard
          label="Learning Hours"
          value={isWeeklyHoursLoading ? '—' : `${totalWeeklyHours.toFixed(1)}h`}
          change="This week"
          trend="neutral"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ChartCard title="Weekly Learning Progress" data={weeklyHours} dataKey="hours" type="area" />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assignments Due</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/student/assignments">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAssignmentsLoading && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {!isAssignmentsLoading && dueAssignments.length === 0 && (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No assignments due right now.
                </p>
              )}

              {!isAssignmentsLoading &&
                dueAssignments.map((a: any) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && progress.length === 0 && (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No progress yet. Enroll in a course to get started.
                </p>
              )}

              {!isLoading &&
                progress.slice(0, 3).map((course: any) => (
                  <div key={course.courseId} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium line-clamp-1">{course.courseTitle}</span>
                      <span className="text-muted-foreground">{course.percentage}%</span>
                    </div>
                    <Progress value={course.percentage} />
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 p-4 text-center transition-colors hover:bg-muted"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAnnouncementsLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!isAnnouncementsLoading && announcements.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No announcements yet.
              </p>
            )}

            {!isAnnouncementsLoading &&
              announcements.map((item: any) => (
                <div key={item.id} className="flex items-start justify-between rounded-2xl border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant="secondary">New</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isActivityLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!isActivityLoading && recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No recent activity yet.
              </p>
            )}

            {!isActivityLoading &&
              recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}