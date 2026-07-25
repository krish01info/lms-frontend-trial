import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  MessageSquare,
  MoreHorizontal,
  PenBox,
  Search,
  Send,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useCreateConversation,
} from '@/hooks/useMessageData'
import { useMessageSocket } from '@/hooks/useMessageSocket'
import api from '@/services/api'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatMessageTime(ts: string): string {
  const date = new Date(ts)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Parent Page ──────────────────────────────────────────────────────────

export function ParentMessagesPage() {
  const { user } = useAuth()
  const currentUserId = user?.id ?? ''

  const [search, setSearch] = useState('')
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── API hooks ─────────────────────────────────────────────────────────
  const conversationsQuery = useConversations()
  const conversations = conversationsQuery.data?.conversations ?? []
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  const isConvError = conversationsQuery.isError

  const messagesQuery = useMessages(activeConvId ?? undefined)
  const messages = messagesQuery.data?.messages ?? []

  const sendMessageMutation = useSendMessage(activeConvId ?? '')
  const markReadMutation = useMarkConversationRead(activeConvId ?? '')
  const createConvMutation = useCreateConversation()

  // Fetch parent's children
  const childrenQuery = useQuery({
    queryKey: ['parent-children-list'],
    queryFn: async () => {
      const res = await api.get('/parent/children')
      return res.data.data.children as Array<{ id: string; name: string; email: string; avatar?: string }>
    },
    enabled: composeOpen,
  })
  const childrenList = childrenQuery.data ?? []

  // Fetch child overview when selected to get their course instructors
  const childOverviewQuery = useQuery({
    queryKey: ['parent-child-overview-msg', selectedChildId],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${selectedChildId}/overview`)
      return res.data.data
    },
    enabled: !!selectedChildId,
  })

  // Extract unique instructors from child's enrolled courses + the child themselves
  const composeRecipients = useMemo(() => {
    if (!selectedChildId) return []
    const child = childrenList.find((c) => c.id === selectedChildId)
    const list: Array<{ id: string; name: string; subtitle: string; avatar?: string | null }> = []

    if (child) {
      list.push({ id: child.id, name: child.name, subtitle: 'My Child', avatar: child.avatar })
    }

    if (childOverviewQuery.data?.courses) {
      const seenIds = new Set<string>()
      childOverviewQuery.data.courses.forEach((c: any) => {
        if (c.instructor && !seenIds.has(c.instructor.id)) {
          seenIds.add(c.instructor.id)
          list.push({
            id: c.instructor.id,
            name: c.instructor.name,
            subtitle: `Teacher (${c.courseTitle})`,
            avatar: c.instructor.avatar,
          })
        }
      })
    }

    if (!recipientSearch.trim()) return list
    const q = recipientSearch.toLowerCase()
    return list.filter((r) => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q))
  }, [selectedChildId, childrenList, childOverviewQuery.data, recipientSearch])

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null

  // ─── WebSocket for real-time updates ──────────────────────────────────
  useMessageSocket({
    conversationId: activeConvId ?? undefined,
    onNewMessage: () => { conversationsQuery.refetch(); messagesQuery.refetch() },
    onMessagesRead: () => messagesQuery.refetch(),
  })

  // Select first conversation when list loads
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) setActiveConvId(conversations[0].id)
  }, [conversations, activeConvId])

  // Mark as read when opening a conversation
  useEffect(() => {
    if (activeConvId && activeConv?.unreadCount && activeConv.unreadCount > 0) {
      markReadMutation.mutate()
    }
  }, [activeConvId, activeConv?.unreadCount, markReadMutation])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Send message
  const sendMessageFn = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || !activeConvId) return
    sendMessageMutation.mutate(trimmed, {
      onSuccess: () => setInputValue(''),
      onError: () => toast.error('Could not send message.'),
    })
  }, [inputValue, activeConvId, sendMessageMutation])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageFn() }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      conv.participant.name.toLowerCase().includes(q) ||
      (conv.lastMessage ?? '').toLowerCase().includes(q)
    )
  })

  const selectConversation = (id: string) => { setActiveConvId(id); setMobileView('chat') }
  const backToList = () => setMobileView('list')

  // Auto-select first child when compose opens
  useEffect(() => {
    if (composeOpen && childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id)
    }
  }, [composeOpen, childrenList, selectedChildId])

  const openCompose = () => {
    setSelectedChildId(childrenList[0]?.id || '')
    setSelectedRecipientId('')
    setRecipientSearch('')
    setComposeOpen(true)
  }

  const handleStartConversation = () => {
    if (!selectedRecipientId) {
      toast.error('Select a person to message first.')
      return
    }
    createConvMutation.mutate(selectedRecipientId, {
      onSuccess: (conv) => {
        toast.success('Conversation started!')
        setComposeOpen(false)
        setActiveConvId(conv.id)
        setMobileView('chat')
        conversationsQuery.refetch()
      },
      onError: () => toast.error('Could not start conversation.'),
    })
  }

  const isLoading = conversationsQuery.isLoading
  const hasNoConversations = !isLoading && !isConvError && conversations.length === 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teacher & Child Messages"
        description={totalUnread > 0 ? `${totalUnread} unread` : 'Communicate directly with your child and their teachers'}
      >
        <Button onClick={openCompose} className="gap-2">
          <PenBox className="h-4 w-4" />
          New Message
        </Button>
      </PageHeader>

      <Card className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
        {/* ─── Left: Conversation List ─────────────────────────────────── */}
        <div
          className={cn(
            'w-full border-border md:w-80 md:border-r',
            mobileView === 'chat' && 'hidden md:flex md:flex-col',
            mobileView === 'list' && 'flex flex-col',
          )}
        >
          {/* Search */}
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isConvError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Could not load conversations</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => conversationsQuery.refetch()}>Retry</Button>
              </div>
            ) : hasNoConversations ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center p-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Start a conversation with your child's teacher.</p>
                </div>
                <Button variant="default" size="sm" onClick={openCompose}>New Message</Button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No conversations match your search.</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      activeConvId === conv.id && 'bg-muted',
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.participant.avatar ?? undefined} />
                        <AvatarFallback className="text-xs font-medium">
                          {conv.participant.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{conv.participant.name}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.course && (
                          <span className="truncate text-[10px] font-medium text-primary/70">
                            {conv.course.title}
                          </span>
                        )}
                        <p className="truncate text-xs text-muted-foreground">
                          {conv.lastMessage ?? 'No messages yet'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-auto h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ─── Right: Chat Thread ──────────────────────────────────────── */}
        {activeConv ? (
          <div className={cn('flex flex-1 flex-col', mobileView === 'list' && 'hidden md:flex')}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={backToList}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={activeConv.participant.avatar ?? undefined} />
                  <AvatarFallback className="text-xs font-medium">
                    {activeConv.participant.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{activeConv.participant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeConv.course ? activeConv.course.title : 'Direct Message'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {messagesQuery.isLoading && (
                  <div className="space-y-4 py-8">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                        <div className={cn('h-12 w-3/4 animate-pulse rounded-2xl', i % 2 === 0 ? 'bg-primary/20' : 'bg-muted')} />
                      </div>
                    ))}
                  </div>
                )}

                {!messagesQuery.isLoading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/60">Send a message to start the conversation</p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isMe = msg.senderId === currentUserId
                  const showAvatar = !isMe && (i === 0 || messages[i - 1]?.senderId === currentUserId)

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start')}
                    >
                      {!isMe && (
                        <div className={cn('shrink-0', showAvatar ? 'opacity-100' : 'opacity-0')}>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[8px]">{activeConv.participant.name[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className={cn('max-w-[75%] space-y-1', isMe && 'items-end flex flex-col')}>
                        <div className={cn('rounded-2xl px-4 py-2.5 text-sm', isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md')}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <p className={cn('text-[10px]', isMe ? 'text-right text-primary-foreground/60' : 'text-left text-muted-foreground')}>
                          {formatMessageTime(msg.createdAt)}
                          {isMe && <span className="ml-1">{msg.readAt ? '✓✓' : '✓'}</span>}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-10 pr-10"
                  />
                </div>
                <Button
                  size="icon"
                  onClick={sendMessageFn}
                  disabled={!inputValue.trim() || sendMessageMutation.isPending}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Your Messages</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Select a conversation or click "New Message" to message a teacher.
              </p>
              <Button className="mt-4 gap-2" onClick={openCompose}>
                <PenBox className="h-4 w-4" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Compose Dialog ─────────────────────────────────────────────── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Select your child to view their teachers and send a message.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Child</Label>
              <div className="flex flex-wrap gap-2">
                {childrenList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No linked children found. Link a child from Dashboard.</p>
                ) : (
                  childrenList.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => { setSelectedChildId(child.id); setSelectedRecipientId('') }}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selectedChildId === child.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border hover:border-primary/50'
                      }`}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={child.avatar} />
                        <AvatarFallback className="text-[9px]">{child.name[0]}</AvatarFallback>
                      </Avatar>
                      {child.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedChildId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recipient (Teachers / Student)</Label>
                  {childOverviewQuery.isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
                </div>
                <Input
                  placeholder="Filter teachers by name..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="h-8 text-xs mb-2"
                />
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {!childOverviewQuery.isLoading && composeRecipients.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No teachers found for this student.
                      </p>
                    )}
                    {composeRecipients.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRecipientId(r.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
                          selectedRecipientId === r.id && 'bg-primary/10 ring-1 ring-primary/30 font-medium',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={r.avatar ?? undefined} />
                            <AvatarFallback className="text-[10px]">{r.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{r.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{r.subtitle}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button onClick={handleStartConversation} disabled={!selectedRecipientId || createConvMutation.isPending}>
                {createConvMutation.isPending ? 'Starting...' : 'Start Conversation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
