import { useMemo, useState, useEffect } from 'react'
import { CROP_LIST, getTasksForDay } from '../lib/cropDatabase'
import { useFarmStore } from '../components/farm3d/farmStore'
import { format } from 'date-fns'

function daysBetween(start: string, end: Date = new Date()) {
  try {
    const s = new Date(start)
    const diff = Math.ceil((+end - +s) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff)
  } catch (e) {
    return 1
  }
}

export default function CropCalendar() {
  const { selectedCrop, crops } = useFarmStore()

  const defaultCrop = CROP_LIST[0]?.key || 'tomato'
  const [cropKey, setCropKey] = useState<string>(defaultCrop)
  const [dayNumber, setDayNumber] = useState<number>(1)
  const [weatherCond, setWeatherCond] = useState<string | null>(null)
  const [followSelected, setFollowSelected] = useState<boolean>(true)

  useEffect(() => {
    if (followSelected && selectedCrop) {
      const plot = crops.find((p) => p.id === selectedCrop)
      if (plot) {
        setCropKey(plot.cropType)
        const days = daysBetween(plot.plantedDate)
        setDayNumber(days)
      }
    }
  }, [selectedCrop, followSelected, crops])

  const { stage, tasks, adaptation } = useMemo(() => getTasksForDay(cropKey, dayNumber, weatherCond), [cropKey, dayNumber, weatherCond])

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Crop Calendar</h1>
          <p className="page-subtitle">Daily tasks and stage guidance for selected crop</p>
        </div>
      </div>

      <div className="card p-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="label">Crop</label>
            <select className="input" value={cropKey} onChange={(e) => { setCropKey(e.target.value); setDayNumber(1); setFollowSelected(false) }}>
              {CROP_LIST.map((c: any) => (
                <option key={c.key} value={c.key}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Day</label>
            <input className="input" type="number" min={1} value={dayNumber} onChange={(e) => { setDayNumber(Math.max(1, Number(e.target.value) || 1)); setFollowSelected(false) }} />
          </div>

          <div>
            <label className="label">Weather</label>
            <select className="input" value={weatherCond ?? ''} onChange={(e) => setWeatherCond(e.target.value || null)}>
              <option value="">None</option>
              <option value="hotDay">Hot day</option>
              <option value="coldNight">Cold night</option>
              <option value="rain">Rain</option>
              <option value="drought">Drought</option>
            </select>
          </div>

          <div>
            <label className="label">Follow Selected Plot</label>
            <div className="flex items-center gap-2"><input type="checkbox" checked={followSelected} onChange={(e) => setFollowSelected(e.target.checked)} /> <span className="text-sm text-muted-foreground">Auto-update when a plot is selected in Farm</span></div>
          </div>

          <div>
            <label className="label">Quick</label>
            <div className="text-sm text-muted-foreground">Stage info and tasks update as you change day</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="section-title">Stage</h2>
          {stage ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 44, height: 44, borderRadius: 8, background: stage.color }} className="flex items-center justify-center">{stage.icon}</div>
                <div>
                  <div className="font-semibold">{stage.name}</div>
                  <div className="text-sm text-muted-foreground">{stage.description}</div>
                  <div className="text-xs text-muted-foreground">Day {stage.startDay} — {stage.endDay}</div>
                </div>
              </div>

              <h3 className="font-semibold mt-4 mb-2">Tasks ({tasks.length})</h3>
              <ul className="space-y-2">
                {tasks.map((t: any, idx: number) => (
                  <li key={idx} className="rounded p-3" style={{ border: '1px solid var(--color-border)' }}>
                    <div className="flex justify-between">
                      <div className="font-medium">{t.task}</div>
                      <div className="text-xs text-muted-foreground">{t.time ?? ''} • {t.frequency}</div>
                    </div>
                  </li>
                ))}
                {tasks.length === 0 && <li className="text-sm text-muted-foreground">No scheduled tasks for this day.</li>}
              </ul>

              {adaptation && (
                <div className="mt-4 alert alert-info">
                  <div className="font-semibold">Climate adaptation</div>
                  <div className="text-sm">{adaptation}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No stage information for this day.</div>
          )}
        </div>

        <div className="card p-6" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="section-title">Crop Summary</h3>
          <div className="mt-2">
            <div className="font-semibold">{CROP_LIST.find((c: any) => c.key === cropKey)?.name}</div>
            <div className="text-sm text-muted-foreground">Total days: {CROP_LIST.find((c: any) => c.key === cropKey)?.totalDays}</div>
            <div className="mt-3 text-xs text-muted-foreground">Tip: change day to preview tasks across the crop lifecycle.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
