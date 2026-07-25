import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, CheckCircle2, XCircle,
  TrendingUp, Users, Award, Clock
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import api from '@/services/api'

// ─── Child selector ──────────────────────────────────────────────────────────
function useChildren() {
  return useQuery({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const res = await api.get('/parent/children')
      return res.data.data.children as Array<{ id: string; name: string; email: string; avatar?: string }>
    },
  })
}

function useChildOverview(childId: string | null) {
  return useQuery({
    queryKey: ['parent-child-overview', childId],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${childId}/overview`)
      return res.data.data
    },
    enabled: !!childId,
  })
}
function useChildNotifications(childId: string | null, unreadOnly = false) {
  return useQuery({
    queryKey: ['parent-child-notifications', childId, unreadOnly],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${childId}/notifications`, { params: { unread: unreadOnly } })
      return res.data.data as { items: any[]; unreadCount: number }
    },
    enabled: !!childId,
  })
}
function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

// ─── Shared wrapper ───────────────────────────────────────────────────────────
function ParentChildWrapper({ children: content }: { children: (overview: any, selectedChildId: string) => React.ReactNode }) {
  const { data: children = [], isLoading: isLoadingChildren } = useChildren()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) setSelectedChildId(children[0].id)
  }, [children])

  const { data: overview, isLoading: isLoadingOverview } = useChildOverview(selectedChildId)

  if (isLoadingChildren) return (
    <div className="space-y-4">
      <div className="h-10 w-80 rounded-xl bg-muted animate-pulse" />
      <div className="h-40 w-full rounded-2xl bg-muted animate-pulse" />
    </div>
  )

  if (children.length === 0) return (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground">
        No linked children found. Link a student account from the Dashboard.
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Child tabs */}
      <div className="flex flex-wrap gap-2">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              selectedChildId === child.id
                ? 'bg-primary text-primary-foreground border-primary shadow'
                : 'bg-muted border-border hover:border-primary/50'
            }`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={child.avatar} />
              <AvatarFallback className="text-[10px]">{getInitials(child.name)}</AvatarFallback>
            </Avatar>
            {child.name}
          </button>
        ))}
      </div>

      {isLoadingOverview ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 w-full rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : overview ? content(overview, selectedChildId!) : null}
    </div>
  )
}

// ─── Child Performance Page ───────────────────────────────────────────────────
export function ParentPerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Child Performance" description="Monitor your child's academic performance" />
      <ParentChildWrapper>
        {(overview) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Avg. Progress" value={`${overview.stats.avgProgress}%`} icon={TrendingUp} trend="up" />
              <StatCard label="Courses Enrolled" value={overview.stats.totalCourses} icon={BookOpen} />
              <StatCard label="Quizzes Passed" value={`${overview.stats.quizPassed}/${overview.stats.quizTotal}`} icon={Award} />
              <StatCard label="Attendance" value={`${overview.stats.attendancePercentage}%`} icon={Users} />
            </div>

            <Card>
              <CardHeader><CardTitle>Course Progress</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {overview.courses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No enrolled courses yet.</p>
                )}
                {overview.courses.map((course: any) => (
                  <div key={course.courseId} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium line-clamp-1">{course.courseTitle}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{course.percentage}%</span>
                    </div>
                    <Progress value={course.percentage} />
                    <p className="text-xs text-muted-foreground">{course.completedLessons}/{course.totalLessons} lessons</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recent Quiz Results</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {overview.recentQuizzes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No quiz attempts yet.</p>
                )}
                {overview.recentQuizzes.map((quiz: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{quiz.quizTitle}</p>
                      <p className="text-xs text-muted-foreground">Score: {quiz.score} / Pass: {quiz.passMark}</p>
                    </div>
                    {quiz.passed
                      ? <Badge className="bg-emerald-500/10 text-emerald-600 border-0"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Passed</Badge>
                      : <Badge className="bg-red-500/10 text-red-600 border-0"><XCircle className="h-3.5 w-3.5 mr-1" />Failed</Badge>
                    }
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </ParentChildWrapper>
    </div>
  )
}

// ─── Child Attendance Page ────────────────────────────────────────────────────
export function ParentAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Child Attendance" description="Track your child's attendance record" />
      <ParentChildWrapper>
        {(overview) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total Classes" value={overview.stats.totalClasses} icon={Clock} />
              <StatCard label="Present" value={overview.stats.presentCount} icon={CheckCircle2} iconClassName="bg-emerald-500/10" />
              <StatCard label="Attendance %" value={`${overview.stats.attendancePercentage}%`} icon={Users} trend={overview.stats.attendancePercentage >= 75 ? 'up' : 'down'} />
            </div>
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-4xl font-bold text-foreground mb-2">{overview.stats.attendancePercentage}%</p>
                <p className="text-sm">Overall Attendance Rate</p>
                <Progress value={overview.stats.attendancePercentage} className="mt-4 max-w-xs mx-auto" />
                <p className="text-xs mt-2">{overview.stats.presentCount} present out of {overview.stats.totalClasses} total classes</p>
              </CardContent>
            </Card>
          </div>
        )}
      </ParentChildWrapper>
    </div>
  )
}

// ─── Child Assignments Page ───────────────────────────────────────────────────
export function ParentAssignmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Child Assignments" description="View your child's assignment submissions" />
      <ParentChildWrapper>
        {(overview) => (
          <Card>
            <CardHeader><CardTitle>Recent Submissions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {overview.recentAssignments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No assignments submitted yet.</p>
              )}
              {overview.recentAssignments.map((a: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-2xl border border-border p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{a.assignmentTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted: {new Date(a.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {a.dueDate && ` · Due: ${new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {a.marksObtained != null && (
                      <p className="text-sm font-semibold">{a.marksObtained}/{a.totalMarks}</p>
                    )}
                    {a.grade && <Badge variant="secondary">{a.grade}</Badge>}
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}
      </ParentChildWrapper>
    </div>
  )
}

// ─── Academic Progress Page ───────────────────────────────────────────────────
export { ParentPerformancePage as ParentProgressPage }

// ─── Child Notifications Page ─────────────────────────────────────────────────
export function ParentNotificationsPage() {
  const { data: children = [], isLoading: isLoadingChildren } = useChildren()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) setSelectedChildId(children[0].id)
  }, [children])

  const { data, isLoading: isLoadingNotifications } = useChildNotifications(selectedChildId)
  const notifications = data?.items ?? []
  const unreadCount = data?.unreadCount ?? 0

  if (isLoadingChildren) return (
    <div className="space-y-4">
      <div className="h-10 w-80 rounded-xl bg-muted animate-pulse" />
      <div className="h-40 w-full rounded-2xl bg-muted animate-pulse" />
    </div>
  )

  if (children.length === 0) return (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground">
        No linked children found. Link a student account from the Dashboard.
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Child Notifications"
        description="Updates about your child's courses, grades, and activity"
      >
        {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              selectedChildId === child.id
                ? 'bg-primary text-primary-foreground border-primary shadow'
                : 'bg-muted border-border hover:border-primary/50'
            }`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={child.avatar} />
              <AvatarFallback className="text-[10px]">{getInitials(child.name)}</AvatarFallback>
            </Avatar>
            {child.name}
          </button>
        ))}
      </div>

      {isLoadingNotifications ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 w-full rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No notifications for this child yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => (
            <Card key={n.id} className={!n.isRead ? 'border-primary/40' : undefined}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.isRead && <Badge variant="secondary">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Child Enrolled Courses Page ──────────────────────────────────────────────
export function ParentCoursesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrolled Courses"
        description="View all courses your child is currently opted into and their completion status"
      />
      <ParentChildWrapper>
        {(overview) => (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{overview.courses?.length || 0}</span> enrolled courses for{' '}
                <span className="font-semibold text-foreground">{overview.child?.name}</span>
              </p>
            </div>

            {!overview.courses || overview.courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold">No Enrolled Courses</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    This student has not enrolled in any courses yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {overview.courses.map((course: any) => (
                  <Card key={course.courseId} className="overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {course.thumbnail ? (
                        <div className="h-36 w-full overflow-hidden bg-muted">
                          <img
                            src={course.thumbnail}
                            alt={course.courseTitle}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="h-36 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center">
                          <BookOpen className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base line-clamp-2">{course.courseTitle}</h3>
                          <Badge variant="secondary" className="shrink-0 font-medium">
                            {course.percentage}%
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{course.completedLessons} / {course.totalLessons} Lessons</span>
                          </div>
                          <Progress value={course.percentage} className="h-2" />
                        </div>
                      </CardContent>
                    </div>

                    <div className="border-t bg-muted/30 p-3 px-5 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Status</span>
                      <span className={`font-semibold ${course.percentage === 100 ? 'text-emerald-600' : 'text-primary'}`}>
                        {course.percentage === 100 ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </ParentChildWrapper>
    </div>
  )
}