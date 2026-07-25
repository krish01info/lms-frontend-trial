import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Film,
  FileText,
  HelpCircle,
  ClipboardList,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Save,
  Upload,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageShell } from '@/components/common/PageShell'
import { PageSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useCourse, useUpdateCourse } from '@/hooks/useCourseData'
import {
  useLessons,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useReorderLessons,
} from '@/hooks/useLessonData'
import api from '@/services/api'
import type { ApiLesson, LessonType } from '@/types'

// ─── Course Edit Schema ──────────────────────────────────────────────────────

const courseSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().optional(),
  category: z.string().min(1, 'Select a category'),
  price: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
})
type EditCourseValues = z.infer<typeof courseSchema>

// ─── Lesson Create/Edit Schema ───────────────────────────────────────────────

const lessonSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT']),
  duration: z.string().optional(),
  isPreview: z.boolean().optional(),
})
type LessonFormValues = z.infer<typeof lessonSchema>

// ─── Lesson type visual helpers ──────────────────────────────────────────────

const TYPE_ICONS: Record<LessonType, React.ElementType> = {
  VIDEO: Film,
  TEXT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
}

const TYPE_LABELS: Record<LessonType, string> = {
  VIDEO: 'Video',
  TEXT: 'Text / Article',
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
}

const TYPE_BADGE_VARIANTS: Record<LessonType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  VIDEO: 'default',
  TEXT: 'secondary',
  QUIZ: 'outline',
  ASSIGNMENT: 'destructive',
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  // Course queries
  const courseQuery = useCourse(courseId)
  const updateCourse = useUpdateCourse(courseId!)

  // Lesson queries
  const lessonsQuery = useLessons(courseId)
  const createLesson = useCreateLesson(courseId!)
  const deleteLesson = useDeleteLesson(courseId!)
  const reorderLessons = useReorderLessons(courseId!)

  const course = courseQuery.data
  const lessons = lessonsQuery.data ?? []

  // ── Course form ────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset: resetCourse,
    setValue,
    watch,
    formState: { errors: courseErrors },
  } = useForm<EditCourseValues>({ resolver: zodResolver(courseSchema) })

  useEffect(() => {
    if (!course) return
    resetCourse({
      title: course.title,
      description: course.description || '',
      category: course.category?.name || '',
      price: course.price ? String(course.price) : '',
      status: course.status as EditCourseValues['status'],
    })
  }, [course, resetCourse])

  const onCourseSubmit = (values: EditCourseValues) => {
    updateCourse.mutate(
      {
        title: values.title,
        description: values.description,
        category: values.category,
        price: values.price ? Number(values.price) : 0,
        status: values.status,
      },
      {
        onSuccess: () => {
          toast.success('Course updated!')
          navigate('/teacher/courses')
        },
        onError: () => {
          toast.error('Could not update the course. Please check the details and try again.')
        },
      }
    )
  }

  // ── Lesson dialog state ────────────────────────────────────────────────────

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<ApiLesson | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ApiLesson | null>(null)

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoUploadProgress, setVideoUploadProgress] = useState(0)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const updateLessonHook = useUpdateLesson(courseId!, editingLesson?.id ?? '')

  const {
    register: registerLesson,
    handleSubmit: handleLessonSubmit,
    reset: resetLessonForm,
    setValue: setLessonValue,
    watch: watchLesson,
    formState: { errors: lessonErrors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: '', description: '', type: 'VIDEO', duration: '', isPreview: false },
  })

  const openCreateLesson = () => {
    setEditingLesson(null)
    setVideoFile(null)
    setVideoUploadProgress(0)
    resetLessonForm({ title: '', description: '', type: 'VIDEO', duration: '', isPreview: false })
    setLessonDialogOpen(true)
  }

  const openEditLesson = (lesson: ApiLesson) => {
    setEditingLesson(lesson)
    setVideoFile(null)
    setVideoUploadProgress(0)
    resetLessonForm({
      title: lesson.title,
      description: lesson.description ?? '',
      type: lesson.type,
      duration: lesson.duration ? String(lesson.duration) : '',
      isPreview: lesson.isPreview,
    })
    setLessonDialogOpen(true)
  }

  // ── Upload video to Cloudinary via backend ─────────────────────────────────

  const uploadLessonVideo = async (lessonId: string): Promise<string | null> => {
    if (!videoFile) return null

    setIsUploadingVideo(true)
    setVideoUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('video', videoFile)

      const res = await api.post(`/courses/${courseId}/lessons/${lessonId}/video`, formData, {
        headers: { 'Content-Type': undefined },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setVideoUploadProgress(pct)
          }
        },
      })

      const videoUrl = res.data?.data?.videoUrl
      return videoUrl ?? null
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Video upload failed.')
      return null
    } finally {
      setIsUploadingVideo(false)
      setVideoUploadProgress(0)
    }
  }

  // ── Lesson submit (create or update + optional video) ──────────────────────

  const onLessonSubmit = async (values: LessonFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      type: values.type,
      duration: values.duration ? Number(values.duration) : null,
      isPreview: values.isPreview ?? false,
    }

    if (editingLesson) {
      updateLessonHook.mutate(payload, {
        onSuccess: async (updatedLesson) => {
          // If a new video was picked, upload it after updating
          if (videoFile && updatedLesson?.id) {
            const videoUrl = await uploadLessonVideo(updatedLesson.id)
            if (videoUrl) {
              toast.success('Video uploaded!')
            }
          }
          toast.success('Lesson updated.')
          setLessonDialogOpen(false)
          setEditingLesson(null)
          setVideoFile(null)
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update the lesson.'),
      })
    } else {
      createLesson.mutate(payload, {
        onSuccess: async (newLesson) => {
          // If a video was picked, upload it after creation
          if (videoFile && newLesson?.id) {
            const videoUrl = await uploadLessonVideo(newLesson.id)
            if (videoUrl) {
              toast.success('Lesson created with video!')
            }
          } else {
            toast.success('Lesson added!')
          }
          setLessonDialogOpen(false)
          setVideoFile(null)
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not create the lesson.'),
      })
    }
  }

  const handleDeleteLesson = () => {
    if (!deleteConfirm) return
    deleteLesson.mutate(deleteConfirm.id, {
      onSuccess: () => {
        toast.success('Lesson deleted.')
        setDeleteConfirm(null)
      },
      onError: () => toast.error('Could not delete the lesson.'),
    })
  }

  const moveLesson = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...lessons]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newOrder.length) return

    const temp = newOrder[index].order
    newOrder[index] = { ...newOrder[index], order: newOrder[swapIndex].order }
    newOrder[swapIndex] = { ...newOrder[swapIndex], order: temp }
    newOrder.sort((a, b) => a.order - b.order)

    reorderLessons.mutate(newOrder.map((l) => l.id), {
      onSuccess: () => toast.success('Lessons reordered.'),
      onError: () => toast.error('Could not reorder lessons.'),
    })
  }

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (courseQuery.isLoading) {
    return (
      <PageShell title="Edit Course" description="Loading course details...">
        <PageSkeleton />
      </PageShell>
    )
  }

  if (courseQuery.isError || !course) {
    return (
      <PageShell title="Edit Course" description="Could not load course details">
        <ErrorState
          message="We couldn't find this course. It may have been deleted or you may not have permission to edit it."
          onRetry={() => courseQuery.refetch()}
        />
      </PageShell>
    )
  }

  const currentStatus = watch('status')
  const lessonType = watchLesson('type')

  return (
    <PageShell
      title="Edit Course"
      description={`Managing "${course.title}"`}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/teacher/courses">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to courses
          </Link>
        </Button>
      }
    >
      {/* ── Course Details Card ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <span>Status:</span>
            <span className={`font-medium ${currentStatus === 'PUBLISHED' ? 'text-emerald-600' : currentStatus === 'DRAFT' ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {currentStatus === 'PUBLISHED' ? 'Published' : currentStatus === 'DRAFT' ? 'Draft' : 'Archived'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>{course.enrollmentCount} enrolled student{course.enrollmentCount === 1 ? '' : 's'}</span>
            <span className="text-muted-foreground">·</span>
            <span>{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>
          </div>

          <form onSubmit={handleSubmit(onCourseSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Course Title</Label>
              <Input placeholder="Introduction to Data Science" {...register('title')} />
              {courseErrors.title && <p className="text-xs text-destructive">{courseErrors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-24 w-full rounded-2xl border border-input bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50"
                placeholder="Course description..."
                {...register('description')}
              />
              {courseErrors.description && <p className="text-xs text-destructive">{courseErrors.description.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={watch('category')}
                  onValueChange={(v) => setValue('category', v, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
                {courseErrors.category && <p className="text-xs text-destructive">{courseErrors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Price ($, optional)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0" {...register('price')} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(v) => setValue('status', v as EditCourseValues['status'], { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={updateCourse.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateCourse.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/teacher/courses">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Separator ───────────────────────────────────────────────────────── */}
      <div className="py-4">
        <Separator />
      </div>

      {/* ── Lessons Section ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Course Lessons</h3>
              <p className="text-sm text-muted-foreground">
                {lessons.length === 0
                  ? 'No lessons yet — start building your course content.'
                  : `${lessons.length} lesson${lessons.length === 1 ? '' : 's'} — click a lesson to edit or reorder them.`
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/teacher/courses/${courseId}/lessons`}>
                  <Film className="mr-1.5 h-3.5 w-3.5" />
                  Full Manager
                </Link>
              </Button>
              <Button onClick={openCreateLesson} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Lesson
              </Button>
            </div>
          </div>

          {lessonsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading lessons…</span>
            </div>
          ) : lessons.length === 0 ? (
            <EmptyState
              icon={Film}
              title="No lessons yet"
              description="Add video lectures, text articles, quizzes, or assignments."
              actionLabel="Add Lesson"
              onAction={openCreateLesson}
            />
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, index) => {
                const TypeIcon = TYPE_ICONS[lesson.type]
                return (
                  <div
                    key={lesson.id}
                    className="group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    {/* Reorder */}
                    <div className="flex shrink-0 flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveLesson(index, 'up')}
                        disabled={index === 0 || reorderLessons.isPending}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[11px] font-medium text-muted-foreground">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => moveLesson(index, 'down')}
                        disabled={index === lessons.length - 1 || reorderLessons.isPending}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Type icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <TypeIcon className="h-4.5 w-4.5 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{lesson.title}</span>
                        <Badge variant={TYPE_BADGE_VARIANTS[lesson.type]} className="shrink-0 text-[10px]">
                          {TYPE_LABELS[lesson.type]}
                        </Badge>
                        {lesson.isPreview && (
                          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                            <Eye className="h-3 w-3" /> Preview
                          </Badge>
                        )}
                      </div>
                      {lesson.duration && (
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(lesson.duration / 60)}:{String(lesson.duration % 60).padStart(2, '0')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditLesson(lesson)}
                        aria-label="Edit lesson"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteConfirm(lesson)}
                        disabled={deleteLesson.isPending}
                        aria-label="Delete lesson"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Lesson Dialog ─────────────────────────────────────── */}
      <Dialog
        open={lessonDialogOpen}
        onOpenChange={(open) => {
          setLessonDialogOpen(open)
          if (!open) {
            setEditingLesson(null)
            setVideoFile(null)
            setVideoUploadProgress(0)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
            <DialogDescription>
              {editingLesson
                ? 'Update the lesson details, settings, or upload a new video.'
                : 'Create a new lesson — video lectures, text articles, quizzes, or assignments.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLessonSubmit(onLessonSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input placeholder="Introduction to Variables" {...registerLesson('title')} />
              {lessonErrors.title && <p className="text-xs text-destructive">{lessonErrors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea
                className="flex min-h-20 w-full rounded-2xl border border-input bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50"
                placeholder="What will students learn in this lesson?"
                {...registerLesson('description')}
              />
            </div>

            {/* Type & Duration */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lesson Type</Label>
                <Select
                  value={watchLesson('type')}
                  onValueChange={(v) => setLessonValue('type', v as LessonType, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="TEXT">Text / Article</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                    <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input type="number" min={0} placeholder="600" {...registerLesson('duration')} />
              </div>
            </div>

            {/* Video upload — only show for VIDEO type */}
            {lessonType === 'VIDEO' && (
              <div className="space-y-3 rounded-2xl border-2 border-dashed p-4 transition-colors hover:border-primary/40">
                <Label>Upload Lecture Video</Label>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/mov,video/mkv,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const MAX_SIZE_MB = 500
                    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                      toast.error(`Video must be under ${MAX_SIZE_MB} MB.`)
                      e.target.value = ''
                      return
                    }
                    setVideoFile(file)
                  }}
                />

                {videoFile ? (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                    <Film className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{videoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setVideoFile(null); if (videoInputRef.current) videoInputRef.current.value = '' }}
                      disabled={isUploadingVideo}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl py-2 transition-colors hover:bg-muted/50"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Click to select a video file (MP4, MOV, MKV, WEBM — up to 500 MB)
                    </span>
                  </button>
                )}

                {isUploadingVideo && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploading video…</span>
                      <span>{videoUploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {editingLesson?.videoUrl && !videoFile && (
                  <p className="text-xs text-emerald-600">
                    ✓ Video already uploaded
                  </p>
                )}
              </div>
            )}

            {/* Preview toggle */}
            <div className="flex items-center gap-3 rounded-2xl border p-4">
              <Switch
                checked={watchLesson('isPreview') ?? false}
                onCheckedChange={(v) => setLessonValue('isPreview', v)}
                id="lesson-is-preview"
              />
              <Label htmlFor="lesson-is-preview" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  {watchLesson('isPreview') ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Allow preview without enrollment</span>
                </div>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createLesson.isPending || updateLessonHook.isPending || isUploadingVideo}
            >
              {isUploadingVideo
                ? `Uploading video… ${videoUploadProgress}%`
                : createLesson.isPending || updateLessonHook.isPending
                  ? 'Saving…'
                  : editingLesson
                    ? 'Save Changes'
                    : 'Add Lesson'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lesson?</DialogTitle>
            <DialogDescription>
              {deleteConfirm && (
                <>
                  Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>?
                  This will also remove any student progress on this lesson. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLesson} disabled={deleteLesson.isPending}>
              {deleteLesson.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
