import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'

import axios from 'axios'
import { Upload, Video, ImagePlus, FileText, X, CheckCircle2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  duration: z.string().optional(),
  price: z.string().optional(),
})

const categories = [
  'Mathematics', 'Science', 'Technology', 'Computer Science',
  'Data Science', 'Web Development', 'Mobile Development', 'AI & Machine Learning',
  'Business', 'Marketing', 'Design', 'Photography',
  'Music', 'Language', 'Health & Fitness', 'Personal Development',
  'Engineering', 'Finance', 'Law', 'Other',
]

export function CreateCoursePage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [resourceFiles, setResourceFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadStage, setUploadStage] = useState('')

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setVideoFile(e.target.files[0])
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setThumbnailFile(e.target.files[0])
      setThumbnailPreview(URL.createObjectURL(e.target.files[0]))
    }
  }

  const handleResourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setResourceFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeResource = (index: number) => {
    setResourceFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadToCloudinary = async (file: File, type: 'video' | 'image' | 'raw') => {
    const { data: signRes } = await api.get('/uploads/sign-cloudinary')
    const { signature, timestamp, cloudName, apiKey, folder } = signRes.data

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('folder', folder)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`
    const { data: uploadRes } = await axios.post(uploadUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percent)
        }
      }
    })
    return uploadRes.secure_url
  }

  const onSubmit = async (values: any) => {
    setIsSubmitting(true)
    let videoUrl = null
    let thumbnailUrl = null

    try {
      // Upload thumbnail if selected
      if (thumbnailFile) {
        setUploadStage('Uploading thumbnail...')
        setUploadProgress(0)
        thumbnailUrl = await uploadToCloudinary(thumbnailFile, 'image')
      }

      // Upload video if selected
      if (videoFile) {
        setUploadStage('Uploading intro video...')
        setUploadProgress(0)
        videoUrl = await uploadToCloudinary(videoFile, 'video')
      }

      // Save course in database
      setUploadStage('Creating course...')
      setUploadProgress(null)

      await api.post('/courses', {
        title: values.title,
        description: values.description,
        price: values.price ? parseFloat(values.price) : 0,
        status: 'PUBLISHED',
        videoUrl,
      })

      toast.success('Course created successfully!')
      navigate('/teacher/courses')
    } catch (err: any) {
      console.error('Create course error:', err)
      toast.error(err.response?.data?.message || err.message || 'Failed to create course.')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
      setUploadStage('')
    }
  }

  return (
    <PageShell title="Create Course" description="Design and publish a new course for your students">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: Basic Info ── */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Course Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input id="title" placeholder="e.g. Introduction to Machine Learning" {...register('title')} className="text-base" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" rows={4} placeholder="Describe what students will learn, prerequisites, and course outline..." {...register('description')} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message as string}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select onValueChange={(v) => setValue('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input id="duration" placeholder="e.g. 12 weeks" {...register('duration')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input id="price" type="number" placeholder="0 for free" {...register('price')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Media Uploads ── */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Media & Resources
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label>Course Thumbnail</Label>
                <label
                  htmlFor="thumbnailUpload"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Preview" className="h-28 w-full rounded-xl object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="h-10 w-10 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">Click to upload cover image</span>
                      <span className="text-xs text-muted-foreground/60">JPG, PNG, WEBP — max 5 MB</span>
                    </>
                  )}
                  <input id="thumbnailUpload" type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                </label>
              </div>

              {/* Video Upload */}
              <div className="space-y-2">
                <Label>Intro Video</Label>
                <label
                  htmlFor="videoUpload"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                >
                  {videoFile ? (
                    <div className="text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-1" />
                      <span className="text-sm font-medium">{videoFile.name}</span>
                      <span className="block text-xs text-muted-foreground">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <>
                      <Video className="h-10 w-10 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">Click to upload intro video</span>
                      <span className="text-xs text-muted-foreground/60">MP4, MOV, MKV, WEBM — max 100 MB</span>
                    </>
                  )}
                  <input id="videoUpload" type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                </label>
              </div>
            </div>

            {/* Resource Uploads */}
            <div className="mt-6 space-y-2">
              <Label>Course Resources (PDFs, Documents, Images)</Label>
              <label
                htmlFor="resourceUpload"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <Upload className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">Click to attach resource files</span>
                <input id="resourceUpload" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg" multiple className="hidden" onChange={handleResourceChange} />
              </label>
              {resourceFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {resourceFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2">
                      <span className="text-sm truncate">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      <button type="button" onClick={() => removeResource(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Upload Progress ── */}
        {uploadProgress !== null && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{uploadStage}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Submit ── */}
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[180px]">
            {isSubmitting ? uploadStage || 'Creating...' : '🚀 Publish Course'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/teacher/courses')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}

export function TeacherCoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await api.get('/courses/my')
        setCourses(data.data.courses || [])
      } catch {
        toast.error('Failed to load courses.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCourses()
  }, [])

  if (isLoading) {
    return (
      <PageShell title="Manage Courses" description="Loading courses...">
        <div className="text-center py-8 text-muted-foreground">Loading your courses...</div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Manage Courses" description="View and manage your courses" searchable searchPlaceholder="Search courses...">
      <div className="grid gap-4">
        {courses.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-2xl text-muted-foreground">
            You haven't created any courses yet.
          </div>
        ) : (
          courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-lg">{course.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {course.description || 'No description provided.'}
                  </p>
                  <p className="text-xs text-primary mt-1 font-medium">
                    {course.enrollmentCount || 0} students enrolled · {course.lessonCount || 0} modules
                  </p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  )
}

export function TeacherAssignmentsPage() {
  return (
    <PageShell title="Assignments" description="Create and manage assignments" actions={<Button>Create Assignment</Button>}>
      <div className="space-y-3">
        {['Calculus Problem Set #6', 'Python Project Phase 2', 'Literature Review'].map((title, i) => (
          <Card key={i}><CardContent className="flex items-center justify-between p-5">
            <div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{[23, 45, 12][i]} submissions pending</p></div>
            <Button variant="outline" size="sm">Grade</Button>
          </CardContent></Card>
        ))}
      </div>
    </PageShell>
  )
}

export function QuizBuilderPage() {
  return (
    <PageShell title="Quiz Builder" description="Create interactive quizzes" actions={<Button>Create Quiz</Button>}>
      <Card><CardContent className="p-6 space-y-4">
        <div className="space-y-2"><Label>Quiz Title</Label><Input placeholder="Chapter 7 Quiz" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" defaultValue={30} /></div>
          <div className="space-y-2"><Label>Total Questions</Label><Input type="number" defaultValue={20} /></div>
        </div>
        <div className="space-y-2"><Label>Question 1</Label><Input placeholder="Enter question text" /></div>
        {['A', 'B', 'C', 'D'].map((opt) => (
          <div key={opt} className="space-y-2"><Label>Option {opt}</Label><Input placeholder={`Option ${opt}`} /></div>
        ))}
        <Button>Add Question</Button>
      </CardContent></Card>
    </PageShell>
  )
}

export function TeacherAttendancePage() {
  return (
    <PageShell title="Attendance" description="Mark and manage student attendance">
      <Card><CardContent className="p-0">
        <table className="w-full">
          <thead><tr className="border-b"><th className="p-4 text-left text-sm font-medium">Student</th><th className="p-4 text-left text-sm font-medium">Status</th><th className="p-4 text-left text-sm font-medium">Action</th></tr></thead>
          <tbody>
            {['Alex Johnson', 'Emma Davis', 'James Wilson', 'Sarah Kim'].map((name) => (
              <tr key={name} className="border-b"><td className="p-4 text-sm">{name}</td><td className="p-4"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600">Present</span></td>
                <td className="p-4"><Button variant="ghost" size="sm">Edit</Button></td></tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </PageShell>
  )
}

export function GradebookPage() {
  return (
    <PageShell title="Gradebook" description="View and manage student grades">
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead><tr className="border-b bg-muted/50">
            {['Student', 'Assignment 1', 'Assignment 2', 'Quiz 1', 'Average'].map((h) => (
              <th key={h} className="p-4 text-left text-sm font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[{ name: 'Alex Johnson', grades: [92, 88, 95, 91.7] }, { name: 'Emma Davis', grades: [85, 90, 82, 85.7] }].map((s) => (
              <tr key={s.name} className="border-b">
                <td className="p-4 text-sm font-medium">{s.name}</td>
                {s.grades.map((g, i) => (<td key={i} className="p-4 text-sm">{typeof g === 'number' ? (i === 3 ? <span className="font-bold text-primary">{g}%</span> : g) : g}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </PageShell>
  )
}

export function AnnouncementsPage() {
  return (
    <PageShell title="Announcements" description="Post announcements to your classes" actions={<Button>New Announcement</Button>}>
      <div className="space-y-3">
        {[{ title: 'Mid-term Exam Schedule', date: 'Jun 25', course: 'All Courses' }, { title: 'Lab Session Moved', date: 'Jun 24', course: 'Physics' }].map((a) => (
          <Card key={a.title}><CardContent className="p-5">
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-muted-foreground">{a.course} · {a.date}</p>
          </CardContent></Card>
        ))}
      </div>
    </PageShell>
  )
}

export function PerformancePage() {
  return (
    <PageShell title="Student Performance" description="Analyze student performance metrics">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Class Average</p><p className="text-3xl font-bold">87%</p></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Top Performer</p><p className="text-xl font-bold">Alex Johnson</p></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">At Risk</p><p className="text-3xl font-bold text-amber-600">3</p></CardContent></Card>
      </div>
    </PageShell>
  )
}

export { MessagesPage as TeacherMessagesPage } from '@/pages/student/MessagesPage'

export function TeacherAnalyticsPage() {
  return (
    <PageShell title="Analytics" description="Detailed teaching analytics">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground mb-2">Course Completion Rate</p><p className="text-4xl font-bold text-primary">78%</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground mb-2">Avg. Assignment Score</p><p className="text-4xl font-bold text-emerald-600">84%</p></CardContent></Card>
      </div>
    </PageShell>
  )
}

export function TeacherResourcesPage() {
  return (
    <PageShell title="Resources" description="Manage course resources" actions={<Button>Upload Resource</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {['Lecture Slides Ch.7', 'Practice Problems', 'Video Recording'].map((r) => (
          <Card key={r}><CardContent className="p-5 flex justify-between items-center"><span className="font-medium">{r}</span><Button variant="ghost" size="sm">Edit</Button></CardContent></Card>
        ))}
      </div>
    </PageShell>
  )
}

export { ProfilePage as TeacherProfilePage } from '@/pages/student/ProfilePage'
