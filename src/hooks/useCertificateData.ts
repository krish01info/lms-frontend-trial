import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export interface StudentCompletion {
  userId: string
  name: string
  completedLessons: number
  totalLessons: number
  percentage: number
}

// INSTRUCTOR/ADMIN — per-student lesson completion % for a course
export function useCourseCompletion(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-completion', courseId],
    queryFn: async () => {
      const res = await api.get(`/progress/course/${courseId}/students`)
      return res.data.data.students as StudentCompletion[]
    },
    enabled: !!courseId,
  })
}

export interface CourseCertificate {
  userId: string
  id: string
  issuedAt: string
}

// INSTRUCTOR/ADMIN — which students in this course already have a certificate
export function useCourseCertificates(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-certificates', courseId],
    queryFn: async () => {
      const res = await api.get(`/certificates/course/${courseId}`)
      return res.data.data.certificates as CourseCertificate[]
    },
    enabled: !!courseId,
  })
}

// INSTRUCTOR/ADMIN — issue a certificate to a student for this course
export function useIssueCertificate(courseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post('/certificates', {
        userId,
        courseId,
        fileUrl: 'https://example.com/sample-certificate.pdf', // placeholder until real PDF generation exists
      })
      return res.data.data.certificate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-certificates', courseId] })
    },
  })
}