import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import ArrayField from './ArrayField'

const emptyDay = () => ({ title: '', description: '', activities: [] })

export default function DayBuilder({ days = [], onChange, errors = {} }) {
  const addDay = () => onChange([...days, emptyDay()])

  const removeDay = (i) => onChange(days.filter((_, idx) => idx !== i))

  const moveDay = (i, dir) => {
    const arr = [...days]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange(arr)
  }

  const updateDay = (i, field, val) => {
    const arr = [...days]
    arr[i] = { ...arr[i], [field]: val }
    onChange(arr)
  }

  return (
    <div>
      {days.map((day, i) => (
        <div key={i} className="card" style={{ marginBottom: 12, overflow: 'visible' }}>
          {/* Day header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
            borderRadius: '12px 12px 0 0',
          }}>
            <GripVertical size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--purple-light)', fontWeight: 500, minWidth: 48 }}>
              DAY {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                className="field"
                value={day.title}
                onChange={e => updateDay(i, 'title', e.target.value)}
                placeholder="Day title (e.g. Into the Clouds)"
                style={{ width: '100%', background: 'transparent', border: errors[`day_${i}_title`] ? '1px solid var(--red)' : 'none', padding: '0', fontSize: 14, fontWeight: 500 }}
              />
              {errors[`day_${i}_title`] && (
                <span style={{ fontSize: 11, color: 'var(--red)' }}>{errors[`day_${i}_title`]}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveDay(i, -1)} disabled={i === 0}>
                <ChevronUp size={12} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveDay(i, 1)} disabled={i === days.length - 1}>
                <ChevronDown size={12} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDay(i)}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Day body */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Description
              </label>
              <textarea
                className="field"
                value={day.description}
                onChange={e => updateDay(i, 'description', e.target.value)}
                placeholder="Describe what happens this day…"
                rows={3}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Activities
              </label>
              <ArrayField
                values={day.activities}
                onChange={val => updateDay(i, 'activities', val)}
                placeholder="Add activity (e.g. Airport pickup)"
              />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost" onClick={addDay} style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}>
        <Plus size={14} /> Add Day
      </button>
    </div>
  )
}
