import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, Clock, Download, File, FileImage, FileText, FileVideo, HelpCircle, MessageSquare, PenTool, Play, Star, Trophy, Users } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { EmptyState } from '@/components/common/EmptyState'
import { AssignmentCard } from '@/components/common/AssignmentCard'
import { SubmitAssignmentModal } from '@/components/common/SubmitAssignmentModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuizList } from '@/hooks/useQuizData'
import { useMyAttempt } from '@/hooks/useQuizData'
import type { ApiQuiz, ApiResource, Assignment } from '@/types'
import api from '@/services/api'
import { transformCourse, transformLesson, transformAssignment } from '@/utils/transformers'
import { cn } from '@/utils/cn'

// ─── Resource type helpers — same logic as ResourcesPage ───────────────────

type ResourceType = 'pdf' | 'doc' | 'video' | 'image' | 'other'

function inferType(mimeType: string): ResourceType {
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc'
  if (mimeType.includes('video') || mimeType.includes('mp4') || mimeType.includes('webm')) return 'video'
  if (mimeType.includes('image') || mimeType.includes('png') || mimeType.includes('jpg') || mimeType.includes('jpeg') || mimeType.includes('webp')) return 'image'
  return 'other'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const typeIcons: Record<ResourceType, typeof FileText> = {
  pdf: FileText,
  doc: File,
  video: FileVideo,
  image: FileImage,
  other: File,
}

const typeColors: Record<ResourceType, string> = {
  pdf: 'bg-red-500/10 text-red-600',
  doc: 'bg-blue-500/10 text-blue-600',
  video: 'bg-purple-500/10 text-purple-600',
  image: 'bg-amber-500/10 text-amber-600',
  other: 'bg-muted text-muted-foreground',
}

export function CourseDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
  } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const res = await api.get(`/courses/${id}`)
      return transformCourse(res.data.data.course)
    },
    enabled: !!id,
  })

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['course-lessons', id],
    queryFn: async () => {
      const res = await api.get(`/courses/${id}/lessons`)
      return res.data.data.lessons.map(transformLesson)
    },
    enabled: !!id,
  })

  // Per-lesson completion status for THIS course — separate from the
  // per-course rollup used elsewhere (ProgressPage/ProfilePage/Dashboard)
  const { data: courseProgressDetail } = useQuery({
    queryKey: ['course-progress-detail', id],
    queryFn: async () => {
      const res = await api.get(`/progress/${id}`)
      return res.data.data.lessons
    },
    enabled: !!id,
  })

  // Same queryKey as ProgressPage/ProfilePage — shares cache
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['progress-my'],
    queryFn: async () => {
      const res = await api.get('/progress/my')
      return res.data.data.progress
    },
  })

  // Live resources for this course — same endpoint ResourcesPage fetches per-course
  const { data: resources, isLoading: resourcesLoading, isError: resourcesError } = useQuery({
    queryKey: ['course-resources', id],
    queryFn: async () => {
      const res = await api.get(`/courses/${id}/resources`)
      return res.data.data.resources as ApiResource[]
    },
    enabled: !!id,
  })

  // Live assignments for this course — same /assignments endpoint AssignmentsPage
  // uses, scoped with ?courseId= (supported server-side per assignments.routes.js)
  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ['course-assignments', id],
    queryFn: async () => {
      const res = await api.get('/assignments', { params: { courseId: id } })
      return res.data.data.assignments.map(transformAssignment) as Assignment[]
    },
    enabled: !!id,
  })

  // NOTE: mutationFn takes the full lesson (not just id) so we can send
// a real request body — the backend's PATCH /progress/:lessonId only
// updates completed/watchedTime if they're present in req.body.
const markCompleteMutation = useMutation({
  mutationFn: async (lesson: { id: string; duration?: number }) => {
    const res = await api.patch(`/progress/${lesson.id}`, {
      completed: true,
      // lesson.duration is in seconds (confirmed via API + the teacher-side
      // "Add Lesson" form, which is explicitly labeled "Duration (seconds)").
      // Matches backend watchedTime units directly — no conversion needed.
      watchedTime: lesson.duration ?? 0,
    })
    return res.data.data.progress
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['progress-my'] })
    queryClient.invalidateQueries({ queryKey: ['course-progress-detail', id] })
    queryClient.invalidateQueries({ queryKey: ['progress-weekly-hours'] })
    queryClient.invalidateQueries({ queryKey: ['activity-my'] })
  },
})

  const isLessonCompleted = (lessonId: string) => {
    return courseProgressDetail?.find((l: any) => l.id === lessonId)?.completed ?? false
  }

  function handleOpenSubmit(assignment: Assignment) {
    setSubmitTarget(assignment)
    setModalOpen(true)
  }

  const courseProgress = progressData?.find((p: any) => p.courseId === id)
  const progressPercentage = courseProgress?.percentage ?? 0
  const completedLessons = courseProgress?.completedLessons
  const totalLessons = courseProgress?.totalLessons

  if (courseLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-3xl bg-muted animate-pulse sm:h-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-96 rounded-xl bg-muted animate-pulse" />
          <div className="h-96 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (courseError || !course) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Failed to load course"
        description="Could not load this course. Please try again."
      />
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Courses', href: '/student/courses' }, { label: course.title }]} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-3xl">
        <img src={course.image} alt={course.title} className="h-64 w-full object-cover sm:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <Badge className="mb-3">{course.category}</Badge>
          <h1 className="text-2xl font-bold text-white sm:text-4xl">{course.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{course.students} students</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{course.rating}</span>
            <span>{course.duration}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="modules">
            <TabsList>
              <TabsTrigger value="modules">Lessons</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="modules" className="space-y-3">
              {lessonsLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {!lessonsLoading && (!lessons || lessons.length === 0) && (
                <EmptyState
                  icon={Play}
                  title="No lessons yet"
                  description="This course doesn't have any lessons published yet."
                />
              )}

              {!lessonsLoading &&
                lessons?.map((lesson: any) => {
                  const completed = isLessonCompleted(lesson.id)
                  return (
                    <Link key={lesson.id} to={`/student/courses/${id}/lessons/${lesson.id}`} className="block">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:ring-1 hover:ring-primary/20">
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${completed ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
                            {completed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Play className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{lesson.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {lesson.description || `Lesson ${lesson.order}`}
                              {lesson.duration ? ` · ${Math.round(lesson.duration / 60)} min` : ''}
                            </p>
                          </div>
                          {lesson.isPreview && <Badge variant="secondary">Preview</Badge>}
                          {completed ? (
                            <Badge variant="secondary">Completed</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={markCompleteMutation.isPending}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                markCompleteMutation.mutate({ id: lesson.id, duration: lesson.duration })
                              }}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
            </TabsContent>

            <TabsContent value="resources" className="space-y-3">
              {resourcesLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {resourcesError && (
                <EmptyState
                  icon={FileText}
                  title="Could not load resources"
                  description="Something went wrong. Please try again."
                />
              )}

              {!resourcesLoading && !resourcesError && (!resources || resources.length === 0) && (
                <EmptyState
                  icon={FileText}
                  title="No resources yet"
                  description="This course doesn't have any resources uploaded yet."
                />
              )}

              {!resourcesLoading && !resourcesError && resources?.map((resource) => {
                const type = inferType(resource.fileType)
                const Icon = typeIcons[type]
                return (
                  <Card key={resource.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', typeColors[type])}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium block truncate">{resource.title}</span>
                          <span className="text-xs text-muted-foreground">{formatSize(resource.fileSize)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="assignments" className="space-y-3">
              {assignmentsLoading && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {assignmentsError && (
                <EmptyState
                  icon={BookOpen}
                  title="Could not load assignments"
                  description="Something went wrong. Please try again."
                />
              )}

              {!assignmentsLoading && !assignmentsError && (!assignments || assignments.length === 0) && (
                <EmptyState
                  icon={BookOpen}
                  title="No assignments yet"
                  description="This course doesn't have any assignments yet."
                />
              )}

              {!assignmentsLoading && !assignmentsError &&
                assignments?.map((a) => (
                  <AssignmentCard key={a.id} assignment={a} onSubmit={() => handleOpenSubmit(a)} />
                ))}
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-3">
              <CourseQuizzesTab courseId={id!} />
            </TabsContent>

            <TabsContent value="discussion" className="space-y-3">
              {['Question about integration by parts', 'Help with problem 15', 'Study group for midterm'].map((topic) => (
                <Card key={topic} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-3 p-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{topic}</span>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Instructor</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-4">
              <img src={course.instructorAvatar} alt={course.instructor} className="h-14 w-14 rounded-2xl object-cover" />
              <div>
                <p className="font-semibold">{course.instructor}</p>
                <p className="text-sm text-muted-foreground">Instructor</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Your Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {progressLoading ? (
                <div className="h-24 rounded-xl bg-muted animate-pulse" />
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{progressPercentage}%</p>
                    <p className="text-sm text-muted-foreground">Complete</p>
                    {completedLessons !== undefined && totalLessons !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {completedLessons} of {totalLessons} lessons completed
                      </p>
                    )}
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </>
              )}
              <Button className="w-full"><BookOpen className="mr-2 h-4 w-4" />Continue Learning</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <SubmitAssignmentModal
        assignment={submitTarget}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => refetchAssignments()}
      />
    </div>
  )
}

function CourseQuizzesTab({ courseId }: { courseId: string }) {
  const { data, isLoading } = useQuizList(courseId)
  const quizzes = data?.quizzes ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!quizzes.length) {
    return (
      <EmptyState
        icon={PenTool}
        title="No quizzes yet"
        description="This course doesn't have any active quizzes yet."
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {quizzes.map((quiz, i) => (
        <CourseQuizCard key={quiz.id} quiz={quiz} index={i} />
      ))}
    </div>
  )
}

function CourseQuizCard({ quiz, index }: { quiz: ApiQuiz; index: number }) {
  const { data: attempt } = useMyAttempt(quiz.id)
  const isCompleted = !!attempt

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {isCompleted ? (
                  <Trophy className="h-5 w-5 text-emerald-600" />
                ) : (
                  <PenTool className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{quiz.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    {quiz.questionCount} Qs
                  </span>
                  {quiz.timeLimit && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {quiz.timeLimit}min
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Badge variant={isCompleted ? 'secondary' : 'default'}>
              {isCompleted ? 'Done' : 'Open'}
            </Badge>
          </div>

          <div className="mt-4">
            {isCompleted ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/student/quizzes/${quiz.id}/results`}>View Results</Link>
              </Button>
            ) : (
              <Button size="sm" className="w-full" asChild>
                <Link to={`/student/quizzes/take/${quiz.id}`}>Start Quiz</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}