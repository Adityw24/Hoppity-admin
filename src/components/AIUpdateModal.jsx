import { useState } from 'react'
import { X } from 'lucide-react'

export default function AIUpdateModal({ onClose, onApply }) {
  const [payload, setPayload] = useState('{}')
  const [error, setError] = useState(null)

  const handleApply = () => {
    setError(null)
    try {
      const updates = JSON.parse(payload)
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        throw new Error('Expected a JSON object of key: value pairs')
      }
      onApply(updates)
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ width: 680, maxWidth: '95%', background: 'var(--surface)', borderRadius: 10, padding: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>AI Update</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={14} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Paste a JSON object with fields to update. Example: {`{"title":"New title","blurb":"Short blurb"}`}
        </p>

        <textarea
          className="field"
          value={payload}
          onChange={e => setPayload(e.currentTarget.value)}
          style={{ width: '100%', minHeight: 180, fontFamily: 'monospace', fontSize: 13 }}
        />

        {error && <p style={{ color: 'var(--red)', marginTop: 8, fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>Apply updates</button>
        </div>
      </div>
    </div>
  )
}
import { useState, useRef, useCallback } from 'react'

const PARSE_STEPS = [
  'Reading brochure structure',
  'Extracting tour basics',
  'Parsing day-by-day itinerary',
  'Pulling inclusions & exclusions',
  'Identifying vendor details',
  'Structuring final output',
]

const SUPABASE_URL = 'https://wenhudcyvlhilpgazylg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlbmh1ZGN5dmxoaWxwZ2F6eWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTY0MTgsImV4cCI6MjA4NTA3MjQxOH0.Jdx993pFvb0JC87NaYhOQ6UR_7UIJBA1mkFQUeoK7bA'

// Fields the AI is allowed to overwrite
const AI_FIELDS = [
  'title', 'category', 'state', 'location', 'price_per_person',
  'difficulty', 'duration_display', 'seo_description',
  'city_stops', 'search_tags', 'mood_tags',
  'highlights', 'inclusions', 'exclusions', 'tips',
  'itinerary_days', 'vendor_name', 'vendor_contact', 'vendor_notes',
]

export default function AIUpdateModal({ onClose, onApply }) {
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0]
    if (f && f.type === 'application/pdf') { setFile(f); setError(null) }
    else setError('Please upload a PDF brochure.')
  }, [])

  const runParse = async () => {
    if (!file) return
    setParsing(true); setProgress(0); setStepIdx(0); setError(null)

    const interval = setInterval(() => {
      setStepIdx(i => { if (i < PARSE_STEPS.length - 1) return i + 1; clearInterval(interval); return i })
      setProgress(p => Math.min(p + 16, 95))
    }, 1200)

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-brochure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ pdf_base64: base64 }),
      })

      clearInterval(interval)
      setProgress(100)
      setStepIdx(PARSE_STEPS.length - 1)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data?.error) throw new Error(data.error)

      setParsed(data.result)
      setParsing(false)
    } catch (err) {
      clearInterval(interval)
      setParsing(false)
      setError(`Parse failed: ${err.message}`)
    }
  }

  const handleApply = () => {
    if (!parsed) return
    // Only pass fields the AI should overwrite
    const update = {}
    AI_FIELDS.forEach(k => { if (parsed[k] !== undefined) update[k] = parsed[k] })
    onApply(update)
    onClose()
  }

  return (
    // Backdrop
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, width: 520, maxHeight: '85vh', overflowY: 'auto', padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--purple-light)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Update</span>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Update with AI</h2>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Upload a new brochure PDF — Claude will overwrite fields with extracted data. Media and images are preserved.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', flexShrink: 0 }}>✕</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Step 1 — Upload */}
        {!parsing && !parsed && (
          <div
            className={drag ? 'drag' : ''}
            style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', ...(drag ? { borderColor: 'var(--purple)', background: 'rgba(139,92,246,0.05)' } : {}) }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
            <div style={{ fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
              {file ? file.name : 'Drop brochure PDF here'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: file ? 16 : 0 }}>
              {file ? `${(file.size / 1024).toFixed(0)} KB · Ready` : 'or click to browse · PDF only'}
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onDrop} />
            {file && (
              <button className="btn btn-primary" type="button" onClick={e => { e.stopPropagation(); runParse() }}>
                Parse with Claude AI
              </button>
            )}
          </div>
        )}

        {/* Step 2 — Parsing */}
        {parsing && (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Parsing brochure...</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Claude is reading and structuring your itinerary data</div>
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', background: 'var(--purple)', borderRadius: 2, width: `${progress}%`, transition: 'width 0.4s ease' }} />
            </div>
            {PARSE_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: i < stepIdx ? '#22c55e' : i === stepIdx ? '#f59e0b' : 'var(--text-muted)', animation: i === stepIdx ? 'pulse 1s infinite' : 'none' }} />
                <span style={{ color: i <= stepIdx ? 'var(--text)' : 'var(--text-muted)' }}>{s}</span>
                {i < stepIdx && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e' }}>done</span>}
                {i === stepIdx && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#f59e0b' }}>in progress</span>}
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — Preview parsed fields */}
        {parsed && !parsing && (
          <div>
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#22c55e', marginBottom: 16 }}>
              ✓ Parsed successfully — {parsed.itinerary_days?.length || 0} days, {parsed.highlights?.length || 0} highlights extracted
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fields to be updated:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, maxHeight: 260, overflowY: 'auto' }}>
              {AI_FIELDS.filter(k => parsed[k] !== undefined && parsed[k] !== '' && !(Array.isArray(parsed[k]) && parsed[k].length === 0)).map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 4 }} />
                  <span style={{ color: 'var(--text-dim)', minWidth: 140, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {Array.isArray(parsed[k])
                      ? `${parsed[k].length} item${parsed[k].length !== 1 ? 's' : ''}`
                      : String(parsed[k]).slice(0, 60)
                    }
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              Cover image, gallery, and video URL will not be touched. Review all changes before saving.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => { setParsed(null); setFile(null) }} style={{ flex: 1 }}>
                Re-upload
              </button>
              <button className="btn btn-primary" onClick={handleApply} style={{ flex: 2 }}>
                Apply to Form →
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
