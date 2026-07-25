import { useEffect, useState } from 'react'
import {
  Baby, BookOpen, Link2, TrendingUp,
  Users, X, CheckCircle2, AlertCircle, Loader2, Plus, Brain, Award
} from 'lucide-react'
import { ChartCard, CircularProgress } from '@/components/common/Charts'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { toast } from 'sonner'

export function ParentDashboard() {
  const { user } = useAuth()

  // Children state
  const [children, setChildren] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const [overview, setOverview] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOverview, setIsLoadingOverview] = useState(false)

  // Link child modal state
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [isLinking, setIsLinking] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null)


  const fetchChildren = async () => {
    setIsLoading(true)
    try {
      const [childrenRes, pendingRes] = await Promise.all([
        api.get('/parent/children'),
        api.get('/parent/pending-requests'),
      ])
      const list = childrenRes.data.data.children || []
      setChildren(list)
      setPendingRequests(pendingRes.data.data.requests || [])
      if (list.length > 0 && !selectedChild) {
        setSelectedChild(list[0])
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load children.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOverview = async (childId: string) => {
    setIsLoadingOverview(true)
    try {
      const { data } = await api.get(`/parent/children/${childId}/overview`)
      setOverview(data.data)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load child overview.')
      setOverview(null)
    } finally {
      setIsLoadingOverview(false)
    }
  }

  useEffect(() => { fetchChildren() }, [])

  useEffect(() => {
    if (selectedChild?.id) fetchOverview(selectedChild.id)
  }, [selectedChild?.id])

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentEmail.trim()) return
    setIsLinking(true)
    try {
      await api.post('/parent/children', { studentEmail: studentEmail.trim() })
      toast.success('Link request sent! Waiting for student approval.', {
        description: 'The student will see a notification to accept or reject your request.',
      })
      setStudentEmail('')
      setShowLinkModal(false)
      await fetchChildren()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send link request.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlink = async (childId: string) => {
    setIsUnlinking(childId)
    try {
      await api.delete(`/parent/children/${childId}`)
      toast.success('Student unlinked successfully.')
      const remaining = children.filter(c => c.id !== childId)
      setChildren(remaining)
      if (selectedChild?.id === childId) {
        setSelectedChild(remaining[0] || null)
        setOverview(null)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unlink student.')
    } finally {
      setIsUnlinking(null)
    }
  }

  const courseChart = overview?.courses?.map((c: any) => ({
    name: c.courseTitle.split(' ').slice(0, 2).join(' '),
    value: c.percentage,
  })) || []

  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'ST'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}!`}
        description="Monitor your child's academic journey in real time"
      >
        <Button onClick={() => setShowLinkModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Link Child
        </Button>
      </PageHeader>

      {/* ── Child Selector ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading children...
        </div>
      ) : children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Baby className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">No children linked yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Link your child's student account using their registered email to monitor their progress.
              </p>
            </div>
            <Button onClick={() => setShowLinkModal(true)}>
              <Link2 className="h-4 w-4 mr-1.5" /> Link a Student Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Child tabs with avatars */}
          <div className="flex flex-wrap gap-2 items-center">
            {children.map((child) => (
              <div key={child.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    selectedChild?.id === child.id
                      ? 'bg-primary text-primary-foreground border-primary shadow'
                      : 'bg-muted border-border hover:border-primary/50'
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={child.avatar} alt={child.name} />
                    <AvatarFallback className="text-[10px] bg-background text-foreground">
                      {getInitials(child.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{child.name}</span>
                </button>
                <button
                  onClick={() => handleUnlink(child.id)}
                  disabled={isUnlinking === child.id}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Unlink"
                >
                  {isUnlinking === child.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}

            {/* Pending request chips */}
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium border border-amber-500/40 bg-amber-500/10 text-amber-700 cursor-default"
                title="Waiting for student to accept"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{req.child?.name || 'Student'}</span>
                <span className="text-[10px] font-normal opacity-70">Pending</span>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={() => setShowLinkModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>


          {/* ── Overview for Selected Child ─────────────────────────────── */}
          {isLoadingOverview ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading overview...
            </div>
          ) : overview ? (
            <>
              {/* Stats row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Avg. Course Progress"
                  value={`${overview.stats.avgProgress}%`}
                  trend="up"
                  icon={TrendingUp}
                />
                <StatCard
                  label="Attendance"
                  value={`${overview.stats.attendancePercentage}%`}
                  change={`${overview.stats.presentCount}/${overview.stats.totalClasses} classes`}
                  trend={overview.stats.attendancePercentage >= 75 ? 'up' : 'down'}
                  icon={Users}
                  iconClassName="bg-emerald-500/10"
                />
                <StatCard
                  label="Enrolled Courses"
                  value={overview.stats.totalCourses}
                  icon={BookOpen}
                  iconClassName="bg-secondary/10"
                />
                <StatCard
                  label="Quizzes Passed"
                  value={`${overview.stats.quizPassed}/${overview.stats.quizTotal}`}
                  icon={Brain}
                  iconClassName="bg-purple-500/10"
                />
              </div>

              {/* Charts row */}
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="flex flex-col items-center justify-center p-8">
                  <CircularProgress value={overview.stats.attendancePercentage} label="Attendance" />
                  <p className="mt-4 text-sm font-medium text-center">
                    {overview.child.name}
                  </p>
                  <span className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    overview.stats.attendancePercentage >= 75
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}>
                    {overview.stats.attendancePercentage >= 75 ? 'Good Standing' : 'Needs Attention'}
                  </span>
                </Card>

                <div className="lg:col-span-2">
                  <ChartCard
                    title="Course Completion Progress"
                    data={courseChart}
                    type="bar"
                    dataKey="value"
                    xKey="name"
                  />
                </div>
              </div>

              {/* Courses list + Recent assignments + Quiz Results */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Enrolled Courses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-primary" /> Enrolled Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overview.courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Not enrolled in any courses yet.
                      </p>
                    ) : (
                      overview.courses.map((c: any) => (
                        <div key={c.courseId} className="flex items-center gap-3">
                          {c.thumbnail ? (
                            <img src={c.thumbnail} alt={c.courseTitle} className="h-10 w-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.courseTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.completedLessons}/{c.totalLessons} lessons · {c.percentage}%
                            </p>
                            <div className="mt-1 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${c.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Assignments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-4 w-4 text-primary" /> Recent Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overview.recentAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No assignment submissions yet.
                      </p>
                    ) : (
                      overview.recentAssignments.map((a: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{a.assignmentTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {new Date(a.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {a.marksObtained !== null ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-sm font-semibold text-emerald-600">
                                  {a.marksObtained}/{a.totalMarks}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs text-muted-foreground">Pending</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Quiz Attempts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Brain className="h-4 w-4 text-purple-500" /> Quiz Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!overview.recentQuizzes || overview.recentQuizzes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No quiz attempts recorded.
                      </p>
                    ) : (
                      overview.recentQuizzes.map((q: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{q.quizTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              Pass Mark: {q.passMark}%
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {q.passed ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                                {q.score}% (Passed)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600">
                                {q.score}% (Failed)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ── Link Child Modal ─────────────────────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Link a Student Account</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Enter your child's registered email address
                </p>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkChild} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Student Email Address</Label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. student@school.edu"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  The student will receive a notification and must <strong>accept</strong> your request before you can view their progress.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowLinkModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLinking || !studentEmail.trim()}>
                  {isLinking ? 'Sending Request...' : 'Send Link Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
