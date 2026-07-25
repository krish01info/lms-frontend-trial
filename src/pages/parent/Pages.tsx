// ─── Proper parent-specific pages (call /parent/* endpoints, not student ones)
export { ParentPerformancePage } from './ChildViewPages'
export { ParentAttendancePage } from './ChildViewPages'
export { ParentAssignmentsPage } from './ChildViewPages'
export { ParentProgressPage } from './ChildViewPages'

// ─── Role-agnostic pages (safe to share — use /messages, /notifications, /users/me)
// ─── Role-agnostic pages (safe to share — use /messages, /users/me)
export { MessagesPage as ParentMessagesPage } from '@/pages/student/MessagesPage'
export { CalendarPage as ParentCalendarPage } from '@/pages/student/CalendarPage'
export { ProfilePage as ParentProfilePage } from '@/pages/student/ProfilePage'

// ─── Notifications — parent-scoped (per-child), not the generic /notifications one
export { ParentNotificationsPage } from './ChildViewPages'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download } from 'lucide-react'

export function ReportsPage() {
  return (
    <PageShell title="Reports" description="Download academic reports for your child">
      <div className="grid gap-4 sm:grid-cols-2">
        {['Semester Report Card', 'Attendance Report', 'Fee Statement', 'Progress Report'].map((report) => (
          <Card key={report} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center justify-between p-5">
              <span className="font-medium">{report}</span>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}

// Fee payments page — parent-safe, uses /payments endpoint
export { PaymentsPage as ParentPaymentsPage } from '@/pages/student/PaymentsPage'
