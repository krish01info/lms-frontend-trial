import { format, parseISO } from 'date-fns'
import { Calendar, FileText, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Assignment } from '@/types'
import { cn } from '@/utils/cn'

const statusConfig = {
  pending: { label: 'Pending', variant: 'warning' as const },
  submitted: { label: 'Submitted', variant: 'secondary' as const },
  graded: { label: 'Graded', variant: 'success' as const },
  overdue: { label: 'Overdue', variant: 'destructive' as const },
}

interface AssignmentCardProps {
  assignment: Assignment
  onView?: () => void
  onSubmit?: () => void
}

export function AssignmentCard({ assignment, onView, onSubmit }: AssignmentCardProps) {
  const status = statusConfig[assignment.status]

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{assignment.title}</h3>
              <p className="text-sm text-muted-foreground">{assignment.course}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Due {assignment.dueDate ? format(parseISO(assignment.dueDate), 'MMM d, yyyy') : 'No due date'}
              </div>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {assignment.description && (
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {assignment.description}
          </p>
        )}

        {assignment.status === 'graded' && assignment.grade !== null && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Grade:</span>
              <span className={cn('text-lg font-bold', assignment.grade >= 80 ? 'text-emerald-600' : 'text-amber-600')}>
                {assignment.grade}{assignment.maxGrade ? `/${assignment.maxGrade}` : ''}
              </span>
            </div>
            {assignment.feedback && (
              <p className="text-sm text-muted-foreground italic">"{assignment.feedback}"</p>
            )}
            {assignment.submissionFileUrl && (
              
                <a href={assignment.submissionFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                View submitted file
              </a>
            )}
          </div>
        )}

        {assignment.status === 'submitted' && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Submitted {assignment.submittedAt ? format(parseISO(assignment.submittedAt), 'MMM d, yyyy') : ''} — awaiting grade
            </span>
            {assignment.submissionFileUrl && (
              
                <a href={assignment.submissionFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                View file
              </a>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {(assignment.status === 'pending' || assignment.status === 'overdue') && onSubmit && (
            <Button size="sm" onClick={onSubmit}>
              Submit Assignment
            </Button>
          )}
          {onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}