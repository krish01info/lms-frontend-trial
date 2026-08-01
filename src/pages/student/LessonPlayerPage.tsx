import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  List,
  Maximize2,
  Minimize2,
  Play,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/utils/cn'
import api from '@/services/api'
import { transformLesson } from '@/utils/transformers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  type: 'VIDEO' | 'TEXT' | string
  videoUrl?: string
  content?: string
  description?: string
  duration?: number
}

interface LessonProgress {
  id: string
  completed: boolean
}

interface Course {
  title: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a lesson type to a human-readable label */
function lessonTypeLabel(type: Lesson['type']): string {
  if (type === 'VIDEO') return 'Video'
  if (type === 'TEXT') return 'Reading'
  return type
}

/** Converts a duration stored in seconds to a rounded minutes label */
function formatDurationMinutes(durationSeconds?: number): string {
  if (!durationSeconds) return ''
  return `${Math.round(durationSeconds / 60)} min`
}

/** Extract YouTube video ID from various URL formats */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const match = url.match(re)
    if (match) return match[1]
  }
  return null
}

// ─── Video Player Component ──────────────────────────────────────────────────

function VideoPlayer({ videoUrl, title }: { videoUrl: string; title: string }) {
  if (!videoUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-muted/50">
        <div className="text-center">
          <Play className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No video available for this lesson</p>
        </div>
      </div>
    )
  }

  const ytId = getYouTubeId(videoUrl)

  if (ytId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  // Direct video file (Cloudinary, S3, etc.)
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
      <video
        src={videoUrl}
        title={title}
        controls
        controlsList="nodownload"
        className="h-full w-full"
        playsInline
      />
    </div>
  )
}

// ─── Lesson Sidebar Item ─────────────────────────────────────────────────────

function LessonSidebarItem({
  lesson,
  isActive,
  isCompleted,
  index,
  onClick,
}: {
  lesson: Lesson
  isActive: boolean
  isCompleted: boolean
  index: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
          : 'hover:bg-muted/60'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
          isCompleted
            ? 'bg-emerald-500/15 text-emerald-600'
            : isActive
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
        )}
      >
        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', isActive && 'text-primary')}>
          {lesson.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {lessonTypeLabel(lesson.type)}
          {lesson.duration ? ` · ${formatDurationMinutes(lesson.duration)}` : ''}
        </p>
      </div>
      {isActive && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isTheaterMode, setIsTheaterMode] = useState(false)

  // Stable base URL for this course
  const courseUrl = `/student/courses/${courseId}`

  // ── Fetch course info ─────────────────────────────────────────────────────
  const { data: course } = useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}`)
      return res.data.data.course
    },
    enabled: !!courseId,
  })

  // ── Fetch all lessons ─────────────────────────────────────────────────────
  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['course-lessons', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}/lessons`)
      return res.data.data.lessons.map(transformLesson)
    },
    enabled: !!courseId,
  })

  // ── Fetch current lesson detail ───────────────────────────────────────────
  const { data: currentLesson, isLoading: lessonLoading } = useQuery<Lesson>({
    queryKey: ['lesson', courseId, lessonId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}/lessons/${lessonId}`)
      return transformLesson(res.data.data.lesson)
    },
    enabled: !!courseId && !!lessonId,
  })

  // ── Fetch progress for this course ────────────────────────────────────────
  const { data: courseProgressDetail } = useQuery<LessonProgress[]>({
    queryKey: ['course-progress-detail', courseId],
    queryFn: async () => {
      const res = await api.get(`/progress/${courseId}`)
      return res.data.data.lessons
    },
    enabled: !!courseId,
  })

  // ── Mark complete mutation ────────────────────────────────────────────────
  const markCompleteMutation = useMutation({
    mutationFn: async ({ id, duration }: { id: string; duration?: number }) => {
      const res = await api.patch(`/progress/${id}`, {
        completed: true,
        // duration is in seconds (matches backend watchedTime units — see
        // Lesson.duration in schema.prisma and the teacher-side "Add Lesson"
        // form, which is explicitly labeled "Duration (seconds)"). No real
        // per-second watch tracking exists yet, so we approximate "time
        // studied" as the full lesson duration when marked complete.
        watchedTime: duration ?? 0,
      })
      return res.data.data.progress
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-my'] })
      queryClient.invalidateQueries({ queryKey: ['course-progress-detail', courseId] })
      queryClient.invalidateQueries({ queryKey: ['progress-weekly-hours'] })
      queryClient.invalidateQueries({ queryKey: ['activity-my'] })
      toast.success('Lesson marked as complete!')
    },
  })

  // ── Derived state ─────────────────────────────────────────────────────────

  /** Stable helper to check if a lesson is completed */
  const isLessonCompleted = useCallback(
    (lid: string) => courseProgressDetail?.find((l) => l.id === lid)?.completed ?? false,
    [courseProgressDetail]
  )

  const currentIndex = useMemo(
    () => lessons?.findIndex((l) => l.id === lessonId) ?? -1,
    [lessons, lessonId]
  )

  const prevLesson = currentIndex > 0 ? lessons?.[currentIndex - 1] : null
  const nextLesson = lessons && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

  const currentCompleted = lessonId ? isLessonCompleted(lessonId) : false

  const completedCount = useMemo(
    () => lessons?.filter((l) => isLessonCompleted(l.id)).length ?? 0,
    [lessons, isLessonCompleted]
  )

  const progressPercent = lessons?.length ? Math.round((completedCount / lessons.length) * 100) : 0

  // ── Navigate to a lesson ──────────────────────────────────────────────────
  const goToLesson = useCallback(
    (lid: string) => {
      navigate(`${courseUrl}/lessons/${lid}`, { replace: true })
    },
    [navigate, courseUrl]
  )

  // ── Go to next lesson, auto-marking the current one complete ─────────────
  const goToNextLesson = useCallback(() => {
    if (!nextLesson) return
    if (lessonId && !currentCompleted) {
      markCompleteMutation.mutate({ id: lessonId, duration: currentLesson?.duration })
    }
    goToLesson(nextLesson.id)
  }, [nextLesson, lessonId, currentCompleted, currentLesson, markCompleteMutation, goToLesson])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Avoid triggering when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') goToNextLesson()
      if (e.key === 'ArrowLeft' && prevLesson) goToLesson(prevLesson.id)
      if (e.key === 'b' || e.key === 'B') setSidebarOpen((v) => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goToNextLesson, goToLesson, prevLesson])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (lessonsLoading || lessonLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (!currentLesson) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold">Lesson not found</h2>
          <p className="text-sm text-muted-foreground">This lesson may have been removed.</p>
          <Button className="mt-4" onClick={() => navigate(courseUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(courseUrl)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{course?.title || 'Course'}</p>
            <p className="truncate text-sm font-semibold">{currentLesson.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress pill */}
          <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium sm:flex">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted-foreground/20">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{progressPercent}%</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsTheaterMode((v) => !v)}
            title="Theater Mode"
          >
            {isTheaterMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle Sidebar (B)"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Video / Content Area ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto', isTheaterMode ? 'max-w-full px-0' : 'max-w-5xl px-4 py-6')}>
            {/* Video Player - handles missing URL internally */}
            {currentLesson.type === 'VIDEO' && (
              <VideoPlayer videoUrl={currentLesson.videoUrl ?? ''} title={currentLesson.title} />
            )}

            {/* Text Content */}
            {currentLesson.type === 'TEXT' && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <Badge variant="secondary">Reading Material</Badge>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {currentLesson.content || 'No content available for this lesson.'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Lesson Info & Actions ──────────────────────────────────── */}
            <div className={cn('mt-6 space-y-4', isTheaterMode && 'px-4')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold sm:text-2xl">{currentLesson.title}</h1>
                  {currentLesson.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{currentLesson.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {currentLesson.type === 'VIDEO' ? 'Video Lesson' : 'Reading'}
                    </Badge>
                    {currentLesson.duration && <span>{formatDurationMinutes(currentLesson.duration)}</span>}
                    <span>Lesson {currentIndex + 1} of {lessons?.length ?? 0}</span>
                  </div>
                </div>

                {/* Mark Complete / Completed */}
                {currentCompleted ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20 px-4 py-2">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Completed
                  </Badge>
                ) : (
                  <Button
                    onClick={() => markCompleteMutation.mutate({ id: lessonId!, duration: currentLesson.duration })}
                    disabled={markCompleteMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {markCompleteMutation.isPending ? 'Marking...' : 'Mark as Complete'}
                  </Button>
                )}
              </div>

              {/* ── Navigation ──────────────────────────────────────────────── */}
              <div className="flex items-center justify-between border-t pt-4">
                {prevLesson ? (
                  <Button variant="outline" onClick={() => goToLesson(prevLesson.id)} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                ) : (
                  <div />
                )}
                {nextLesson ? (
                  <Button onClick={goToNextLesson} className="gap-2">
                    Next Lesson <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate(courseUrl)}
                    className="gap-2"
                  >
                    Back to Course <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar (Lesson List) ──────────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden border-l bg-background/95"
            >
              <div className="flex h-full w-[320px] flex-col">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold">Course Content</h3>
                    <p className="text-xs text-muted-foreground">
                      {completedCount}/{lessons?.length ?? 0} lessons complete
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="px-4 py-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Lesson List */}
                <ScrollArea className="flex-1 px-2 pb-4">
                  <div className="space-y-1 py-2">
                    {lessons?.map((lesson, idx) => (
                      <LessonSidebarItem
                        key={lesson.id}
                        lesson={lesson}
                        isActive={lesson.id === lessonId}
                        isCompleted={isLessonCompleted(lesson.id)}
                        index={idx}
                        onClick={() => goToLesson(lesson.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}