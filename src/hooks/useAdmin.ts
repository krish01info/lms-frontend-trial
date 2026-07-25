import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Admin-panel-specific types. Kept local to this hook (not merged into
// src/types/index.ts) since the shape here mirrors the raw backend response
// (UPPERCASE role/status, isActive, etc.) rather than the display-oriented
// mock types the rest of the app uses.
// ─────────────────────────────────────────────────────────────────────────────

export type AdminRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN' | 'PARENT'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  avatar: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
  enrolledCount: number
  coursesCount: number
}

export interface AdminCourse {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  price: number
  createdAt: string
  instructor: { id: string; name: string; email: string }
  enrollmentCount: number
}

export interface AdminPayment {
  id: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  gateway: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
  course: { id: string; title: string }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ListFilters {
  search?: string
  page?: number
  limit?: number
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/stats')
      return data.data as {
        totalUsers: number
        activeCourses: number
        totalRevenue: number
        completionRate: number
        usersByRole: Record<string, number>
      }
    },
    refetchInterval: 20000, // students pay outside any admin action, so nothing here to invalidate — poll instead
  })
}

// ── Users ───────────────────────────────────────────────────────────────────

export function useAdminUsers(filters: ListFilters & { role?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', { params: filters })
      return data.data as { users: AdminUser[]; pagination: Pagination }
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...body }: { userId: string; name?: string; email?: string; role?: AdminRole }) =>
      api.patch(`/admin/users/${userId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api.patch(`/admin/users/${userId}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

// ── Courses ─────────────────────────────────────────────────────────────────

export function useAdminCourses(filters: ListFilters & { status?: string } = {}) {
  return useQuery({
    queryKey: ['admin', 'courses', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/courses', { params: filters })
      return data.data as { courses: AdminCourse[]; pagination: Pagination }
    },
  })
}

export function useSetCourseStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: string }) =>
      api.patch(`/admin/courses/${courseId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  })
}

// ── Payments ────────────────────────────────────────────────────────────────

export function useAdminPayments(filters: ListFilters & { status?: string } = {}) {
  return useQuery({
    queryKey: ['admin', 'payments', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/payments', { params: filters })
      return data.data as { payments: AdminPayment[]; pagination: Pagination }
    },
    refetchInterval: 20000, // new rows land here whenever a student pays, outside any admin action
  })
}

export function useAdminPaymentStats() {
  return useQuery({
    queryKey: ['admin', 'payments', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/payments/stats')
      return data.data as { totalRevenue: number; pending: number; thisMonth: number }
    },
    refetchInterval: 20000,
  })
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type ReportType = 'user-activity' | 'financial' | 'course-performance' | 'attendance-summary'

// Report rows are heterogeneous by type, so this stays a loose record —
// the table/CSV builder on the page just reads Object.keys() off the first row.
export type ReportRow = Record<string, string | number>

export function useGenerateReport() {
  return useMutation({
    mutationFn: async (type: ReportType) => {
      const { data } = await api.get(`/admin/reports/${type}`)
      return data.data.rows as ReportRow[]
    },
  })
}

// ── Analytics ───────────────────────────────────────────────────────────────

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics')
      return data.data as {
        newUsersThisWeek: number
        courseCompletions: number
        activeEnrollments: number
        lessonsCompleted: number
      }
    },
  })
}

// ── Settings ────────────────────────────────────────────────────────────────

export interface AdminSettings {
  maintenanceMode: string
  emailNotifications: string
  autoBackup: string
  platformName: string
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/settings')
      return data.data as AdminSettings
    },
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: keyof AdminSettings; value: string }) =>
      api.patch('/admin/settings', { key, value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })
}

// ── Audit Logs ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  adminName: string
  adminEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  details: string | null
  createdAt: string
}

export function useAdminAuditLogs(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit-logs', { params: filters })
      return data.data as { logs: AuditLog[]; pagination: Pagination }
    },
  })
}