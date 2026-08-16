import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Award, Download, ExternalLink, GraduationCap } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

export function CertificatesPage() {
  const { user } = useAuth()

  const {
    data: certificates,
    isLoading: isCertsLoading,
    isError: isCertsError,
  } = useQuery({
    queryKey: ['certificates-my'],
    queryFn: async () => {
      const res = await api.get('/certificates/my')
      return res.data.data.certificates
    },
  })

  // Reused from ProgressPage/ProfilePage — same query cache
  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: ['progress-my'],
    queryFn: async () => {
      const res = await api.get('/progress/my')
      return res.data.data.progress
    },
  })

  const isLoading = isCertsLoading || isProgressLoading
  const certs = certificates || []
  const progress = progressData || []

  const certifiedCourseIds = new Set(certs.map((c: any) => c.courseId))
const completedAwaitingCert = progress.filter(
  (p: any) => !certifiedCourseIds.has(p.courseId) && p.percentage === 100
)
const inProgressCourses = progress.filter(
  (p: any) => !certifiedCourseIds.has(p.courseId) && p.percentage < 100
)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificates" description="Your earned credentials and achievements" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isCertsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificates" description="Your earned credentials and achievements" />
        <EmptyState
          icon={Award}
          title="Failed to load certificates"
          description="Could not connect to the server. Please try again."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Certificates" description="Your earned credentials and achievements">
        <Badge variant="success" className="gap-1">
          <Award className="h-3.5 w-3.5" />
          {certs.length} earned
        </Badge>
      </PageHeader>

      {certs.length === 0 && inProgressCourses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No certificates yet"
          description="Complete a course to earn your first certificate."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((cert: any, i: number) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-emerald-500/20">
                <CardContent className="p-0">
                  <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/90 to-secondary p-6 text-white">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
                    <div className="relative flex items-start justify-between">
                      <GraduationCap className="h-10 w-10 text-white/80" />
                      <Badge className="bg-white/20 text-white border-0">Verified</Badge>
                    </div>
                    <h3 className="relative mt-4 text-lg font-bold">{cert.course?.title || 'Course'}</h3>
                  </div>

                  <div className="space-y-3 p-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Issued to</span>
                      <span className="font-medium">{user?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 gap-2"
                        disabled={!cert.fileUrl}
                        onClick={() => cert.fileUrl && window.open(cert.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!cert.fileUrl}
                        onClick={() => cert.fileUrl && window.open(cert.fileUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {completedAwaitingCert.map((course: any, i: number) => (
  <motion.div
    key={course.courseId}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: (certs.length + i) * 0.05 }}
  >
    <Card className="border-amber-500/20">
      <CardContent className="p-0">
        <div className="rounded-t-2xl bg-muted/50 p-6">
          <div className="flex items-center justify-between">
            <GraduationCap className="h-10 w-10 text-amber-500" />
            <Badge variant="warning">Awaiting Certificate</Badge>
          </div>
          <h3 className="mt-4 text-lg font-bold">{course.courseTitle}</h3>
          <p className="mt-2 text-sm font-medium text-emerald-600">Course complete!</p>
        </div>
        <div className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">
            You've completed this course. Your certificate will be issued by your instructor soon.
          </p>
          <Button variant="outline" className="w-full" disabled>
            Certificate pending
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
))}

          {inProgressCourses.map((course: any, i: number) => (
            <motion.div
              key={course.courseId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (certs.length + i) * 0.05 }}
            >
              <Card>
                <CardContent className="p-0">
                  <div className="rounded-t-2xl bg-muted/50 p-6">
                    <div className="flex items-center justify-between">
                      <GraduationCap className="h-10 w-10 text-muted-foreground" />
                      <Badge variant="warning">In Progress</Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{course.courseTitle}</h3>
                    <p className="mt-2 text-sm font-medium">{course.percentage}% complete</p>
                  </div>

                  <div className="space-y-3 p-6">
                    <p className="text-sm text-muted-foreground">
                      Complete the course to earn your certificate. You&apos;re {course.percentage}% of the way there!
                    </p>
                    <Button variant="outline" className="w-full" disabled>
                      Complete course to unlock
                    </Button>
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