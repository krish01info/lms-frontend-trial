import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getThreads,
  getThreadById,
  createThread,
  addReply,
  toggleLike,
  deleteThread,
  setPinned,
  type CreateThreadPayload,
} from '@/services/discussions.api'

// Threads for a course, optionally filtered by search text. courseId is
// required by the backend, so the query is disabled until one is selected.
export function useThreads(courseId: string | undefined, search: string, page = 1) {
  return useQuery({
    queryKey: ['discussion-threads', courseId, search, page],
    queryFn: () => getThreads({ courseId: courseId!, search: search || undefined, page }),
    enabled: !!courseId,
  })
}

// Single thread with its replies (for the thread detail page)
export function useThread(threadId: string | undefined) {
  return useQuery({
    queryKey: ['discussion-thread', threadId],
    queryFn: () => getThreadById(threadId!),
    enabled: !!threadId,
  })
}

export function useCreateThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateThreadPayload) => createThread(payload),
    onSuccess: (thread) => {
      // Refresh the list for whichever course the new thread belongs to
      queryClient.invalidateQueries({ queryKey: ['discussion-threads', thread.courseId] })
    },
  })
}

export function useAddReply(threadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => addReply(threadId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-thread', threadId] })
    },
  })
}

// Pass the currently selected courseId so the list view refreshes too
export function useToggleLike(courseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (threadId: string) => toggleLike(threadId),
    onSuccess: (_result, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads', courseId] })
      queryClient.invalidateQueries({ queryKey: ['discussion-thread', threadId] })
    },
  })
}

export function useDeleteThread(courseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads', courseId] })
    },
  })
}

export function useSetPinned(courseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ threadId, pinned }: { threadId: string; pinned: boolean }) =>
      setPinned(threadId, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads', courseId] })
    },
  })
}