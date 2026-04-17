import { useState } from 'react'
import { Plus, X } from 'lucide-react'

export default function ArrayField({ label, values = [], onChange, placeholder }) {
  const [input, setInput] = useState('')

  const add = () => {
    const val = String(input || '').trim()
    if (!val) return
    // Prevent duplicate entries
    if (!values.includes(val)) {
      onChange([...values, val])
    }
    setInput('')
  }

  const remove = (i) => onChange(values.filter((_, idx) => idx !== i))

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && values.length > 0) {
      remove(values.length - 1)
    }
  }

  return (
    <div>
      {/* Existing items */}
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {values.map((v, i) => (
            <span key={i} className="tag-item">
              {v}
              <button
                type="button"
                onClick={() => remove(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          className="field"
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={handleKey}
          placeholder={placeholder || `Add ${label?.toLowerCase() || 'item'} and press Enter`}
          style={{ flex: 1 }}
          autoComplete="off"
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={add} style={{ flexShrink: 0 }}>
          <Plus size={13} /> Add
        </button>
      </div>

      <p style={{ marginTop: 5, fontSize: 11, color: 'var(--text-dim)' }}>
        Press Enter to add · Backspace to remove last
      </p>
    </div>
  )
}
