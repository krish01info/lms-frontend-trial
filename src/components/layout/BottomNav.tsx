import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, MessageSquare, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { UserRole } from '@/types'

const bottomNavItems: Record<UserRole, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { label: 'Home', href: '/student', icon: LayoutDashboard },
    { label: 'Courses', href: '/student/courses', icon: BookOpen },
    { label: 'Messages', href: '/student/messages', icon: MessageSquare },
    { label: 'Profile', href: '/student/profile', icon: User },
  ],
  teacher: [
    { label: 'Home', href: '/teacher', icon: LayoutDashboard },
    { label: 'Courses', href: '/teacher/courses', icon: BookOpen },
    { label: 'Messages', href: '/teacher/messages', icon: MessageSquare },
    { label: 'Profile', href: '/teacher/profile', icon: User },
  ],
  parent: [
    { label: 'Home', href: '/parent', icon: LayoutDashboard },
    { label: 'Courses', href: '/parent/courses', icon: BookOpen },
    { label: 'Messages', href: '/parent/messages', icon: MessageSquare },
    { label: 'Profile', href: '/parent/profile', icon: User },
  ],
  admin: [
    { label: 'Home', href: '/admin', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: BookOpen },
    { label: 'Analytics', href: '/admin/analytics', icon: MessageSquare },
    { label: 'Profile', href: '/admin/settings', icon: User },
  ],
  'super-admin': [
    { label: 'Home', href: '/super-admin', icon: LayoutDashboard },
    { label: 'Branches', href: '/super-admin/branches', icon: BookOpen },
    { label: 'Admins', href: '/super-admin/branch-admins', icon: User },
    { label: 'Profile', href: '/super-admin/settings', icon: User },
  ],
}

interface BottomNavProps {
  role: UserRole
}

export function BottomNav({ role }: BottomNavProps) {
  const items = bottomNavItems[role]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={(item.href ?? '').split('/').length <= 2}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
