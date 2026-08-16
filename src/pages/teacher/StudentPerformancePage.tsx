import { useMemo, useState } from 'react'
import { ArrowUpDown, Award, Check, Download, GraduationCap, Search, TrendingUp, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageShell } from '@/components/common/PageShell'
import { PageSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMyCourses } from '@/hooks/useCourseData'
import { useGradebook } from '@/hooks/useGradebookData'
import { useAttendanceSummary } from '@/hooks/useAttendanceData'
import { useCourseCompletion, useCourseCertificates, useIssueCertificate } from '@/hooks/useCertificateData'
import type { ApiGradebookRow } from '@/types'

type SortKey = 'name' | 'overallGrade' | 'quizAverage' | 'assignmentAverage' | 'attendance'
type SortDir = 'asc' | 'desc'

const GRADE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22c55e']
const ATTENDANCE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']

function getGradeBand(grade: number | null): string {
  if (grade === null) return 'N/A'
  if (grade >= 90) return '90-100'
  if (grade >= 80) return '80-89'
  if (grade >= 70) return '70-79'
  if (grade >= 60) return '60-69'
  return '0-59'
}

function getAttendanceBand(pct: number): string {
  if (pct >= 90) return '90-100%'
  if (pct >= 75) return '75-89%'
  if (pct >= 50) return '50-74%'
  return '0-49%'
}

function gradeToColor(grade: number | null): string {
  if (grade === null) return '#94a3b8'
  if (grade >= 90) return '#22c55e'
  if (grade >= 75) return '#16a34a'
  if (grade >= 60) return '#eab308'
  return '#ef4444'
}

function attendanceToColor(pct: number): string {
  if (pct >= 90) return '#22c55e'
  if (pct >= 75) return '#16a34a'
  if (pct >= 50) return '#eab308'
  return '#ef4444'
}

// ─── Merged student record ─────────────────────────────────────────────────

interface StudentRecord {
  userId: string
  name: string
  avatar: string | null
  quizAverage: number | null
  assignmentAverage: number | null
  overallGrade: number | null
  attendancePct: number | null
  completionPct: number | null
  hasCertificate: boolean
}

function mergeData(
  gradebookRows: ApiGradebookRow[],
  attendanceSummary: { userId: string; percentage: number }[],
  completion: { userId: string; percentage: number }[],
  certifiedUserIds: Set<string>,
): StudentRecord[] {
  const attendanceMap = new Map(attendanceSummary.map((a) => [a.userId, a.percentage]))
  const completionMap = new Map(completion.map((c) => [c.userId, c.percentage]))
  return gradebookRows.map((row) => ({
    userId: row.userId,
    name: row.name,
    avatar: row.avatar,
    quizAverage: row.quizAverage,
    assignmentAverage: row.assignmentAverage,
    overallGrade: row.overallGrade,
    attendancePct: attendanceMap.get(row.userId) ?? null,
    completionPct: completionMap.get(row.userId) ?? null,
    hasCertificate: certifiedUserIds.has(row.userId),
  }))
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function StudentPerformancePage() {
  const [courseId, setCourseId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('overallGrade')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [minGradeFilter, setMinGradeFilter] = useState<string>('all')

  const coursesQuery = useMyCourses()
  const courses = coursesQuery.data ?? []
  if (!courseId && courses.length > 0) setCourseId(courses[0].id)

  const gradebookQuery = useGradebook(courseId || undefined)
  const attendanceQuery = useAttendanceSummary(courseId || undefined)
  const completionQuery = useCourseCompletion(courseId || undefined)
  const certificatesQuery = useCourseCertificates(courseId || undefined)
  const issueCertificate = useIssueCertificate(courseId || undefined)

  const isLoading = coursesQuery.isLoading || gradebookQuery.isLoading || attendanceQuery.isLoading || completionQuery.isLoading
  const isError = coursesQuery.isError || gradebookQuery.isError || attendanceQuery.isError || completionQuery.isError

  // Merge gradebook + attendance + completion + certificate data
  const students: StudentRecord[] = useMemo(() => {
    if (!gradebookQuery.data) return []
    const certifiedUserIds = new Set((certificatesQuery.data ?? []).map((c) => c.userId))
    return mergeData(
      gradebookQuery.data.rows,
      attendanceQuery.data?.summary ?? [],
      completionQuery.data ?? [],
      certifiedUserIds,
    )
  }, [gradebookQuery.data, attendanceQuery.data, completionQuery.data, certificatesQuery.data])

  // Compute aggregate stats
  const stats = useMemo(() => {
    const graded = students.filter((s) => s.overallGrade !== null)
    const withAttendance = students.filter((s) => s.attendancePct !== null)
    const passed = graded.filter((s) => (s.overallGrade ?? 0) >= 60)

    return {
      totalStudents: students.length,
      avgGrade: graded.length > 0
        ? Math.round(graded.reduce((sum, s) => sum + (s.overallGrade ?? 0), 0) / graded.length)
        : null,
      passRate: graded.length > 0
        ? Math.round((passed.length / graded.length) * 100)
        : null,
      avgAttendance: withAttendance.length > 0
        ? Math.round(withAttendance.reduce((sum, s) => sum + (s.attendancePct ?? 0), 0) / withAttendance.length)
        : null,
    }
  }, [students])

  // Grade distribution chart data
  const gradeDistribution = useMemo(() => {
    const bands: Record<string, number> = {
      '0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0,
    }
    students.forEach((s) => {
      const band = getGradeBand(s.overallGrade)
      if (band !== 'N/A') bands[band] += 1
    })
    return Object.entries(bands).map(([range, count]) => ({ range, count }))
  }, [students])

  // Attendance distribution chart data
  const attendanceDistribution = useMemo(() => {
    const bands: Record<string, number> = {
      '0-49%': 0, '50-74%': 0, '75-89%': 0, '90-100%': 0,
    }
    students.forEach((s) => {
      if (s.attendancePct !== null) {
        const band = getAttendanceBand(s.attendancePct)
        bands[band] += 1
      }
    })
    return Object.entries(bands).map(([range, count]) => ({ range, count }))
  }, [students])

  // Filtered & sorted students
  const filteredStudents = useMemo(() => {
    let result = [...students]

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q))
    }

    // Grade filter
    if (minGradeFilter !== 'all') {
      const min = Number(minGradeFilter)
      result = result.filter((s) => (s.overallGrade ?? 0) >= min)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'overallGrade':
          cmp = (a.overallGrade ?? -1) - (b.overallGrade ?? -1)
          break
        case 'quizAverage':
          cmp = (a.quizAverage ?? -1) - (b.quizAverage ?? -1)
          break
        case 'assignmentAverage':
          cmp = (a.assignmentAverage ?? -1) - (b.assignmentAverage ?? -1)
          break
        case 'attendance':
          cmp = (a.attendancePct ?? -1) - (b.attendancePct ?? -1)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [students, search, minGradeFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
    return <ArrowUpDown className={`ml-1 h-3 w-3 ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (coursesQuery.isSuccess && courses.length === 0) {
    return (
      <PageShell title="Student Performance" description="View performance analytics for your students">
        <EmptyState
          icon={TrendingUp}
          title="Create a course first"
          description="You need to create a course and have enrolled students before you can view performance data."
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Student Performance"
      description="Analyze student grades, attendance, and overall performance"
      actions={
        <div className="flex items-center gap-2">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {students.length > 0 && (
            <Button variant="outline" size="icon" disabled title="Export coming soon">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState
          message="Could not load performance data. Please try again."
          onRetry={() => { gradebookQuery.refetch(); attendanceQuery.refetch() }}
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No data yet"
          description="Once students start taking quizzes and submitting assignments, their performance data will appear here."
        />
      ) : (
        <div className="space-y-6">
          {/* ─── Stats Row ──────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Students"
              value={stats.totalStudents}
              icon={Users}
            />
            <StatCard
              label="Average Grade"
              value={stats.avgGrade !== null ? `${stats.avgGrade}%` : '—'}
              icon={GraduationCap}
              change={stats.avgGrade !== null ? (stats.avgGrade >= 60 ? 'Above passing' : 'Below passing') : undefined}
              trend={stats.avgGrade !== null ? (stats.avgGrade >= 60 ? 'up' : 'down') : undefined}
            />
            <StatCard
              label="Pass Rate"
              value={stats.passRate !== null ? `${stats.passRate}%` : '—'}
              icon={TrendingUp}
              change={stats.passRate !== null ? (stats.passRate >= 60 ? 'Good' : 'Needs improvement') : undefined}
              trend={stats.passRate !== null ? (stats.passRate >= 60 ? 'up' : 'down') : undefined}
            />
            <StatCard
              label="Avg Attendance"
              value={stats.avgAttendance !== null ? `${stats.avgAttendance}%` : '—'}
              icon={Users}
              iconClassName="bg-emerald-500/10"
              change={stats.avgAttendance !== null ? (stats.avgAttendance >= 75 ? 'Good' : 'Needs improvement') : undefined}
              trend={stats.avgAttendance !== null ? (stats.avgAttendance >= 75 ? 'up' : 'down') : undefined}
            />
          </div>

          {/* ─── Charts ─────────────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeDistribution.every((d) => d.count === 0) ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No graded students yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="range" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                        {gradeDistribution.map((entry, index) => (
                          <Cell key={entry.range} fill={GRADE_COLORS[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Attendance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceDistribution.every((d) => d.count === 0) ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No attendance data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={attendanceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="range" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                        {attendanceDistribution.map((entry, index) => (
                          <Cell key={entry.range} fill={ATTENDANCE_COLORS[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Student Table ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Students ({filteredStudents.length})</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full pl-9 sm:w-[200px]"
                  />
                </div>
                <Select value={minGradeFilter} onValueChange={setMinGradeFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[150px]">
                    <SelectValue placeholder="Min grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    <SelectItem value="90">90%+ (A)</SelectItem>
                    <SelectItem value="80">80%+ (B)</SelectItem>
                    <SelectItem value="70">70%+ (C)</SelectItem>
                    <SelectItem value="60">60%+ (D)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                        <span className="flex items-center">Student <SortIcon columnKey="name" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('quizAverage')}>
                        <span className="flex items-center">Quiz Avg <SortIcon columnKey="quizAverage" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('assignmentAverage')}>
                        <span className="flex items-center">Assignment Avg <SortIcon columnKey="assignmentAverage" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('overallGrade')}>
                        <span className="flex items-center">Overall Grade <SortIcon columnKey="overallGrade" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('attendance')}>
                        <span className="flex items-center">Attendance <SortIcon columnKey="attendance" /></span>
                      </TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                          No students match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.userId} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.quizAverage !== null ? (
                              <span className="font-medium" style={{ color: gradeToColor(student.quizAverage) }}>
                                {student.quizAverage}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.assignmentAverage !== null ? (
                              <span className="font-medium" style={{ color: gradeToColor(student.assignmentAverage) }}>
                                {student.assignmentAverage}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.overallGrade !== null ? (
                              <Badge
                                variant={student.overallGrade >= 60 ? 'default' : 'destructive'}
                                className="font-mono text-xs"
                              >
                                {student.overallGrade}%
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">No grade</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.attendancePct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${student.attendancePct}%`,
                                      backgroundColor: attendanceToColor(student.attendancePct),
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: attendanceToColor(student.attendancePct) }}
                                >
                                  {student.attendancePct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.hasCertificate ? (
                              <Badge variant="secondary" className="gap-1">
                                <Check className="h-3 w-3" />
                                Issued
                              </Badge>
                            ) : student.completionPct === 100 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={issueCertificate.isPending}
                                onClick={() => issueCertificate.mutate(student.userId)}
                              >
                                <Award className="mr-1.5 h-3.5 w-3.5" />
                                Issue Certificate
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {student.completionPct ?? 0}% complete
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  )
}