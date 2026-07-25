import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PageSkeleton } from '@/components/common/Skeleton'
import { ProtectedRoute, PublicRoute } from './guards'

// Auth
import { SplashPage } from '@/pages/auth/SplashPage'
import { OnboardingPage } from '@/pages/auth/OnboardingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

// Student
import { StudentDashboard } from '@/pages/student/Dashboard'
import { CoursesPage } from '@/pages/student/CoursesPage'
import { CourseDetailPage } from '@/pages/student/CourseDetailPage'
import { AssignmentsPage } from '@/pages/student/AssignmentsPage'
import { QuizzesPage } from '@/pages/student/QuizzesPage'
import { QuizTakePage } from '@/pages/student/QuizTakePage'
import { QuizResultsPage } from '@/pages/student/QuizResultsPage'
import { AttendancePage } from '@/pages/student/AttendancePage'
import { CalendarPage } from '@/pages/student/CalendarPage'
import { FeesPage } from '@/pages/student/FeesPage'
import { PaymentsPage } from '@/pages/student/PaymentsPage'
import { ResultsPage } from '@/pages/student/ResultsPage'
import { ProgressPage } from '@/pages/student/ProgressPage'
import { DiscussionPage } from '@/pages/student/DiscussionPage'
import { ResourcesPage } from '@/pages/student/ResourcesPage'
import { CertificatesPage } from '@/pages/student/CertificatesPage'
import { MessagesPage } from '@/pages/student/MessagesPage'
import { NotificationsPage } from '@/pages/student/NotificationsPage'
import { ProfilePage } from '@/pages/student/ProfilePage'
import { SettingsPage } from '@/pages/student/SettingsPage'
import { AITutorPage } from '@/pages/student/AITutorPage'

// Teacher
import { TeacherDashboard } from '@/pages/teacher/Dashboard'
import { QuizBuilderPage } from '@/pages/teacher/TeacherQuizzesPage'
import { TeacherQuizQuestionsPage } from '@/pages/teacher/TeacherQuizQuestionsPage'
import { QuizAnalyticsPage } from '@/pages/teacher/QuizAnalyticsPage'
import { TeacherProfilePage } from '@/pages/teacher/ProfilePage'
import { CourseEditPage } from '@/pages/teacher/CourseEditPage'
import { LessonManagerPage } from '@/pages/teacher/LessonManagerPage'
import { TeacherResourcesPage } from '@/pages/teacher/ResourcesPage'
import { AssignmentSubmissionsPage } from '@/pages/teacher/AssignmentSubmissionsPage'
import { TeacherNotificationsPage } from '@/pages/teacher/TeacherNotificationsPage'
import { StudentPerformancePage } from '@/pages/teacher/StudentPerformancePage'
import { TeacherMessagesPage } from '@/pages/teacher/TeacherMessagesPage'
import { TeacherEnrollmentsPage } from '@/pages/teacher/TeacherEnrollmentsPage'
import { TeacherSettingsPage } from '@/pages/teacher/TeacherSettingsPage'
import {
  CreateCoursePage,
  TeacherCoursesPage,
  TeacherAssignmentsPage,
  TeacherAttendancePage,
  GradebookPage,
  AnnouncementsPage,
} from '@/pages/teacher/Pages'

// Parent
import { ParentDashboard } from '@/pages/parent/Dashboard'
import {
  ParentPerformancePage,
  ParentAttendancePage,
  ParentAssignmentsPage,
  ParentPaymentsPage,
  ParentMessagesPage,
  ParentProgressPage,
  ParentNotificationsPage,
  ParentCalendarPage,
  ReportsPage as ParentReportsPage,
  ParentProfilePage,
  ParentCoursesPage,
} from '@/pages/parent/Pages'

// Admin
import { AdminDashboard } from '@/pages/admin/Dashboard'
import {
  UsersPage,
  AdminCoursesPage,
  AdminPaymentsPage,
  ReportsPage as AdminReportsPage,
  AnalyticsPage,
  RolesPage,
  SettingsPage as AdminSettingsPage,
  AuditLogsPage,
} from '@/pages/admin/Pages'

// Super Admin
import {
  SuperAdminDashboard,
  OrganizationPage,
  BranchesPage,
  BranchAdminsPage,
  SuperAdminTeachersPage,
  SuperAdminStudentsPage,
  SuperAdminParentsPage,
  SuperAdminCoursesPage,
  SuperAdminPaymentsPage,
  SuperAdminReportsPage,
  SuperAdminAnalyticsPage,
  SuperAdminAnnouncementsPage,
  SuperAdminSettingsPage,
} from '@/pages/super-admin/Pages'

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
)

export const router = createBrowserRouter([
  { path: '/', element: <SplashPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/otp-verification', element: <OtpPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['student']} />,
    children: [
      { path: '/student', element: withSuspense(<StudentDashboard />) },
      { path: '/student/courses', element: withSuspense(<CoursesPage />) },
      { path: '/student/courses/:id', element: withSuspense(<CourseDetailPage />) },
      { path: '/student/assignments', element: withSuspense(<AssignmentsPage />) },
      { path: '/student/quizzes', element: withSuspense(<QuizzesPage />) },
      { path: '/student/quizzes/take/:quizId', element: withSuspense(<QuizTakePage />) },
      { path: '/student/quizzes/:quizId/results', element: withSuspense(<QuizResultsPage />) },
      { path: '/student/ai-tutor', element: withSuspense(<AITutorPage />) },
      { path: '/student/attendance', element: withSuspense(<AttendancePage />) },
      { path: '/student/calendar', element: withSuspense(<CalendarPage />) },
      { path: '/student/fees', element: withSuspense(<FeesPage />) },
      { path: '/student/payments', element: withSuspense(<PaymentsPage />) },
      { path: '/student/results', element: withSuspense(<ResultsPage />) },
      { path: '/student/progress', element: withSuspense(<ProgressPage />) },
      { path: '/student/discussion', element: withSuspense(<DiscussionPage />) },
      { path: '/student/resources', element: withSuspense(<ResourcesPage />) },
      { path: '/student/certificates', element: withSuspense(<CertificatesPage />) },
      { path: '/student/messages', element: withSuspense(<MessagesPage />) },
      { path: '/student/notifications', element: withSuspense(<NotificationsPage />) },
      { path: '/student/profile', element: withSuspense(<ProfilePage />) },
      { path: '/student/settings', element: withSuspense(<SettingsPage />) },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['teacher']} />,
    children: [
      { path: '/teacher', element: withSuspense(<TeacherDashboard />) },
      { path: '/teacher/create-course', element: withSuspense(<CreateCoursePage />) },
      { path: '/teacher/courses', element: withSuspense(<TeacherCoursesPage />) },

      { path: '/teacher/courses/:courseId/edit', element: withSuspense(<CourseEditPage />) },
      { path: '/teacher/courses/:courseId/lessons', element: withSuspense(<LessonManagerPage />) },

      { path: '/teacher/assignments', element: withSuspense(<TeacherAssignmentsPage />) },
      { path: '/teacher/assignments/:assignmentId/submissions', element: withSuspense(<AssignmentSubmissionsPage />) },
      { path: '/teacher/quiz-builder', element: withSuspense(<QuizBuilderPage />) },
      { path: '/teacher/quiz-builder/:quizId', element: withSuspense(<TeacherQuizQuestionsPage />) },
      { path: '/teacher/quiz-builder/:quizId/analytics', element: withSuspense(<QuizAnalyticsPage />) },
      { path: '/teacher/attendance', element: withSuspense(<TeacherAttendancePage />) },
      { path: '/teacher/notifications', element: withSuspense(<TeacherNotificationsPage />) },
      { path: '/teacher/gradebook', element: withSuspense(<GradebookPage />) },
      { path: '/teacher/announcements', element: withSuspense(<AnnouncementsPage />) },
      { path: '/teacher/resources', element: withSuspense(<TeacherResourcesPage />) },
      { path: '/teacher/performance', element: withSuspense(<StudentPerformancePage />) },
      { path: '/teacher/messages', element: withSuspense(<TeacherMessagesPage />) },
      { path: '/teacher/enrollments', element: withSuspense(<TeacherEnrollmentsPage />) },
      { path: '/teacher/settings', element: withSuspense(<TeacherSettingsPage />) },
      { path: '/teacher/profile', element: withSuspense(<TeacherProfilePage />) },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['parent']} />,
    children: [
      { path: '/parent', element: withSuspense(<ParentDashboard />) },
      { path: '/parent/courses', element: withSuspense(<ParentCoursesPage />) },
      { path: '/parent/performance', element: withSuspense(<ParentPerformancePage />) },
      { path: '/parent/attendance', element: withSuspense(<ParentAttendancePage />) },
      { path: '/parent/assignments', element: withSuspense(<ParentAssignmentsPage />) },
      { path: '/parent/payments', element: withSuspense(<ParentPaymentsPage />) },
      { path: '/parent/messages', element: withSuspense(<ParentMessagesPage />) },
      { path: '/parent/progress', element: withSuspense(<ParentProgressPage />) },
      { path: '/parent/notifications', element: withSuspense(<ParentNotificationsPage />) },
      { path: '/parent/calendar', element: withSuspense(<ParentCalendarPage />) },
      { path: '/parent/reports', element: withSuspense(<ParentReportsPage />) },
      { path: '/parent/profile', element: withSuspense(<ParentProfilePage />) },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      { path: '/admin', element: withSuspense(<AdminDashboard />) },
      { path: '/admin/users', element: withSuspense(<UsersPage />) },
      { path: '/admin/courses', element: withSuspense(<AdminCoursesPage />) },
      { path: '/admin/payments', element: withSuspense(<AdminPaymentsPage />) },
      { path: '/admin/reports', element: withSuspense(<AdminReportsPage />) },
      { path: '/admin/analytics', element: withSuspense(<AnalyticsPage />) },
      { path: '/admin/roles', element: withSuspense(<RolesPage />) },
      { path: '/admin/settings', element: withSuspense(<AdminSettingsPage />) },
      { path: '/admin/audit-logs', element: withSuspense(<AuditLogsPage />) },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super-admin']} />,
    children: [
      { path: '/super-admin', element: withSuspense(<SuperAdminDashboard />) },
      { path: '/super-admin/organizations', element: withSuspense(<OrganizationPage />) },
      { path: '/super-admin/branches', element: withSuspense(<BranchesPage />) },
      { path: '/super-admin/branch-admins', element: withSuspense(<BranchAdminsPage />) },
      { path: '/super-admin/teachers', element: withSuspense(<SuperAdminTeachersPage />) },
      { path: '/super-admin/students', element: withSuspense(<SuperAdminStudentsPage />) },
      { path: '/super-admin/parents', element: withSuspense(<SuperAdminParentsPage />) },
      { path: '/super-admin/courses', element: withSuspense(<SuperAdminCoursesPage />) },
      { path: '/super-admin/payments', element: withSuspense(<SuperAdminPaymentsPage />) },
      { path: '/super-admin/reports', element: withSuspense(<SuperAdminReportsPage />) },
      { path: '/super-admin/analytics', element: withSuspense(<SuperAdminAnalyticsPage />) },
      { path: '/super-admin/announcements', element: withSuspense(<SuperAdminAnnouncementsPage />) },
      { path: '/super-admin/settings', element: withSuspense(<SuperAdminSettingsPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
