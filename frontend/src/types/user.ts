export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  createdAt: string
  lastLogin?: string
}

export interface AuthResponse {
  user: User
  token: string
}