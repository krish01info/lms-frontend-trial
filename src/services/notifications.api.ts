import api from './api'
import type { ApiNotification } from '@/types'

interface NotificationsListResponse {
  notifications: ApiNotification[]
  unreadCount: number
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

export async function getMyNotifications(unreadOnly = false) {
  const { data } = await api.get('/notifications', { params: { unread: unreadOnly } })
  return {
    notifications: data.data.items,
    unreadCount: data.data.unreadCount,
    pagination: data.data.pagination,
  } as NotificationsListResponse
}
// GET /notifications/unread-count
export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count')
  return { count: data.data.unreadCount } as { count: number }
}
// PATCH /notifications/:id/read
export async function markAsRead(id: string) {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data.data as ApiNotification
}
// PATCH /notifications/read-all
export async function markAllAsRead() {
  const { data } = await api.patch('/notifications/read-all')
  return { count: data.data.updated } as { count: number }
}