import { useRef, useState, useEffect } from 'react'
import { Line, LineChart, BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { FileUp, FileSearch, FileText, SearchX, Upload, Database, BookOpen, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Leaf, Zap, Calendar, Download, Eye, Trash2, X, Code } from 'lucide-react'

import TopBar from '../components/TopBar'
import EmptyState from '../components/EmptyState'
import { getRagStats, queryDocuments, uploadDocument, getDocuments, downloadDocument, getDocumentContent, deleteDocument } from '../services/api'
import { getWeeklyYields } from '../services/api'

const CROP_COLORS = {
  'rice': '#10b981',
  'wheat': '#3b82f6',
  'maize': '#f59e0b',
  'sugarcane': '#ef4444',
  'cotton': '#8b5cf6',
  'pulses': '#ec4899',
  'corn': '#f59e0b',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface-dark)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: '0.8125rem', color: 'white', boxShadow: 'var(--shadow-xl)' }}>
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{Number(p.value).toLocaleString()} kg/ha</strong></p>)}
    </div>
  )
}

export default function Analytics() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [question, setQuestion] = useState('')
  const [querying, setQuerying] = useState(false)
  const [answer, setAnswer] = useState(null)
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [weeklyData, setWeeklyData] = useState(null)
  const [loadingYields, setLoadingYields] = useState(false)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [docContent, setDocContent] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const fileRef = useRef(null)

  // Load documents
  const loadDocuments = async () => {
    setLoadingDocs(true)
    try {
      const resp = await getDocuments()
      setDocuments(resp.data.documents || [])
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoadingDocs(false)
    }
  }

  // Load weekly yield data
  const loadWeeklyYields = async () => {
    setLoadingYields(true)
    try {
      const resp = await getWeeklyYields()
      setWeeklyData(resp.data)
      } catch (err) {
        console.error('Failed to load weekly yields:', err)
    } finally {
      setLoadingYields(false)
    }
  }

  useEffect(() => {
    loadWeeklyYields()
    loadDocuments()
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const resp = await uploadDocument(formData)
      setUploadResult(resp.data)
      const statsResp = await getRagStats()
      setStats(statsResp.data)
      setFile(null)
      await loadDocuments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally { setUploading(false) }
  }

  const handleViewDocument = async (doc) => {
    setViewingDoc(doc)
    try {
      const resp = await getDocumentContent(doc.id)
      setDocContent(resp.data.content)
    } catch (err) {
      setError(`Failed to load document: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await downloadDocument(doc.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(`Download failed: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return
    setDeletingId(docId)
    try {
      await deleteDocument(docId)
      await loadDocuments()
    } catch (err) {
      setError(`Failed to delete: ${err.response?.data?.detail || err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleQuery = async () => {
    if (!question.trim()) return
    setQuerying(true); setError('')
    try {
      const resp = await queryDocuments(question)
      setAnswer(resp.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Query failed. Please try again.')
    } finally { setQuerying(false) }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getChangeColor = (percent) => {
    if (percent > 0) return '#10b981' // green
    if (percent < 0) return '#ef4444' // red
    return '#6b7280' // gray
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <TopBar
        title="Analytics"
        subtitle="Weekly yields, crop performance, and document insights"
      />

      <div className="page-container">
        {/* ── Weekly Yields Section ──────────────────────── */}
        {weeklyData && !loadingYields && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="card" style={{ padding: '20px', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Current Week Records</p>
                    <p className="text-3xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{weeklyData.total_records_current}</p>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {weeklyData.crops?.length || 0} crops tracked
                    </p>
                  </div>
                  <Calendar size={24} style={{ color: 'var(--color-primary)', opacity: 0.3 }} />
                </div>
              </div>

              <div className="card" style={{ padding: '20px', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Previous Week Records</p>
                    <p className="text-3xl font-extrabold" style={{ color: '#8b5cf6' }}>{weeklyData.total_records_previous}</p>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      Week of {formatDate(weeklyData.previous_week)}
                    </p>
                  </div>
                  <Calendar size={24} style={{ color: '#8b5cf6', opacity: 0.3 }} />
                </div>
              </div>

              <div className="card" style={{ padding: '20px', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Avg Yield This Week</p>
                    <p className="text-3xl font-extrabold" style={{ color: '#f59e0b' }}>
                      {weeklyData.crops && weeklyData.crops.length > 0 
                        ? (weeklyData.crops.reduce((sum, c) => sum + c.current_week.average, 0) / weeklyData.crops.length).toFixed(1)
                        : '0'
                      }
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>kg/ha</p>
                  </div>
                  <Zap size={24} style={{ color: '#f59e0b', opacity: 0.3 }} />
                </div>
              </div>
            </div>

            {/* Crop-wise Detailed Cards */}
            {weeklyData.crops && weeklyData.crops.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {weeklyData.crops.map((cropData) => (
                  <div key={cropData.crop} className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: `${CROP_COLORS[cropData.crop.toLowerCase()] || '#6b7280'}20` }}
                        >
                          <Leaf size={20} style={{ color: CROP_COLORS[cropData.crop.toLowerCase()] || '#6b7280' }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold capitalize" style={{ color: 'var(--color-text)' }}>
                            {cropData.crop}
                          </h3>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {cropData.current_week.count} records
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-3 py-1 rounded-lg"
                        style={{ background: `${getChangeColor(cropData.change_percent)}20` }}
                      >
                        {cropData.change_percent > 0 ? (
                          <TrendingUp size={16} style={{ color: getChangeColor(cropData.change_percent) }} />
                        ) : (
                          <TrendingDown size={16} style={{ color: getChangeColor(cropData.change_percent) }} />
                        )}
                        <span style={{ color: getChangeColor(cropData.change_percent), fontSize: '0.875rem', fontWeight: 600 }}>
                          {cropData.change_percent > 0 ? '+' : ''}{cropData.change_percent}%
                        </span>
                      </div>
                    </div>

                    {/* Current Week Metrics */}
                    <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>This Week Performance</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="p-3 rounded-lg"
                          style={{ background: 'var(--color-surface-2)' }}
                        >
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Average Yield</p>
                          <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                            {cropData.current_week.average}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>kg/ha</p>
                        </div>
                        <div
                          className="p-3 rounded-lg"
                          style={{ background: 'var(--color-surface-2)' }}
                        >
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Yield</p>
                          <p className="text-xl font-bold mt-1" style={{ color: '#3b82f6' }}>
                            {cropData.current_week.total}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>kg</p>
                        </div>
                        <div
                          className="p-3 rounded-lg"
                          style={{ background: 'var(--color-surface-2)' }}
                        >
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Min Yield</p>
                          <p className="text-xl font-bold mt-1" style={{ color: '#ef4444' }}>
                            {cropData.current_week.min}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>kg/ha</p>
                        </div>
                        <div
                          className="p-3 rounded-lg"
                          style={{ background: 'var(--color-surface-2)' }}
                        >
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Max Yield</p>
                          <p className="text-xl font-bold mt-1" style={{ color: '#10b981' }}>
                            {cropData.current_week.max}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>kg/ha</p>
                        </div>
                      </div>
                    </div>

                    {/* Comparison with Previous Week */}
                    <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>vs Previous Week</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            This week: <strong>{cropData.current_week.average} kg/ha</strong>
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Last week: <strong>{cropData.previous_week.average} kg/ha</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Farm Details */}
                    {cropData.farms && cropData.farms.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Farms Growing This Crop</p>
                        <div className="flex flex-wrap gap-2">
                          {cropData.farms.map((farm, idx) => (
                            <span
                              key={idx}
                              className="badge"
                              style={{
                                background: `${CROP_COLORS[cropData.crop.toLowerCase()] || '#6b7280'}20`,
                                color: CROP_COLORS[cropData.crop.toLowerCase()] || '#6b7280',
                                fontSize: '0.75rem',
                                padding: '6px 10px'
                              }}
                            >
                              {farm}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card mb-8" style={{ padding: '48px 24px', borderColor: 'var(--color-border)', textAlign: 'center' }}>
                <Leaf size={48} style={{ margin: '0 auto', color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 16 }} />
                <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No Yield Records Yet</p>
                <p style={{ color: 'var(--color-text-muted)' }}>Start logging yield records to see your farm's performance analytics.</p>
              </div>
            )}
          </>
        )}

        {loadingYields && (
          <div className="card mb-8" style={{ padding: '48px 24px', borderColor: 'var(--color-border)', textAlign: 'center' }}>
            <div className="spinner mx-auto mb-4"></div>
            <p style={{ color: 'var(--color-text-muted)' }}>Loading yield analytics...</p>
          </div>
        )}

        {/* Documents Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* ── Left: Upload + Stats ────────────────────── */}
          <div className="space-y-6">
            {/* Upload Card */}
            <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(16,185,129,0.1)' }}>
                  <Upload size={17} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="section-title">Upload Document</h2>
                  <p className="section-subtitle">Add farming guides to your knowledge base</p>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger mb-4 animate-fade-up">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) setFile(f)
                }}
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                style={{ padding: '32px 24px', marginBottom: 16 }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--color-surface-3)' }}
                >
                  <FileUp size={22} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.75} />
                </div>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
                  {file ? file.name : 'Drag a file here, or click to select'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  PDF, TXT or MD — max 10 MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              {file && (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl mb-4 animate-fade-in"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <FileText size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="btn btn-ghost btn-icon btn-sm">
                    ×
                  </button>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn btn-primary w-full"
              >
                {uploading ? (
                  <><span className="spinner spinner-sm" />Indexing...</>
                ) : (
                  <><Upload size={16} /> Upload and Index</>
                )}
              </button>

              {uploadResult && (
                <div className="alert alert-success mt-4 animate-fade-up">
                  <CheckCircle2 size={16} />
                  <span>
                    Indexed <strong>{uploadResult.filename}</strong> — {uploadResult.chunks_indexed} chunks created
                  </span>
                </div>
              )}
            </div>

            {/* Uploaded Documents List */}
            <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(59,130,246,0.1)' }}>
                  <FileText size={17} style={{ color: '#3b82f6' }} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="section-title">Uploaded Documents</h2>
                  <p className="section-subtitle">{documents.length} file{documents.length !== 1 ? 's' : ''} stored</p>
                </div>
              </div>

              {loadingDocs ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div className="spinner mx-auto mb-2"></div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading documents...</p>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {doc.file_type === '.pdf' ? (
                          <FileText size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                        ) : doc.file_type === '.md' ? (
                          <Code size={18} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                        ) : (
                          <FileText size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                            {doc.filename}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {(doc.file_size / 1024).toFixed(1)} KB • {doc.chunk_count} chunks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingId === doc.id}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete"
                        >
                          {deletingId === doc.id ? (
                            <span className="spinner spinner-xs"></span>
                          ) : (
                            <Trash2 size={16} style={{ color: '#ef4444' }} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <FileText size={32} style={{ margin: '0 auto', color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    No documents uploaded yet
                  </p>
                </div>
              )}
            </div>

            {/* RAG Stats */}
            {stats && (
              <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(168,85,247,0.1)' }}>
                    <Database size={17} style={{ color: '#a855f7' }} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="section-title">Knowledge Base</h2>
                    <p className="section-subtitle">{stats.total_documents} documents · {stats.total_chunks} chunks</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{stats.total_documents}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-text-muted)' }}>Documents</p>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <p className="text-2xl font-extrabold" style={{ color: '#3b82f6' }}>{stats.total_chunks}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-text-muted)' }}>Chunks</p>
                  </div>
                </div>

                {stats.sources?.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {stats.sources.map((source) => (
                      <div
                        key={source}
                        className="flex items-center gap-2 p-2.5 rounded-xl text-sm"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        <FileText size={13} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                        <span className="truncate">{source}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Query ──────────────────────────────── */}
          <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(14,165,233,0.1)' }}>
                <FileSearch size={17} style={{ color: '#0ea5e9' }} strokeWidth={2} />
              </div>
              <div>
                <h2 className="section-title">Query Documents</h2>
                <p className="section-subtitle">Ask questions grounded in your uploaded files</p>
              </div>
            </div>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the best time to plant wheat? Refer to uploaded guides..."
              rows={4}
              className="input mb-3"
              style={{ resize: 'vertical', minHeight: 100 }}
            />
            <button
              onClick={handleQuery}
              disabled={!question.trim() || querying}
              className="btn btn-primary w-full"
            >
              {querying ? (
                <><span className="spinner spinner-sm" />Searching...</>
              ) : (
                <><FileSearch size={16} /> Ask Question</>
              )}
            </button>

            {answer && (
              <div className="mt-6 space-y-4 animate-fade-up">
                <div
                  className="p-5 rounded-xl"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Answer
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                    {answer.answer}
                  </p>
                </div>

                {answer.sources?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Sources Used
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {answer.sources.map((source, index) => (
                        <span
                          key={index}
                          className="badge badge-info"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <FileText size={10} />
                          {source.source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!answer && (
              <div className="mt-8">
                <EmptyState
                  icon={SearchX}
                  title="No documents queried yet"
                  description="Upload a document first, then ask questions about its content."
                  className="py-12"
                />
              </div>
            )}
          </div>
        </div>

        {/* Document Viewing Modal */}
        {viewingDoc && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => setViewingDoc(null)}
          >
            <div
              className="card"
              style={{
                padding: '24px',
                borderColor: 'var(--color-border)',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {viewingDoc.filename}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {(viewingDoc.file_size / 1024).toFixed(1)} KB • {viewingDoc.file_type}
                  </p>
                </div>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="btn btn-ghost btn-icon"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {docContent}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadDocument(viewingDoc)}
                  className="btn btn-primary flex-1"
                >
                  <Download size={16} /> Download
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="btn btn-ghost flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
