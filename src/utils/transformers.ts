// Transforms backend course shape → frontend Course type
export function transformCourse(backendCourse: any) {
  return {
    id: backendCourse.id,
    title: backendCourse.title,
    description: backendCourse.description || '',
    instructor: backendCourse.instructor?.name || 'Unknown Instructor',
    instructorAvatar: backendCourse.instructor?.avatar || 
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    image: backendCourse.thumbnail || 
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop',
    progress: backendCourse.progress || 0,
    modules: backendCourse.lessonCount || 0,
    students: backendCourse.enrollmentCount || 0,
    rating: backendCourse.rating || 0,
    category: backendCourse.category?.name || 'General',
    duration: backendCourse.duration || 'Self-paced',
    status: backendCourse.status === 'PUBLISHED' ? 'active' : 
            backendCourse.status === 'DRAFT' ? 'upcoming' : 'active',
    price: Number(backendCourse.price) || 0,
  }
}

// Transforms backend lesson shape → frontend Lesson shape
export function transformLesson(backendLesson: any) {
  return {
    id: backendLesson.id,
    title: backendLesson.title,
    description: backendLesson.description || '',
    type: backendLesson.type || 'VIDEO',
    duration: backendLesson.duration || null,
    order: backendLesson.order ?? 0,
    isPreview: backendLesson.isPreview ?? false,
    videoUrl: backendLesson.videoUrl || null,
    content: backendLesson.content || null,
  }
}

// Transforms backend assignment shape → frontend Assignment shape
// status/mySubmission now come directly from GET /assignments — no more
// client-side pending/overdue guessing based on dueDate.
export function transformAssignment(raw: any) {
  const submission = raw.mySubmission

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || '',
    course: raw.course?.title ?? 'Unknown course',
    courseId: raw.courseId,
    dueDate: raw.dueDate,
    status: raw.status, // 'pending' | 'submitted' | 'graded' | 'overdue'
    submissionCount: raw.submissionCount ?? 0,
    grade: submission?.grade ?? null,
    feedback: submission?.feedback ?? null,
    submissionFileUrl: submission?.fileUrl ?? null,
    submittedAt: submission?.createdAt ?? null,
  }
}

import type { Resource, ResourceType, ApiResource } from '@/types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function categorizeFileType(mimeType: string): ResourceType {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType === 'text/plain' ||
    mimeType.includes('presentation') ||
    mimeType.includes('sheet')
  ) {
    return 'doc'
  }
  return 'other'
}

// Formats a rupee amount for admin/payment cards. Previously every revenue
// figure was hardcoded as `₹${(amount / 100000).toFixed(1)}L`, which always
// rounds to "₹0.0L" for any amount under ~₹50,000 — exactly the range real
// course fees/test payments fall in. This scales the unit to the amount
// instead of always assuming lakhs.
export function formatINR(amount: number): string {
  const n = Number(amount) || 0
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function transformResource(raw: ApiResource, courseTitle: string): Resource {
  return {
    id: raw.id,
    title: raw.title,
    course: courseTitle,
    courseId: raw.courseId,
    fileUrl: raw.fileUrl,
    fileType: raw.fileType,
    type: categorizeFileType(raw.fileType || ''),
    size: formatFileSize(raw.fileSize || 0),
    sizeBytes: raw.fileSize || 0,
    uploadedBy: raw.uploadedBy?.name ?? 'Unknown',
    createdAt: raw.createdAt,
  }
}