import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markConversationRead,
} from '@/services/messages.api'

// ─── Conversations ─────────────────────────────────────────────────────────

export function useConversations(page = 1) {
  const query = useQuery({
    queryKey: ['conversations', page],
    queryFn: () => getConversations(page),
  })

  useEffect(() => {
    if (query.isError) {
      console.error('Failed to load conversations', query.error)
      toast.error('Could not load conversations. Please try again.')
    }
  }, [query.isError, query.error])

  return query
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createConversation,
    onSuccess: (newConv) => {
      queryClient.setQueryData(['conversations', 1], (old: any) => {
        if (!old) return { conversations: [newConv], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } }
        const exists = old.conversations?.some((c: any) => c.id === newConv.id)
        if (exists) return old
        return {
          ...old,
          conversations: [newConv, ...(old.conversations || [])],
        }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ─── Messages ──────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | undefined, page = 1) {
  const query = useQuery({
    queryKey: ['messages', conversationId, page],
    queryFn: () => getMessages(conversationId!, page),
    enabled: !!conversationId,
  })

  useEffect(() => {
    if (query.isError) {
      console.error('Failed to load messages', query.error)
      toast.error('Could not load messages. Please try again.')
    }
  }, [query.isError, query.error])

  return query
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
  })
}
