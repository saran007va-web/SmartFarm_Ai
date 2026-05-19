import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  FileText, Upload, Image, File, Search, Filter,
  Download, Trash2, Loader2, Eye, FileSpreadsheet,
  Presentation, FileAudio, MoreVertical, ChevronRight,
} from 'lucide-react'

interface UploadedFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  mimeType: string
  publicUrl?: string
  createdAt: string
  description?: string
  tags: string[]
}

const getFileIcon = (mimeType: string) => {
  if (mimeType?.includes('image')) return <Image size={20} className="text-purple-500" />
  if (mimeType?.includes('pdf')) return <FileText size={20} className="text-red-500" />
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileSpreadsheet size={20} className="text-green-500" />
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return <Presentation size={20} className="text-orange-500" />
  if (mimeType?.includes('audio')) return <FileAudio size={20} className="text-pink-500" />
  return <File size={20} className="text-gray-500" />
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function Files() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  // Fetch files
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['uploads', selectedType],
    queryFn: async () => {
      const res = await api.get<{ files: UploadedFile[] }>('/api/uploads', {
        params: selectedType ? { type: selectedType } : {},
      })
      return res.data.files || []
    },
  })

  const files = filesData || []

  // Filter files
  const filteredFiles = files.filter(f =>
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<UploadedFile>('/api/uploads/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] })
      setUploading(false)
    },
    onError: () => {
      setUploading(false)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/api/uploads/${fileId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] })
    },
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploading(true)
      uploadMutation.mutate(file)
    }
  }

  const handleDownload = async (file: UploadedFile) => {
    if (file.publicUrl) {
      window.open(file.publicUrl, '_blank')
    }
  }

  const fileTypes = [
    { value: '', label: 'All Files' },
    { value: 'IMAGE', label: 'Images' },
    { value: 'PDF', label: 'Documents' },
    { value: 'SPREADSHEET', label: 'Spreadsheets' },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Files & Uploads</h1>
          <p className="page-subtitle">Manage your farm documents and files</p>
        </div>
        <label className="btn btn-primary cursor-pointer flex items-center gap-2">
          <Upload size={16} />
          Upload File
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {fileTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span>Uploading file...</span>
        </div>
      )}

      {/* Files Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-20 w-full rounded-lg mb-3" />
              <div className="skeleton w-32 h-4 rounded mb-2" />
              <div className="skeleton w-20 h-3 rounded" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="card p-4 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              {/* File Preview */}
              <div className="h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                {getFileIcon(file.mimeType)}
              </div>

              {/* File Info */}
              <h3 className="font-medium text-sm truncate mb-1" title={file.fileName}>
                {file.fileName}
              </h3>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>{formatFileSize(file.fileSize)}</span>
                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Tags */}
              {file.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {file.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file)}
                  className="btn btn-secondary flex-1 text-xs py-1"
                >
                  <Download size={12} />
                  Download
                </button>
                <button
                  onClick={() => deleteMutation.mutate(file.id)}
                  className="btn btn-ghost p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div
            className="flex items-center justify-center mx-auto mb-4 rounded-full"
            style={{ width: 64, height: 64, background: 'var(--color-primary-light)' }}
          >
            <FileText size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            No files yet
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Upload your first file to get started
          </p>
          <label className="btn btn-primary cursor-pointer inline-flex items-center gap-2">
            <Upload size={18} />
            Upload File
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </div>
  )
}