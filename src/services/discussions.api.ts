import api from './api'
import type { ApiDiscussionThread, ApiDiscussionThreadDetail, ApiDiscussionReply } from '@/types'

interface ThreadsListResponse {
  threads: ApiDiscussionThread[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

interface GetThreadsParams {
  courseId: string
  search?: string
  page?: number
  limit?: number
}

// GET /discussions?courseId=&search=&page=&limit= — courseId is required by the backend
export async function getThreads(params: GetThreadsParams) {
  const { data } = await api.get('/discussions', { params })
  return data.data as ThreadsListResponse
}

// GET /discussions/:id — single thread with its replies, oldest first
export async function getThreadById(id: string) {
  const { data } = await api.get(`/discussions/${id}`)
  return data.data.thread as ApiDiscussionThreadDetail
}

export interface CreateThreadPayload {
  courseId: string
  title: string
  content: string
  tags?: string[]
}

// POST /discussions
export async function createThread(payload: CreateThreadPayload) {
  const { data } = await api.post('/discussions', payload)
  return data.data.thread as ApiDiscussionThread
}

// POST /discussions/:id/replies — body: { content }
export async function addReply(threadId: string, content: string) {
  const { data } = await api.post(`/discussions/${threadId}/replies`, { content })
  return data.data.reply as ApiDiscussionReply
}

// POST /discussions/:id/like — toggles like on/off for the current user
export async function toggleLike(threadId: string) {
  const { data } = await api.post(`/discussions/${threadId}/like`)
  return data.data as { liked: boolean }
}

// DELETE /discussions/:id — author, or instructor/admin/super_admin
export async function deleteThread(threadId: string) {
  const { data } = await api.delete(`/discussions/${threadId}`)
  return data.data as { id: string }
}

// PATCH /discussions/:id/pin — body: { pinned } — INSTRUCTOR/ADMIN/SUPER_ADMIN only
export async function setPinned(threadId: string, pinned: boolean) {
  const { data } = await api.patch(`/discussions/${threadId}/pin`, { pinned })
  return data.data.thread as ApiDiscussionThread
}