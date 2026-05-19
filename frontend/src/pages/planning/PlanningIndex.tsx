import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import {
  LayoutGrid, Calendar, List, Plus, Loader2,
  ChevronRight,
} from 'lucide-react'
import type { CropPlan, Task } from '../../types'

type ViewMode = 'kanban' | 'calendar' | 'list'

export default function PlanningIndex() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  // Fetch all plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['planning', 'plans'],
    queryFn: async () => {
      const res = await api.get<CropPlan[]>('/api/planning')
      return res.data
    },
  })

  // Fetch today's tasks
  const { data: tasksData } = useQuery({
    queryKey: ['planning', 'tasks', 'today'],
    queryFn: async () => {
      const res = await api.get<{ tasks: Task[] }>('/api/planning/tasks/today')
      return res.data.tasks || []
    },
  })

  const tasks = tasksData || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'var(--color-text-muted)'
      case 'IN_PROGRESS': return 'var(--color-warning)'
      case 'COMPLETED': return 'var(--color-success)'
      default: return 'var(--color-text-muted)'
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Crop Planning</h1>
          <p className="page-subtitle">Plan and track your farming activities</p>
        </div>
        <Link to="/planning/new" className="btn btn-primary">
          <Plus size={18} />
          New Plan
        </Link>
      </div>

      {/* View Toggle */}
      <div className="tab-list mb-6 w-fit">
        <button
          className={`tab-item ${viewMode === 'kanban' ? 'active' : ''}`}
          onClick={() => setViewMode('kanban')}
        >
          <LayoutGrid size={16} />
          Kanban
        </button>
        <button
          className={`tab-item ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          <Calendar size={16} />
          Calendar
        </button>
        <button
          className={`tab-item ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          <List size={16} />
          List
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['TODO', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <div key={status} className="card">
              <div
                className="p-4 font-semibold"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                {status === 'TODO' ? 'To Do' : status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  ({tasks?.filter(t => t.status === status).length || 0})
                </span>
              </div>
              <div className="p-4 space-y-3">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-lg" />
                  ))
                ) : tasks?.filter(t => t.status === status).length ? (
                  tasks
                    .filter(t => t.status === status)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg"
                        style={{ background: 'var(--color-surface-2)' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background:
                                task.priority === 'HIGH'
                                  ? 'var(--color-danger)'
                                  : task.priority === 'MEDIUM'
                                  ? 'var(--color-warning)'
                                  : 'var(--color-success)',
                            }}
                          />
                          <span className="font-medium text-sm">{task.title}</span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="card p-6">
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>Calendar view coming soon</p>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="table-container" style={{ border: 'none' }}>
            {isLoading ? (
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Farm</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="skeleton w-48 h-4 rounded" /></td>
                      <td><div className="skeleton w-24 h-4 rounded" /></td>
                      <td><div className="skeleton w-20 h-4 rounded" /></td>
                      <td><div className="skeleton w-20 h-4 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : tasks && tasks.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Farm</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background:
                                task.priority === 'HIGH'
                                  ? 'var(--color-danger)'
                                  : task.priority === 'MEDIUM'
                                  ? 'var(--color-warning)'
                                  : 'var(--color-success)',
                            }}
                          />
                          <span className="font-medium">{task.title}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{task.farmId}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            task.status === 'COMPLETED'
                              ? 'badge-success'
                              : task.status === 'IN_PROGRESS'
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                <List size={48} className="mx-auto mb-4 opacity-50" />
                <p>No tasks yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}