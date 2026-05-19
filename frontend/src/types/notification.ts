export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface NotificationResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
}