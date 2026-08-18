export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'super-admin'

export interface Organization {
  id: string
  name: string
  logo?: string
  totalBranches: number
  totalUsers: number
  subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise'
  status: 'active' | 'inactive' | 'suspended'
  contactEmail: string
  contactPhone: string
  createdAt: string
}

export interface Branch {
  id: string
  name: string
  location: string
  adminId: string
  adminName: string
  totalStudents: number
  totalTeachers: number
  totalCourses: number
  status: 'active' | 'inactive'
  lastUpdated: string
}

export interface BranchAdmin extends User {
  assignedBranchId: string
  assignedBranchName: string
  phone: string
  status: 'active' | 'inactive'
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  grade?: string
  department?: string
  children?: string[]
}

// Real backend-shaped profile — what GET/PATCH /users/me actually returns.
// Superset of User: adds fields the auth endpoints don't bother sending.
export interface ApiUserProfile {
  id: string
  name: string
  email: string
  role: string // lowercased on the backend, e.g. 'teacher'
  avatar: string | null
  isVerified: boolean
  createdAt: string
  enrolledCount: number
  coursesCount: number
}

// GET /users/me/teaching-stats — aggregate teaching activity for the
// instructor profile page (courses, students, quiz performance).
export interface TeachingStatsCourse {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  studentCount: number
  createdAt: string
}

// GET/POST /courses/:courseId/resources — downloadable course files
export interface ApiResource {
  id: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  courseId: string
  createdAt: string
  uploadedBy: {
    id: string
    name: string
  }
}
export type ResourceType = 'pdf' | 'doc' | 'video' | 'image' | 'other'

// Frontend-facing shape, derived from ApiResource via transformResource()
export interface Resource {
  id: string
  title: string
  course: string
  courseId: string
  fileUrl: string
  fileType: string
  type: ResourceType
  size: string
  sizeBytes: number
  uploadedBy: string
  createdAt: string
}

export interface TeachingStats {
  totalStudents: number
  totalCourses: number
  publishedCount: number
  draftCount: number
  categories: string[]
  quizStats: {
    totalQuizzes: number
    totalAttempts: number
    averageScore: number | null
    passRate: number | null // percentage, null if no attempts yet
  }
  courses: TeachingStatsCourse[]
  lastCourseCreatedAt: string | null
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  instructorAvatar?: string
  image: string
  progress: number
  modules: number
  students: number
  rating: number
  category: string
  duration: string
  status: 'active' | 'completed' | 'upcoming'
  price?: number
}

export interface Assignment {
  id: string
  title: string
  description: string
  course: string
  courseId: string
  dueDate: string
  status: 'pending' | 'submitted' | 'graded' | 'overdue'
  submissionCount: number
  grade: number | null
  maxGrade?: number
  feedback: string | null
  submissionFileUrl: string | null
  submittedAt: string | null
}

export interface Quiz {
  id: string
  title: string
  course: string
  questions: number
  duration: number
  status: 'available' | 'completed' | 'locked'
  score?: number
  maxScore: number
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

export interface AttendanceRecord {
  id: string
  date: string
  subject: string
  status: 'present' | 'absent' | 'late' | 'leave'
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  type: 'class' | 'exam' | 'deadline' | 'event'
  color: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'assignment' | 'quiz' | 'announcement' | 'payment' | 'message'
  read: boolean
  createdAt: string
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  read: boolean
}

export interface Conversation {
  id: string
  participantName: string
  participantAvatar?: string
  participantRole: UserRole
  lastMessage: string
  lastMessageTime: string
  unread: number
  online: boolean
  messages: Message[]
}

export interface Payment {
  id: string
  title: string
  amount: number
  dueDate: string
  status: 'paid' | 'pending' | 'overdue'
  invoiceUrl?: string
}

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}

export interface StatCard {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
}

export interface ChartDataPoint {
  name: string
  value?: number
  [key: string]: string | number | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Real backend-shaped course types
// ─────────────────────────────────────────────────────────────────────────────

// GET /courses/my (INSTRUCTOR/ADMIN) — courses owned by the logged-in instructor
export interface ApiCourseSummary {
  id: string
  title: string
  description: string
  thumbnail: string | null
  videoUrl: string | null
  price: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  instructor: {
    id: string
    name: string
    avatar: string | null
  }
  category: {
    id: string
    name: string
    slug: string
  } | null
  enrollmentCount: number
  lessonCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Real backend-shaped quiz types
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: these are intentionally separate from the legacy `Quiz` / `QuizQuestion`
// types above. Those older types are still used by pages that haven't been
// wired to the real backend yet (Dashboard, teacher/Pages.tsx, etc.) — renaming
// them now would break those screens before their turn comes. Once every page
// that touches quizzes has been migrated, the old `Quiz` / `QuizQuestion`
// types and `mockQuizzes` / `mockQuizQuestions` can be deleted.

export type QuizStatus = 'ACTIVE' | 'ARCHIVED'

// GET /quizzes, GET /quizzes/:id, POST /quizzes, PATCH /quizzes/:id
export interface ApiQuiz {
  id: string
  title: string
  courseId: string
  timeLimit: number | null
  passMark: number
  status: QuizStatus
  createdAt: string
  updatedAt: string
  course: {
    id: string
    title: string
  }
  questionCount: number
  attemptCount: number
}

// GET /quizzes/:quizId/questions — student view (no `answer` field present)
export interface ApiQuestionSafe {
  id: string
  quizId: string
  text: string
  options: string[]
  order: number
}

// GET /quizzes/:quizId/questions — instructor/admin view (includes `answer`)
export interface ApiQuestionFull extends ApiQuestionSafe {
  answer: string
}

// One row in the per-question breakdown returned by submit + get-my-attempt
export interface QuizAttemptBreakdownItem {
  questionId: string
  questionText: string
  selectedAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
}

// POST /quizzes/:quizId/attempts and GET /quizzes/:quizId/attempts/me
export interface QuizAttemptResult {
  attemptId: string
  quizId: string
  quizTitle: string
  score: number
  passed: boolean
  totalQuestions: number
  correctCount: number
  submittedAt: string
  questions: QuizAttemptBreakdownItem[]
}

// One row in the instructor-facing summary list
export interface QuizAttemptSummary {
  attemptId: string
  student: {
    id: string
    name: string
    email: string
  }
  score: number
  passed: boolean
  submittedAt: string
}

// GET /quizzes/:quizId/attempts (INSTRUCTOR/ADMIN)
export interface QuizAttemptsListResponse {
  quizId: string
  quizTitle: string
  passMark: number
  totalAttempts: number
  attempts: QuizAttemptSummary[]
}

// What the student submits when taking a quiz
export interface SubmitAttemptPayload {
  answers: Array<{
    questionId: string
    selectedAnswer: string
  }>
}
// GET /assignments, GET /assignments/:id, POST /assignments, PATCH /assignments/:id
export interface ApiAssignment {
  id: string
  title: string
  description: string | null
  courseId: string
  dueDate: string | null
  createdAt: string
  updatedAt: string
  course: {
    id: string
    title: string
  }
  submissionCount: number
}

// GET /assignments/:assignmentId/submissions, POST /assignments/:assignmentId/submit,
// PATCH /assignments/submissions/:submissionId/grade
export interface ApiAssignmentSubmission {
  id: string
  userId: string
  assignmentId: string
  fileUrl: string | null
  grade: number | null
  feedback: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
}

// GET /attendance/roster
export interface ApiAttendanceRosterEntry {
  userId: string
  name: string
  avatar: string | null
  status: 'PRESENT' | 'ABSENT' | null // null = not yet marked for this date
}

// GET /attendance/summary
export interface ApiAttendanceSummaryEntry {
  userId: string
  name: string
  avatar: string | null
  present: number
  absent: number
  percentage: number
}

// GET /gradebook/:courseId
export interface ApiGradebookQuizResult {
  quizId: string
  title: string
  score: number
  passed: boolean
}

export interface ApiGradebookAssignmentResult {
  assignmentId: string
  title: string
  grade: number | null
}

export interface ApiGradebookRow {
  userId: string
  name: string
  avatar: string | null
  quizzes: ApiGradebookQuizResult[]
  assignments: ApiGradebookAssignmentResult[]
  quizAverage: number | null
  assignmentAverage: number | null
  overallGrade: number | null
}

export interface ApiGradebook {
  course: { id: string; title: string }
  quizzes: { id: string; title: string }[]
  assignments: { id: string; title: string }[]
  rows: ApiGradebookRow[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Real backend-shaped lesson types
// ─────────────────────────────────────────────────────────────────────────────

export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT'

// GET /courses/:courseId/lessons
export interface ApiLesson {
  id: string
  title: string
  description: string | null
  type: LessonType
  videoUrl: string | null
  content: string | null
  duration: number | null
  order: number
  isPreview: boolean
  courseId: string
  createdAt: string
  updatedAt: string
}

// GET /announcements, GET /announcements/:id, POST /announcements, PATCH /announcements/:id
export interface ApiAnnouncement {
  id: string
  title: string
  body: string
  courseId: string | null // null = posted to all of the instructor's courses
  instructorId: string
  createdAt: string
  updatedAt: string
  course: { id: string; title: string } | null
  instructor: { id: string; name: string; avatar: string | null }
}

// GET /notifications/me
export interface ApiNotification {
  id: string
  title: string
  message: string
  isRead: boolean
  type: 'GENERAL' | 'ENROLLMENT' | 'ASSIGNMENT' | 'QUIZ' | 'PAYMENT' | 'CERTIFICATE' | 'PARENT_STUDENT' | 'ANNOUNCEMENT'
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEND THIS BLOCK to the end of your existing src/types/index.ts
// (Do not replace the file — just paste this at the bottom.)
// ─────────────────────────────────────────────────────────────────────────────

// GET /discussions, GET /discussions/:id, POST /discussions, POST /discussions/:id/replies,
// POST /discussions/:id/like, DELETE /discussions/:id, PATCH /discussions/:id/pin
export interface ApiDiscussionAuthor {
  id: string
  name: string
  avatar: string | null
}

// Shape returned by GET /discussions (list) and as the `thread` payload from
// POST /discussions and PATCH /discussions/:id/pin.
export interface ApiDiscussionThread {
  id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
  courseId: string
  course: { id: string; title: string }
  author: ApiDiscussionAuthor
  replies: number // reply COUNT in list responses — see ApiDiscussionThreadDetail below
  likes: number
  likedByMe: boolean
}

export interface ApiDiscussionReply {
  id: string
  content: string
  createdAt: string
  author: ApiDiscussionAuthor
}

// Shape returned by GET /discussions/:id.
// NOTE: the backend's formatThread() spreads the list shape (replies: number)
// and then overwrites `replies` with the actual reply array — so on the detail
// endpoint `replies` is an array, not a count. This type reflects that.
export interface ApiDiscussionThreadDetail extends Omit<ApiDiscussionThread, 'replies'> {
  replies: ApiDiscussionReply[]
}
