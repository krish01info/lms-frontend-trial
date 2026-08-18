import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Loader2, MessageSquare, Pin, PinOff, Plus, ThumbsUp, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchBar } from '@/components/common/SearchBar'
import { EmptyState } from '@/components/common/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import {
  useThreads,
  useCreateThread,
  useToggleLike,
  useDeleteThread,
  useSetPinned,
} from '@/hooks/useDiscussionData'
import type { ApiCourseSummary } from '@/types'

// Roles allowed to pin/unpin threads — mirrors the backend's requireRole check
// on PATCH /discussions/:id/pin (INSTRUCTOR, ADMIN, SUPER_ADMIN).
const STAFF_ROLES = ['teacher', 'admin', 'super-admin']

export function DiscussionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = !!user && STAFF_ROLES.includes(user.role)

  const [search, setSearch] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined)
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState('')

  // Same queryKey as CoursesPage.tsx — shares the cache, no duplicate request
  const { data: enrolledCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['enrolled-courses'],
    queryFn: async () => {
      const res = await api.get('/courses/enrolled')
      return res.data.data.courses as ApiCourseSummary[]
    },
  })

  // Backend requires a courseId per request, so there's no combined "All
  // courses" view — default to the first enrolled course.
  const courseId = selectedCourseId ?? enrolledCourses?.[0]?.id

  const { data: threadsData, isLoading: threadsLoading, isError } = useThreads(courseId, search)
  const createThreadMutation = useCreateThread()
  const toggleLikeMutation = useToggleLike(courseId)
  const deleteThreadMutation = useDeleteThread(courseId)
  const setPinnedMutation = useSetPinned(courseId)

  const threads = threadsData?.threads ?? []
  const sorted = useMemo(
    () => [...threads].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [threads]
  )

  const resetNewThreadForm = () => {
    setNewTitle('')
    setNewContent('')
    setNewTags('')
  }

  const handleCreateThread = () => {
    if (!courseId || !newTitle.trim() || !newContent.trim()) return
    createThreadMutation.mutate(
      {
        courseId,
        title: newTitle.trim(),
        content: newContent.trim(),
        tags: newTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          resetNewThreadForm()
          setIsNewThreadOpen(false)
        },
      }
    )
  }

  if (coursesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Discussion" description="Collaborate with peers and instructors" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!enrolledCourses || enrolledCourses.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Discussion" description="Collaborate with peers and instructors" />
        <EmptyState
          icon={MessageSquare}
          title="No courses yet"
          description="Enroll in a course to join its discussion board."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Discussion" description="Collaborate with peers and instructors">
        <Dialog open={isNewThreadOpen} onOpenChange={setIsNewThreadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Thread
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a new discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thread-title">Title</Label>
                <Input
                  id="thread-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's your question or topic?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thread-content">Content</Label>
                <Textarea
                  id="thread-content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Add more detail..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thread-tags">Tags (comma separated, optional)</Label>
                <Input
                  id="thread-tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="calculus, help"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleCreateThread}
                disabled={!newTitle.trim() || !newContent.trim() || createThreadMutation.isPending}
              >
                {createThreadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar
          placeholder="Search discussions..."
          value={search}
          onChange={setSearch}
          className="lg:max-w-sm"
        />
        <Tabs value={courseId} onValueChange={setSelectedCourseId}>
          <TabsList className="h-auto max-w-full flex-wrap">
            {enrolledCourses.map((course) => (
              <TabsTrigger key={course.id} value={course.id} className="text-xs">
                {course.title.split(' ').slice(0, 2).join(' ')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="flex gap-3 p-4 cursor-text" onClick={() => setIsNewThreadOpen(true)}>
          <Avatar>
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <Input placeholder="Start a new discussion..." readOnly className="flex-1 cursor-pointer" />
          <Button
            onClick={(e) => {
              e.stopPropagation()
              setIsNewThreadOpen(true)
            }}
          >
            Post
          </Button>
        </CardContent>
      </Card>

      {threadsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={MessageSquare}
          title="Failed to load discussions"
          description="Could not connect to the server. Please try again."
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No discussions yet"
          description="Be the first to start a conversation in this course."
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((thread, i) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={cn(
                  'transition-shadow hover:shadow-md cursor-pointer',
                  thread.pinned && 'border-primary/30'
                )}
                onClick={() => navigate(`/student/discussion/${thread.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={thread.author.avatar ?? undefined} />
                      <AvatarFallback>{thread.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {thread.pinned && (
                          <Badge variant="accent" className="gap-1">
                            <Pin className="h-3 w-3" />
                            Pinned
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {thread.course.title.split(' ').slice(0, 2).join(' ')}
                        </Badge>
                      </div>
                      <h3 className="mt-2 font-semibold">{thread.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {thread.content}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>{thread.author.name}</span>
                        <span>
                          {formatDistanceToNow(parseISO(thread.createdAt), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {thread.replies} replies
                        </span>
                        <button
                          className={cn(
                            'flex items-center gap-1 hover:text-foreground',
                            thread.likedByMe && 'text-primary'
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLikeMutation.mutate(thread.id)
                          }}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {thread.likes}
                        </button>
                        {isStaff && (
                          <button
                            className="flex items-center gap-1 hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPinnedMutation.mutate({
                                threadId: thread.id,
                                pinned: !thread.pinned,
                              })
                            }}
                          >
                            {thread.pinned ? (
                              <>
                                <PinOff className="h-3.5 w-3.5" /> Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="h-3.5 w-3.5" /> Pin
                              </>
                            )}
                          </button>
                        )}
                        {(isStaff || thread.author.id === user?.id) && (
                          <button
                            className="flex items-center gap-1 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Delete this thread?')) {
                                deleteThreadMutation.mutate(thread.id)
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {thread.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}