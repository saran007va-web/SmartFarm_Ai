import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  Plus, MapPin, Sprout, Loader2, ChevronRight,
  Search, MoreVertical, Pencil, Trash2,
} from 'lucide-react'
import type { Farm, CreateFarmInput } from '../types'

interface FarmsResponse {
  farms: Farm[]
  total: number
  page: number
  limit: number
}

function FarmCard({ farm, onClick }: { farm: Farm; onClick: () => void }) {
  const cropColors: Record<string, string> = {
    Rice: '#87CEEB',
    Wheat: '#DAA520',
    Corn: '#FFD700',
    Cotton: '#F5DEB3',
    Sugarcane: '#32CD32',
    Vegetables: '#228B22',
  }

  return (
    <div
      className="card card-flat overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Farm image/color block */}
      <div
        className="h-32 flex items-center justify-center"
        style={{ background: cropColors[farm.primaryCrop] || '#a8dba8' }}
      >
        <Sprout size={40} style={{ color: 'white', opacity: 0.8 }} />
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
          {farm.name}
        </h3>
        <div className="flex items-center gap-1 text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
          <MapPin size={14} />
          {farm.location.name}
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{farm.sizeHa} ha</span>
          <span className="badge badge-primary">{farm.primaryCrop}</span>
        </div>
      </div>
    </div>
  )
}

function CreateFarmModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<CreateFarmInput>({
    name: '',
    location: { lat: 0, lng: 0, name: '' },
    sizeHa: 0,
    primaryCrop: '',
  })
  const [locationSearch, setLocationSearch] = useState('')
  const [showLocationResults, setShowLocationResults] = useState(false)

  const createFarm = useMutation({
    mutationFn: async (data: CreateFarmInput) => {
      const res = await api.post<Farm>('/api/farms', data)
      return res.data
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  // Search locations
  const { data: locations } = useQuery({
    queryKey: ['weather', 'locations', locationSearch],
    queryFn: async () => {
      const res = await api.get<{ name: string; lat: number; lng: number; country?: string }[]>('/api/weather/locations', {
        params: { q: locationSearch },
      })
      return res.data
    },
    enabled: locationSearch.length >= 2,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createFarm.mutate(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-md card p-6"
        style={{ maxHeight: '90vh', overflow: 'auto' }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
          Create New Farm
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Farm Name *</label>
            <input
              type="text"
              className="input"
              placeholder="My Farm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Location *</label>
            <div className="relative">
              <input
                type="text"
                className="input"
                placeholder="Search location..."
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value)
                  setShowLocationResults(true)
                }}
                onFocus={() => setShowLocationResults(true)}
              />
              {showLocationResults && locations && locations.length > 0 && (
                <div className="dropdown-menu w-full mt-1 max-h-48 overflow-auto">
                  {locations.map((loc, i) => (
                    <button
                      key={i}
                      type="button"
                      className="dropdown-item w-full text-left"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          location: { lat: loc.lat, lng: loc.lng, name: loc.name },
                        })
                        setLocationSearch(loc.name)
                        setShowLocationResults(false)
                      }}
                    >
                      {loc.name} {loc.country && `(${loc.country})`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Size (hectares) *</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              min="0"
              step="0.1"
              value={formData.sizeHa || ''}
              onChange={(e) => setFormData({ ...formData, sizeHa: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <label className="label">Primary Crop *</label>
            <select
              className="input select"
              value={formData.primaryCrop}
              onChange={(e) => setFormData({ ...formData, primaryCrop: e.target.value })}
              required
            >
              <option value="">Select crop</option>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Corn">Corn</option>
              <option value="Cotton">Cotton</option>
              <option value="Sugarcane">Sugarcane</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={createFarm.isPending}>
              {createFarm.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Farm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Farms() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: farmsData, isLoading } = useQuery({
    queryKey: ['farms', 1, 12],
    queryFn: async () => {
      const res = await api.get<FarmsResponse>('/api/farms', {
        params: { page: 1, limit: 12 },
      })
      return res.data
    },
  })

  const farms = farmsData?.farms || []

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">My Farms</h1>
          <p className="page-subtitle">Manage your farm properties</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          Create Farm
        </button>
      </div>

      {/* Farm Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton h-32" />
              <div className="p-4 space-y-3">
                <div className="skeleton w-32 h-6 rounded" />
                <div className="skeleton w-24 h-4 rounded" />
                <div className="skeleton w-20 h-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : farms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onClick={() => navigate(`/farms/${farm.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div
            className="flex items-center justify-center mx-auto mb-4 rounded-full"
            style={{ width: 64, height: 64, background: 'var(--color-primary-light)' }}
          >
            <Sprout size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            No farms yet
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Create your first farm to start planning crops and tracking your harvest.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Create Farm
          </button>
        </div>
      )}

      {/* Create Farm Modal */}
      <CreateFarmModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['farms'] })}
      />
    </div>
  )
}