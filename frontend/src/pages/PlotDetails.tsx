import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Layers3, MapPin, Ruler, Sprout, ThermometerSun, Wind, Droplets, ArrowRight, Plus, Save, X } from 'lucide-react'
import { CROP_TYPES, useFarmStore } from '../components/farm3d/farmStore'

function getSeason(month: number) {
  if ([11, 0, 1].includes(month)) return 'Winter'
  if ([2, 3, 4].includes(month)) return 'Summer'
  if ([5, 6, 7, 8].includes(month)) return 'Monsoon'
  return 'Post-monsoon'
}

export default function PlotDetails() {
  const navigate = useNavigate()
  const { farmName, location, crops, selectedCrop, selectCrop, weather, addCrop } = useFarmStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    cropType: 'rice',
    x: 0,
    z: 0,
    width: 3,
    depth: 3,
    stage: 'seedling' as 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest',
    health: 90,
    plantedDate: new Date().toISOString().slice(0, 10),
    expectedHarvest: '',
    irrigationEnabled: true,
  })

  const activePlot = crops.find((crop) => crop.id === selectedCrop) || crops[0]

  const season = useMemo(() => getSeason(new Date().getMonth()), [])

  const cropOptions = Object.entries(CROP_TYPES)

  const updateForm = (field: keyof typeof form, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const syncHarvestDate = (cropType: string, plantedDate: string) => {
    const crop = CROP_TYPES[cropType] || CROP_TYPES.rice
    const harvest = new Date(plantedDate)
    harvest.setDate(harvest.getDate() + crop.daysToHarvest)
    return harvest.toISOString().slice(0, 10)
  }

  const handleCreatePlot = () => {
    if (!form.name.trim()) {
      setError('Plot name is required')
      return
    }

    if (form.width < 1 || form.depth < 1) {
      setError('Plot size must be at least 1 x 1')
      return
    }

    const plantedDate = form.plantedDate || new Date().toISOString().slice(0, 10)
    const crop = CROP_TYPES[form.cropType] || CROP_TYPES.rice
    const createdId = `plot_${Date.now()}`

    addCrop({
      id: createdId,
      name: form.name.trim(),
      cropType: form.cropType,
      x: form.x,
      z: form.z,
      width: form.width,
      depth: form.depth,
      stage: form.stage,
      health: form.health,
      plantedDate,
      expectedHarvest: form.expectedHarvest || syncHarvestDate(form.cropType, plantedDate),
      irrigationEnabled: form.irrigationEnabled,
      yieldEstimate: Math.round(form.width * form.depth * crop.daysToHarvest),
    })

    setShowCreateForm(false)
    setError('')
    setForm({
      name: '',
      cropType: 'rice',
      x: 0,
      z: 0,
      width: 3,
      depth: 3,
      stage: 'seedling',
      health: 90,
      plantedDate: new Date().toISOString().slice(0, 10),
      expectedHarvest: '',
      irrigationEnabled: true,
    })
    selectCrop(createdId)
  }

  return (
    <div className="page-container">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Plot Details</h1>
          <p className="page-subtitle">3D farm plot summary with health, size, position and weather context</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowCreateForm((value) => !value)}>
            <Plus size={16} />
            Add Plot
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/recommendations')}>
            Crop Recommendations
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/farm')}>
            Open 3D Farm
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="card p-6 mb-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <p className="font-semibold text-lg">Add New Plot</p>
              <p className="text-xs text-muted-foreground">Create a new 3D plot and place it on the farm grid</p>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreateForm(false)}>
              <X size={14} />
            </button>
          </div>

          {error && (
            <div className="alert alert-danger mb-3">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Plot Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="North Field"
              />
            </div>

            <div>
              <label className="label">Crop Type</label>
              <select
                className="input select capitalize"
                value={form.cropType}
                onChange={(e) => {
                  const cropType = e.target.value
                  const plantedDate = form.plantedDate
                  updateForm('cropType', cropType)
                  updateForm('expectedHarvest', syncHarvestDate(cropType, plantedDate))
                }}
              >
                {cropOptions.map(([key, value]) => (
                  <option key={key} value={key}>{value.icon} {value.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">X Position</label>
              <input className="input" type="number" value={form.x} onChange={(e) => updateForm('x', Number(e.target.value))} step="0.5" />
            </div>

            <div>
              <label className="label">Z Position</label>
              <input className="input" type="number" value={form.z} onChange={(e) => updateForm('z', Number(e.target.value))} step="0.5" />
            </div>

            <div>
              <label className="label">Width</label>
              <input className="input" type="number" value={form.width} onChange={(e) => updateForm('width', Number(e.target.value))} min="1" step="0.5" />
            </div>

            <div>
              <label className="label">Depth</label>
              <input className="input" type="number" value={form.depth} onChange={(e) => updateForm('depth', Number(e.target.value))} min="1" step="0.5" />
            </div>

            <div>
              <label className="label">Stage</label>
              <select className="input select capitalize" value={form.stage} onChange={(e) => updateForm('stage', e.target.value as typeof form.stage)}>
                <option value="seedling">Seedling</option>
                <option value="vegetative">Vegetative</option>
                <option value="flowering">Flowering</option>
                <option value="fruiting">Fruiting</option>
                <option value="harvest">Harvest</option>
              </select>
            </div>

            <div>
              <label className="label">Health ({form.health}%)</label>
              <input className="w-full" type="range" value={form.health} min="0" max="100" onChange={(e) => updateForm('health', Number(e.target.value))} />
            </div>

            <div>
              <label className="label">Planted Date</label>
              <input
                className="input"
                type="date"
                value={form.plantedDate}
                onChange={(e) => {
                  const plantedDate = e.target.value
                  updateForm('plantedDate', plantedDate)
                  updateForm('expectedHarvest', syncHarvestDate(form.cropType, plantedDate))
                }}
              />
            </div>

            <div>
              <label className="label">Expected Harvest</label>
              <input className="input" type="date" value={form.expectedHarvest} onChange={(e) => updateForm('expectedHarvest', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <input type="checkbox" checked={form.irrigationEnabled} onChange={(e) => updateForm('irrigationEnabled', e.target.checked)} />
            Smart irrigation enabled
          </label>

          <div className="flex gap-2 pt-4">
            <button type="button" className="btn btn-primary flex-1" onClick={handleCreatePlot}>
              <Save size={15} /> Save Plot
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card p-6 xl:col-span-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Layers3 size={18} className="text-emerald-500" />
            <div>
              <h2 className="section-title">Active Plot</h2>
              <p className="section-subtitle">Select a plot in the 3D farm to view it here</p>
            </div>
          </div>

          {activePlot ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{activePlot.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{CROP_TYPES[activePlot.cropType]?.name || activePlot.cropType}</p>
                  </div>
                  <span className="badge badge-success">{activePlot.health}% health</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-muted-foreground flex items-center gap-2"><Ruler size={14} /> Size</p>
                    <p className="mt-1 font-semibold">{activePlot.width} x {activePlot.depth}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-muted-foreground flex items-center gap-2"><CalendarDays size={14} /> Planted</p>
                    <p className="mt-1 font-semibold">{new Date(activePlot.plantedDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-muted-foreground flex items-center gap-2"><Sprout size={14} /> Stage</p>
                    <p className="mt-1 font-semibold capitalize">{activePlot.stage}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <p className="text-sm text-muted-foreground">Irrigation</p>
                  <p className="font-semibold">{activePlot.irrigationEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>

              <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                <p className="text-sm font-semibold mb-3">Farm context</p>
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground"><Sprout size={14} /> {farmName}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><MapPin size={14} /> {location.name}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><ThermometerSun size={14} /> {season} season</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><Wind size={14} /> {weather ? `${weather.windSpeed.toFixed(1)} km/h wind` : 'Weather syncing...'}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><Droplets size={14} /> {weather ? `${weather.humidity}% humidity` : 'Humidity pending'}</p>
                </div>

                <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <p className="text-sm font-semibold mb-1">Recommended next step</p>
                  <p className="text-sm text-muted-foreground">
                    {activePlot.health > 90
                      ? 'Keep monitoring and plan harvest timing based on weather.'
                      : activePlot.health > 70
                        ? 'Maintain irrigation and nutrient balance.'
                        : 'Inspect soil, water flow and pest pressure before changing crop strategy.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
              <p className="text-lg font-semibold mb-2">No plot selected</p>
              <p className="text-sm text-muted-foreground mb-4">Go to the 3D farm and click any plot to load its details here.</p>
              <button className="btn btn-primary" onClick={() => navigate('/farm')}>
                Open 3D Farm
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="card p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={18} className="text-amber-500" />
            <div>
              <h2 className="section-title">All 3D Plots</h2>
              <p className="section-subtitle">Tap a plot to inspect it</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {crops.map((crop) => (
              <button
                key={crop.id}
                type="button"
                onClick={() => selectCrop(crop.id)}
                className="w-full text-left rounded-2xl border p-4 transition-colors"
                style={{
                  borderColor: crop.id === selectedCrop ? 'rgba(16,185,129,0.45)' : 'var(--color-border)',
                  background: crop.id === selectedCrop ? 'rgba(16,185,129,0.08)' : 'var(--color-surface-2)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{crop.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{CROP_TYPES[crop.cropType]?.name || crop.cropType}</p>
                  </div>
                  <span className="text-xs font-semibold">{crop.health}%</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  X {crop.x} · Z {crop.z} · {crop.width} x {crop.depth} · {crop.stage}
                </p>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
