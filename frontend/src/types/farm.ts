export interface FarmLocation {
  lat: number
  lng: number
  name: string
}

export interface Farm {
  id: string
  name: string
  location: FarmLocation
  sizeHa: number
  primaryCrop: string
  ownerId: string
  collaborators: Collaborator[]
  createdAt: string
  updatedAt?: string
}

export interface Collaborator {
  id: string
  name: string
  email?: string
  role: string
  avatarUrl?: string
}

export interface CreateFarmInput {
  name: string
  location: FarmLocation
  sizeHa: number
  primaryCrop: string
}