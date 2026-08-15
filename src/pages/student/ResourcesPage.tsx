import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Download, File, FileImage, FileText, FileVideo, FolderOpen, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchBar } from '@/components/common/SearchBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/utils/cn'
import api from '@/services/api'
import type { ApiResource } from '@/types'

// ─── Helpers ───────────────────────────────────────────────────────────────

type ResourceType = 'pdf' | 'doc' | 'video' | 'image' | 'other'

function inferType(mimeType: string): ResourceType {
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc'
  if (mimeType.includes('video') || mimeType.includes('mp4') || mimeType.includes('webm')) return 'video'
  if (mimeType.includes('image') || mimeType.includes('png') || mimeType.includes('jpg') || mimeType.includes('jpeg') || mimeType.includes('webp')) return 'image'
  return 'other'
}
function buildDownloadUrl(fileUrl: string, title: string): string {
  // fl_attachment (without an embedded filename) is more reliable for
  // "raw" resource type deliveries than fl_attachment:<name> — the
  // filename can instead be requested via the attachment query param.
  return fileUrl.includes('?')
    ? `${fileUrl}&fl_attachment=true`
    : `${fileUrl}?fl_attachment=true`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const typeIcons: Record<ResourceType, typeof FileText> = {
  pdf: FileText,
  doc: File,
  video: FileVideo,
  image: FileImage,
  other: File,
}

const typeColors: Record<ResourceType, string> = {
  pdf: 'bg-red-500/10 text-red-600',
  doc: 'bg-blue-500/10 text-blue-600',
  video: 'bg-purple-500/10 text-purple-600',
  image: 'bg-amber-500/10 text-amber-600',
  other: 'bg-muted text-muted-foreground',
}

const typeTabs: { value: 'all' | ResourceType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'Docs' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Images' },
]

// ─── Fetch enrolled courses — same pattern as CoursesPage ──────────────────

function useEnrolledCourses() {
  return useQuery({
    queryKey: ['enrolled-courses'],
    queryFn: async () => {
      const res = await api.get('/courses/enrolled')
      return res.data.data.courses as Array<{ id: string; title: string }>
    },
  })
}

// ─── Flatten resources across all enrolled courses ─────────────────────────

interface FlattenedResource {
  id: string
  title: string
  courseId: string
  courseTitle: string
  fileUrl: string
  fileType: string
  type: ResourceType
  size: string
  sizeBytes: number
  downloads: number
  updatedAt: string
}

function useResources() {
  const coursesQuery = useEnrolledCourses()
  const courseIds = coursesQuery.data ?? []

  return useQuery({
    queryKey: ['resources-all', courseIds.map((c) => c.id)],
    queryFn: async () => {
      const results = await Promise.all(
        courseIds.map(async (course) => {
          try {
            const res = await api.get(`/courses/${course.id}/resources`)
            const resources = res.data.data.resources as ApiResource[]
            return resources.map((r) => ({
              id: r.id,
              title: r.title,
              courseId: r.courseId,
              courseTitle: course.title,
              fileUrl: r.fileUrl,
              fileType: r.fileType,
              type: inferType(r.fileType),
              size: formatSize(r.fileSize),
              sizeBytes: r.fileSize,
              downloads: 0, // backend doesn't track downloads yet
              updatedAt: r.createdAt,
            })) as FlattenedResource[]
          } catch {
            return [] as FlattenedResource[]
          }
        })
      )
      // Flatten and sort by newest first
      return results.flat().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    },
    enabled: courseIds.length > 0,
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function ResourcesPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all')

  const resourcesQuery = useResources()
  const resources = resourcesQuery.data ?? []

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || r.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [resources, search, typeFilter])

  const isLoading = resourcesQuery.isLoading
  const isError = resourcesQuery.isError
  const isEmpty = !isLoading && !isError && resources.length === 0
  const noResults = !isLoading && !isError && filtered.length === 0 && resources.length > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Resources" description="Download study materials and course resources">
        <Badge variant="secondary" className="gap-1">
          <FolderOpen className="h-3.5 w-3.5" />
          {isLoading ? '...' : `${resources.length} files`}
        </Badge>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          placeholder="Search resources..."
          value={search}
          onChange={setSearch}
          className="sm:max-w-sm"
        />
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | ResourceType)}>
          <TabsList>
            {typeTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading resources...
        </div>
      )}

      {/* Error state */}
      {isError && (
        <EmptyState
          icon={FolderOpen}
          title="Could not load resources"
          description="Something went wrong. Please try again."
          actionLabel="Retry"
          onAction={() => resourcesQuery.refetch()}
        />
      )}

      {/* Empty — no courses enrolled */}
      {isEmpty && (
        <EmptyState
          icon={FolderOpen}
          title="No resources available"
          description="You don't have any enrolled courses with resources yet."
        />
      )}

      {/* No results for current filters */}
      {noResults && (
        <EmptyState
          icon={FolderOpen}
          title="No resources found"
          description="Try a different search term or filter."
        />
      )}

      {/* Resource grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource, i) => {
            const Icon = typeIcons[resource.type]
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', typeColors[resource.type])}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold line-clamp-2">{resource.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {resource.courseTitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{resource.size}</span>
                      <span>{resource.type.toUpperCase()}</span>
                    </div>

                    <Button
                      variant="outline"
                      className="mt-4 w-full gap-2"
                      asChild
                    >
                      <a href={buildDownloadUrl(resource.fileUrl, resource.title)} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          Download
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Summary card */}
      {!isLoading && !isError && resources.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Resources are organized by {resources.length > 0
                ? new Set(resources.map((r) => r.courseId)).size
                : 0} enrolled courses. New materials are added by your instructors.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}