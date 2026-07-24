import { useState } from 'react'
import {
  Loader2,
  MoreVertical,
  Users as UsersIcon,
  BookOpen,
  CreditCard,
  FileText,
  ScrollText,
} from 'lucide-react'
import { formatINR } from '@/utils/transformers'
import { PageShell } from '@/components/common/PageShell'
import { Pagination } from '@/components/common/Pagination'
import { TableSkeleton, CardSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAdminUsers,
  useUpdateUser,
  useSetUserStatus,
  useDeleteUser,
  useAdminCourses,
  useSetCourseStatus,
  useAdminPayments,
  useAdminPaymentStats,
  useAdminDashboardStats,
  useGenerateReport,
  useAdminAnalytics,
  useAdminSettings,
  useUpdateSetting,
  useAdminAuditLogs,
  type AdminRole,
  type ReportType,
  type ReportRow,
  type AdminSettings,
} from '@/hooks/useAdmin'

export { NotificationsPage as AdminNotificationsPage } from '@/pages/student/NotificationsPage'

// ─────────────────────────────────────────────────────────────────────────────
// UsersPage — real user management: search, filter by role, edit role,
// activate/deactivate, soft-delete. All wired to /api/v1/admin/users.
// ─────────────────────────────────────────────────────────────────────────────
export function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; role: AdminRole } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError, refetch } = useAdminUsers({
    search: search || undefined,
    role: role === 'all' ? undefined : role,
    page,
    limit: 10,
  })
  const updateUser = useUpdateUser()
  const setUserStatus = useSetUserStatus()
  const deleteUser = useDeleteUser()

  return (
    <PageShell
      title="Manage Users"
      description="View and manage platform users"
      searchable
      searchPlaceholder="Search by name or email..."
      onSearch={(v) => { setSearch(v); setPage(1) }}
      actions={
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="STUDENT">Student</SelectItem>
            <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="PARENT">Parent</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <Card><CardContent className="p-6"><TableSkeleton rows={6} /></CardContent></Card>
      ) : isError ? (
        <ErrorState message="Couldn't load users." onRetry={refetch} />
      ) : data && data.users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" description="Try a different search or filter." />
      ) : (
        <>
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-4 text-sm font-medium">{u.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{u.email}</td>
                    <td className="p-4"><Badge variant="secondary">{u.role}</Badge></td>
                    <td className="p-4">
                      <Badge variant={u.isActive ? 'success' : 'destructive'}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser({ id: u.id, name: u.name, role: u.role })}>
                            Edit role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setUserStatus.mutate({ userId: u.id, isActive: !u.isActive })}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmingDelete({ id: u.id, name: u.name })}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>

          {data!.pagination.totalPages > 1 && (
            <Pagination
              currentPage={data!.pagination.page}
              totalPages={data!.pagination.totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          )}
        </>
      )}

      {/* Edit role dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role — {editingUser?.name}</DialogTitle>
            <DialogDescription>Change what this user can access on the platform.</DialogDescription>
          </DialogHeader>
          <Select
            value={editingUser?.role}
            onValueChange={(v) => editingUser && setEditingUser({ ...editingUser, role: v as AdminRole })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="PARENT">Parent</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={updateUser.isPending}
            onClick={() => {
              if (!editingUser) return
              updateUser.mutate(
                { userId: editingUser.id, role: editingUser.role },
                { onSuccess: () => setEditingUser(null) }
              )
            }}
          >
            {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmingDelete} onOpenChange={(open) => !open && setConfirmingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmingDelete?.name}?</DialogTitle>
            <DialogDescription>
              This deactivates their account. They won't be able to log in, but their data (courses,
              enrollments, payments) is preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmingDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteUser.isPending}
              onClick={() => {
                if (!confirmingDelete) return
                deleteUser.mutate(confirmingDelete.id, { onSuccess: () => setConfirmingDelete(null) })
              }}
            >
              {deleteUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminCoursesPage — every course on the platform, admin can override status.
// ─────────────────────────────────────────────────────────────────────────────
export function AdminCoursesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useAdminCourses({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: 10,
  })
  const setCourseStatus = useSetCourseStatus()

  return (
    <PageShell
      title="Manage Courses"
      description={data ? `${data.pagination.total} total courses` : undefined}
      searchable
      searchPlaceholder="Search courses..."
      onSearch={(v) => { setSearch(v); setPage(1) }}
      actions={
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-5"><TableSkeleton rows={1} /></CardContent></Card>)}</div>
      ) : isError ? (
        <ErrorState message="Couldn't load courses." onRetry={refetch} />
      ) : data && data.courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" description="Try a different search or filter." />
      ) : (
        <>
          <div className="space-y-3">
            {data!.courses.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.title}</p>
                      <Badge variant={c.status === 'PUBLISHED' ? 'success' : c.status === 'DRAFT' ? 'warning' : 'secondary'}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.enrollmentCount} students · by {c.instructor.name}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">Change status</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCourseStatus.mutate({ courseId: c.id, status: 'PUBLISHED' })}>
                        Publish
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCourseStatus.mutate({ courseId: c.id, status: 'DRAFT' })}>
                        Move to draft
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCourseStatus.mutate({ courseId: c.id, status: 'ARCHIVED' })}>
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>

          {data!.pagination.totalPages > 1 && (
            <Pagination
              currentPage={data!.pagination.page}
              totalPages={data!.pagination.totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          )}
        </>
      )}
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminPaymentsPage — platform revenue stats + transaction list.
// ─────────────────────────────────────────────────────────────────────────────
export function AdminPaymentsPage() {
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data: stats, isLoading: statsLoading } = useAdminPaymentStats()
  const { data, isLoading, isError, refetch } = useAdminPayments({
    status: status === 'all' ? undefined : status,
    page,
    limit: 10,
  })

  return (
    <PageShell
      title="Payments"
      description="Platform payment overview"
      actions={
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">
            {statsLoading ? '—' : formatINR(stats?.totalRevenue ?? 0)}
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-amber-600">
            {statsLoading ? '—' : formatINR(stats?.pending ?? 0)}
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold text-emerald-600">
            {statsLoading ? '—' : formatINR(stats?.thisMonth ?? 0)}
          </p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><TableSkeleton rows={6} /></CardContent></Card>
      ) : isError ? (
        <ErrorState message="Couldn't load payments." onRetry={refetch} />
      ) : data && data.payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments found" description="Try a different filter." />
      ) : (
        <>
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Student', 'Course', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-4 text-sm font-medium">{p.user?.name ?? 'Unknown user'}</td>
                    <td className="p-4 text-sm text-muted-foreground">{p.course?.title ?? 'Unknown course'}</td>
                    <td className="p-4 text-sm">{formatINR(Number(p.amount))}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          p.status === 'COMPLETED' ? 'success' : p.status === 'PENDING' ? 'warning' : 'destructive'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>

          {data!.pagination.totalPages > 1 && (
            <Pagination
              currentPage={data!.pagination.page}
              totalPages={data!.pagination.totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          )}
        </>
      )}
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReportsPage — generates a real report from the DB on demand, previews it
// as a table, and lets you download it as CSV. No storage — generated fresh
// each time "Generate" is clicked.
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_DEFS: { type: ReportType; label: string }[] = [
  { type: 'user-activity', label: 'User Activity Report' },
  { type: 'financial', label: 'Financial Report' },
  { type: 'course-performance', label: 'Course Performance' },
  { type: 'attendance-summary', label: 'Attendance Summary' },
]

function downloadCsv(filename: string, rows: ReportRow[]) {
  if (rows.length === 0) return
  const columns = Object.keys(rows[0])
  const csv = [
    columns.join(','),
    ...rows.map((r) => columns.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const generateReport = useGenerateReport()
  const [activeReport, setActiveReport] = useState<ReportType | null>(null)
  const [previewRows, setPreviewRows] = useState<ReportRow[]>([])

  const handleGenerate = (type: ReportType) => {
    setActiveReport(type)
    generateReport.mutate(type, {
      onSuccess: (rows) => setPreviewRows(rows),
    })
  }

  return (
    <PageShell title="Reports" description="Generate platform reports">
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORT_DEFS.map((r) => (
          <Card key={r.type}>
            <CardContent className="p-5 flex justify-between items-center">
              <span className="font-medium">{r.label}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={generateReport.isPending && activeReport === r.type}
                  onClick={() => handleGenerate(r.type)}
                >
                  {generateReport.isPending && activeReport === r.type && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate
                </Button>
                {activeReport === r.type && previewRows.length > 0 && (
                  <Button size="sm" onClick={() => downloadCsv(`${r.type}.csv`, previewRows)}>
                    Download CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeReport && (
        <Card className="mt-6">
          <CardContent className="p-0">
            {generateReport.isPending ? (
              <div className="p-6"><TableSkeleton rows={5} /></div>
            ) : previewRows.length === 0 ? (
              <EmptyState icon={FileText} title="No data" description="This report has no rows to show yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {Object.keys(previewRows[0]).map((col) => (
                        <th key={col} className="p-4 text-left text-sm font-medium capitalize">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.keys(previewRows[0]).map((col) => (
                          <td key={col} className="p-4 text-sm text-muted-foreground">{String(row[col])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 50 && (
                  <p className="p-4 text-xs text-muted-foreground">
                    Showing first 50 of {previewRows.length} rows — download the CSV for the full set.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsPage — real, calculable metrics only. The original mock cards
// (DAU, avg. session) needed session-tracking infra this stack doesn't have,
// so they're swapped for numbers the DB can actually answer.
// ─────────────────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useAdminAnalytics()

  const cards = data
    ? [
        { l: 'New Users (7d)', v: data.newUsersThisWeek },
        { l: 'Course Completions', v: data.courseCompletions },
        { l: 'Active Enrollments', v: data.activeEnrollments },
        { l: 'Lessons Completed', v: data.lessonsCompleted },
      ]
    : []

  return (
    <PageShell title="Analytics" description="Platform-wide analytics">
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState message="Couldn't load analytics." onRetry={refetch} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((s) => (
            <Card key={s.l}><CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{s.l}</p>
              <p className="text-2xl font-bold">{s.v.toLocaleString()}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RolesPage — real counts per role. Dropped the old "Edit Permissions" button
// since the schema has a fixed Role enum, not a flexible permission system —
// role changes happen from the Users page instead.
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_META: Record<string, string> = {
  STUDENT: 'Enroll in courses, submit assignments, take quizzes',
  INSTRUCTOR: 'Create courses, grade assignments, post announcements',
  ADMIN: 'Full platform access — manage users, courses, payments',
  SUPER_ADMIN: 'Full platform access plus destructive actions (delete, promote to admin)',
  PARENT: "View child's progress and payments",
}

export function RolesPage() {
  const { data: stats, isLoading, isError, refetch } = useAdminDashboardStats()

  return (
    <PageShell title="Role Management" description="Platform users by role">
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState message="Couldn't load role counts." onRetry={refetch} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(stats?.usersByRole ?? {}).map(([role, count]) => (
            <Card key={role}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{role}</p>
                    <p className="text-sm text-muted-foreground mt-1">{ROLE_META[role] || '—'}</p>
                  </div>
                  <Badge>{count} users</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsPage — real, persisted via SystemSetting rows (one row per key).
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { data: settings, isLoading } = useAdminSettings()
  const updateSetting = useUpdateSetting()
  const [platformName, setPlatformName] = useState('')

  const toggleFields: { key: keyof AdminSettings; label: string; desc: string }[] = [
    { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disable access for maintenance' },
    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send system email notifications' },
    { key: 'autoBackup', label: 'Auto Backup', desc: 'Daily database backup' },
  ]

  return (
    <PageShell title="System Settings" description="Configure platform settings">
      <Card><CardContent className="p-6 space-y-6">
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : (
          <>
            {toggleFields.map((f) => (
              <div key={f.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{f.label}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
                <Switch
                  checked={settings?.[f.key] === 'true'}
                  onCheckedChange={(checked) =>
                    updateSetting.mutate({ key: f.key, value: String(checked) })
                  }
                />
              </div>
            ))}
            <div className="space-y-2">
              <p className="font-medium">Platform Name</p>
              <Input
                defaultValue={settings?.platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>
            <Button
              disabled={updateSetting.isPending || !platformName}
              onClick={() => updateSetting.mutate({ key: 'platformName', value: platformName })}
            >
              {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </>
        )}
      </CardContent></Card>
    </PageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditLogsPage — real trail of admin actions (role changes, activate/
// deactivate, course status changes, settings updates), written by
// admin.service.js's logAudit() helper on every mutating admin action.
// ─────────────────────────────────────────────────────────────────────────────
export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAdminAuditLogs({ page, limit: 15 })

  return (
    <PageShell title="Audit Logs" description="Admin activity log">
      {isLoading ? (
        <Card><CardContent className="p-6"><TableSkeleton rows={6} /></CardContent></Card>
      ) : isError ? (
        <ErrorState message="Couldn't load audit logs." onRetry={refetch} />
      ) : data && data.logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Admin actions will show up here as they happen." />
      ) : (
        <>
          <Card><CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Action', 'Admin', 'Target', 'Details', 'Time'].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="p-4 text-sm"><Badge variant="secondary">{log.action}</Badge></td>
                    <td className="p-4 text-sm text-muted-foreground">{log.adminName}</td>
                    <td className="p-4 text-sm text-muted-foreground">{log.targetType || '—'}</td>
                    <td className="p-4 text-sm text-muted-foreground">{log.details || '—'}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>

          {data!.pagination.totalPages > 1 && (
            <Pagination
              currentPage={data!.pagination.page}
              totalPages={data!.pagination.totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          )}
        </>
      )}
    </PageShell>
  )
}