import {
  BookOpen,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Award,
  BarChart3,
  Bell,
  Bot,
  FolderOpen,
  User,
  Shield,
  ScrollText,
  PenTool,
  ClipboardCheck,
  TrendingUp,
  DollarSign,
  PieChart,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavConfig {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

const studentNav: NavConfig[] = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'My Courses', href: '/student/courses', icon: BookOpen },
  { label: 'Assignments', href: '/student/assignments', icon: ClipboardList, badge: 3 },
  { label: 'Quizzes', href: '/student/quizzes', icon: PenTool },
  { label: 'Attendance', href: '/student/attendance', icon: ClipboardCheck },
  { label: 'Calendar', href: '/student/calendar', icon: Calendar },
  { label: 'Fees', href: '/student/fees', icon: CreditCard },
  { label: 'Payments', href: '/student/payments', icon: DollarSign },
  { label: 'Results', href: '/student/results', icon: Award },
  { label: 'Progress', href: '/student/progress', icon: TrendingUp },
  { label: 'Discussion', href: '/student/discussion', icon: MessageSquare },
  { label: 'Resources', href: '/student/resources', icon: FolderOpen },
  { label: 'Certificates', href: '/student/certificates', icon: GraduationCap },
  { label: 'AI Tutor', href: '/student/ai-tutor', icon: Bot },
  { label: 'Messages', href: '/student/messages', icon: MessageSquare, badge: 2 },
  { label: 'Notifications', href: '/student/notifications', icon: Bell, badge: 5 },
  { label: 'Profile', href: '/student/profile', icon: User },
  { label: 'Settings', href: '/student/settings', icon: Settings },
]

const teacherNav: NavConfig[] = [
  { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
  { label: 'Create Course', href: '/teacher/create-course', icon: BookOpen },
  { label: 'Manage Courses', href: '/teacher/courses', icon: FolderOpen },
  { label: 'Enrollments', href: '/teacher/enrollments', icon: GraduationCap },
  { label: 'Assignments', href: '/teacher/assignments', icon: ClipboardList },
  { label: 'Quiz Builder', href: '/teacher/quiz-builder', icon: PenTool },
  { label: 'Attendance', href: '/teacher/attendance', icon: ClipboardCheck },
  { label: 'Gradebook', href: '/teacher/gradebook', icon: FileText },
  { label: 'Announcements', href: '/teacher/announcements', icon: Bell },
  { label: 'Student Performance', href: '/teacher/performance', icon: TrendingUp },
  { label: 'Messages', href: '/teacher/messages', icon: MessageSquare, badge: 4 },
  { label: 'Resources', href: '/teacher/resources', icon: FolderOpen },
  { label: 'Profile', href: '/teacher/profile', icon: User },
]

const parentNav: NavConfig[] = [
  { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
  { label: 'Enrolled Courses', href: '/parent/courses', icon: BookOpen },
  { label: 'Child Performance', href: '/parent/performance', icon: TrendingUp },
  { label: 'Attendance', href: '/parent/attendance', icon: ClipboardCheck },
  { label: 'Assignments', href: '/parent/assignments', icon: ClipboardList },
  { label: 'Fee Payments', href: '/parent/payments', icon: CreditCard },
  { label: 'Teacher Messages', href: '/parent/messages', icon: MessageSquare, badge: 1 },
  { label: 'Academic Progress', href: '/parent/progress', icon: BarChart3 },
  { label: 'Notifications', href: '/parent/notifications', icon: Bell, badge: 3 },
  { label: 'Calendar', href: '/parent/calendar', icon: Calendar },
  { label: 'Reports', href: '/parent/reports', icon: FileText },
  { label: 'Profile', href: '/parent/profile', icon: User },
]

const adminNav: NavConfig[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Manage Users', href: '/admin/users', icon: Users },
  { label: 'Manage Courses', href: '/admin/courses', icon: BookOpen },
  { label: 'Payments', href: '/admin/payments', icon: DollarSign },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
  { label: 'Analytics', href: '/admin/analytics', icon: PieChart },
  { label: 'Role Management', href: '/admin/roles', icon: Shield },
  { label: 'System Settings', href: '/admin/settings', icon: Settings },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
]

const superAdminNav: NavConfig[] = [
  { label: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
  { label: 'Organization', href: '/super-admin/organization', icon: Shield },
  { label: 'Branches', href: '/super-admin/branches', icon: FolderOpen },
  { label: 'Branch Admins', href: '/super-admin/admins', icon: Users },
]

export const navigationByRole: Record<UserRole, NavConfig[]> = {
  student: studentNav,
  teacher: teacherNav,
  parent: parentNav,
  admin: adminNav,
  'super-admin': superAdminNav,
}

export const roleDashboardPaths: Record<UserRole, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
  admin: '/admin',
  'super-admin': '/super-admin',
}

export const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  admin: 'Administrator',
  'super-admin': 'Super Admin',
}


export const APP_NAME = 'LearnFlow'
