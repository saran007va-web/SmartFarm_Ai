export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Task {
  id: string
  farmId: string
  planId?: string
  title: string
  description?: string
  dueDate: string
  assignedTo?: Assignee
  status: TaskStatus
  priority: Priority
  attachments?: string[]
  createdAt: string
}

export interface Assignee {
  id: string
  name: string
  avatarUrl?: string
}

export interface CropPlan {
  id: string
  farmId: string
  crop: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED'
  fields?: string[]
  inputs?: CropInput[]
  notes?: string
  estimatedYield?: number
  tasks: Task[]
  createdAt: string
  updatedAt?: string
}

export interface CropInput {
  name: string
  quantity: number
  unit: string
}

export interface CreateTaskInput {
  farmId: string
  planId?: string
  title: string
  description?: string
  dueDate: string
  assignedTo?: string
  status?: TaskStatus
  priority?: Priority
}

export interface CreatePlanInput {
  farmId: string
  crop: string
  startDate: string
  endDate: string
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED'
  fields?: string[]
  inputs?: CropInput[]
  notes?: string
  estimatedYield?: number
}