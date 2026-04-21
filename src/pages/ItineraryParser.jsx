import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ['adventure','cultural','wildlife','spiritual','luxury','offbeat','pilgrimage','honeymoon','family']
const DIFFICULTIES = ['easy','moderate','difficult']
const TABS = ['Basics','Content','Days','Vendor']

const EMPTY = {
  title: '', category: 'adventure', state: '', location: '',
  price_per_person: '', difficulty: 'moderate', duration_display: '',
  city_stops: [], search_tags: [], highlights: [], inclusions: [],
  exclusions: [], tips: [], itinerary_days: [], vendor_name: '',
  vendor_contact: '', vendor_notes: '', seo_description: '', mood_tags: [],
  is_active: false,
}

const PARSE_STEPS = [
  'Reading brochure structure',
  'Extracting tour basics',
  'Parsing day-by-day itinerary',
  'Pulling inclusions & exclusions',
  'Identifying vendor details',
  'Structuring final output',
]

// ─── Helper: confidence level ─────────────────────────────────────────────────

function confLevel(val) {
  if (!val || val === '' || (Array.isArray(val) && val.length === 0)) return 'low'
  if (Array.isArray(val) && val.length < 2) return 'med'
  return 'high'
}

const confColors = { high: '#22c55e', med: '#f59e0b', low: '#ef4444' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ label, val }) {
  const level = confLevel(val)
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: confColors[level], flexShrink: 0 }} />
      {label}
    </label>
  )
}

function ArrayField({ values = [], onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: values.length ? 8 : 0 }}>
        {values.map((v, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--text-dim)' }}>
            {v}
            <span onClick={() => onChange(values.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1 }}>×</span>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="field" value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button className="btn btn-sm" type="button" onClick={add}>+ Add</button>
      </div>
    </div>
  )
}

function DayEditor({ days, onChange }) {
  const [open, setOpen] = useState(0)

  const updateDay = (i, field, val) => {
    const d = [...days]; d[i] = { ...d[i], [field]: val }; onChange(d)
  }
  const addDay = () => {
    onChange([...days, { title: `Day ${days.length + 1}`, description: '', activities: [] }])
    setOpen(days.length)
  }
  const removeDay = i => {
    const d = [...days]; d.splice(i, 1); onChange(d); setOpen(Math.max(0, open - 1))
  }
  const moveDay = (i, dir) => {
    const d = [...days], j = i + dir
    if (j < 0 || j >= d.length) return;
    [d[i], d[j]] = [d[j], d[i]]; onChange(d); setOpen(j)
  }

  return (
    <div>
      {days.map((day, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', cursor: 'pointer' }}
            onClick={() => setOpen(open === i ? -1 : i)}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple-light)', background: 'rgba(139,92,246,0.1)', borderRadius: 4, padding: '2px 7px' }}>
              DAY {i + 1}
            </span>
            <input className="field" style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, fontSize: 13, fontWeight: 500 }}
              value={day.title} onChange={e => { e.stopPropagation(); updateDay(i, 'title', e.target.value) }}
              onClick={e => e.stopPropagation()} placeholder="Day title..." />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" type="button" onClick={e => { e.stopPropagation(); moveDay(i, -1) }} disabled={i === 0} style={{ padding: '3px 6px' }}>↑</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={e => { e.stopPropagation(); moveDay(i, 1) }} disabled={i === days.length - 1} style={{ padding: '3px 6px' }}>↓</button>
              <button className="btn btn-sm" type="button" style={{ color: '#ef4444', borderColor: 'transparent', padding: '3px 6px' }} onClick={e => { e.stopPropagation(); removeDay(i) }}>✕</button>
            </div>
          </div>
          {open === i && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Description</label>
                <textarea className="field" rows={3} value={day.description} onChange={e => updateDay(i, 'description', e.target.value)} placeholder="What happens this day..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Activities</label>
                <ArrayField values={day.activities || []} onChange={v => updateDay(i, 'activities', v)} placeholder="Add activity (e.g. Jungle Safari)..." />
              </div>
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" type="button" onClick={addDay} style={{ marginTop: 4 }}>+ Add Day</button>
    </div>
  )
}

// ─── Tab panels ────────────────────────────────────────────────────────────────

function BasicsTab({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <FieldLabel label="Tour Title" val={form.title} />
        <input className="field" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Discover the Valleys of Spiti" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <FieldLabel label="Category" val={form.category} />
          <select className="field" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel label="Difficulty" val={form.difficulty} />
          <select className="field" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <FieldLabel label="State" val={form.state} />
          <input className="field" value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Himachal Pradesh" />
        </div>
        <div>
          <FieldLabel label="Location / Region" val={form.location} />
          <input className="field" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Spiti Valley" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <FieldLabel label="Duration" val={form.duration_display} />
          <input className="field" value={form.duration_display} onChange={e => set('duration_display', e.target.value)} placeholder="e.g. 7 Days 6 Nights" />
        </div>
        <div>
          <FieldLabel label="Price Per Person (₹)" val={form.price_per_person} />
          <input className="field" type="number" value={form.price_per_person} onChange={e => set('price_per_person', e.target.value)} placeholder="e.g. 28000" />
        </div>
      </div>
      <div>
        <FieldLabel label="SEO Description" val={form.seo_description} />
        <textarea className="field" rows={2} value={form.seo_description} onChange={e => set('seo_description', e.target.value)} placeholder="1-2 sentence description for search engines..." />
      </div>
      <div>
        <FieldLabel label="City Stops" val={form.city_stops} />
        <ArrayField values={form.city_stops} onChange={v => set('city_stops', v)} placeholder="Add city stop..." />
      </div>
      <div>
        <FieldLabel label="Search Tags" val={form.search_tags} />
        <ArrayField values={form.search_tags} onChange={v => set('search_tags', v)} placeholder="e.g. camping, snow, monastery..." />
      </div>
      <div>
        <FieldLabel label="Mood Tags" val={form.mood_tags} />
        <ArrayField values={form.mood_tags} onChange={v => set('mood_tags', v)} placeholder="e.g. scenic, offbeat, spiritual..." />
      </div>
    </div>
  )
}

function ContentTab({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[
        { key: 'highlights', label: 'Highlights', placeholder: 'Add highlight...' },
        { key: 'inclusions', label: 'Inclusions', placeholder: 'e.g. All meals included...' },
        { key: 'exclusions', label: 'Exclusions', placeholder: 'e.g. Airfare not included...' },
        { key: 'tips', label: 'Travel Tips', placeholder: 'Add tip...' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel label={label} val={form[key]} />
          <ArrayField values={form[key]} onChange={v => set(key, v)} placeholder={placeholder} />
        </div>
      ))}
    </div>
  )
}

function DaysTab({ form, set }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {form.itinerary_days.length} days parsed · click day header to expand/collapse
        </p>
        <span style={{ fontSize: 11, background: 'rgba(139,92,246,0.1)', color: 'var(--purple-light)', borderRadius: 6, padding: '3px 8px', border: '1px solid rgba(139,92,246,0.2)' }}>
          {form.itinerary_days.length} days
        </span>
      </div>
      <DayEditor days={form.itinerary_days} onChange={v => set('itinerary_days', v)} />
    </div>
  )
}

function VendorTab({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>DMC / Vendor Name</label>
        <input className="field" value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)} placeholder="e.g. Himalayan Treks & Tours" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Vendor Contact (Phone / Email)</label>
        <input className="field" value={form.vendor_contact} onChange={e => set('vendor_contact', e.target.value)} placeholder="e.g. +91 98765 43210 / ops@dmc.com" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Internal Notes</label>
        <textarea className="field" rows={4} value={form.vendor_notes} onChange={e => set('vendor_notes', e.target.value)} placeholder="Pricing notes, contact person, reliability rating..." />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ItineraryParser() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const [step, setStep] = useState('upload')
  const [form, setForm] = useState(EMPTY)
  const [tab, setTab] = useState(0)
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [parseStepIdx, setParseStepIdx] = useState(0)
  const [alert, setAlert] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load existing itinerary if ?edit=ID
  useEffect(() => {
    if (!editId) return
    setLoadingExisting(true)
    supabase.from('Itineraries').select('*').eq('id', editId).single()
      .then(({ data, error }) => {
        setLoadingExisting(false)
        if (error || !data) {
          setAlert({ type: 'error', msg: `Could not load itinerary HOP-${String(editId).padStart(4, '0')}: ${error?.message}` })
          return
        }
        setForm({
          ...EMPTY,
          title: data.title || '',
          category: data.category || 'adventure',
          state: data.state || '',
          location: data.location || '',
          price_per_person: data.price_per_person || '',
          difficulty: data.difficulty || 'moderate',
          duration_display: data.duration_display || '',
          seo_description: data.seo_description || '',
          city_stops: data.city_stops || [],
          search_tags: data.search_tags || [],
          mood_tags: data.mood_tags || [],
          highlights: data.highlights || [],
          inclusions: data.inclusions || [],
          exclusions: data.exclusions || [],
          tips: data.tips || [],
          itinerary_days: data.itinerary_days || [],
          vendor_name: data.vendor_name || '',
          vendor_contact: data.vendor_contact || '',
          vendor_notes: data.vendor_notes || '',
          is_active: data.is_active || false,
        })
        setStep('edit')
        setAlert({ type: 'success', msg: `Loaded HOP-${String(editId).padStart(4, '0')} — "${data.title}". Upload a brochure to re-parse, or edit directly.` })
      })
  }, [editId])

  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0]
    if (f && f.type === 'application/pdf') { setFile(f); setAlert(null) }
    else setAlert({ type: 'error', msg: 'Please upload a PDF brochure.' })
  }, [])

  const runParse = async () => {
    if (!file) return
    setStep('parsing')
    setParseProgress(0)
    setParseStepIdx(0)

    const stepInterval = setInterval(() => {
      setParseStepIdx(i => { if (i < PARSE_STEPS.length - 1) return i + 1; clearInterval(stepInterval); return i })
      setParseProgress(p => Math.min(p + 16, 95))
    }, 1200)

    try {
      // Convert PDF to base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      // Hardcoded Supabase URL — no env vars, no client internals
      const fnResponse = await fetch(
        'https://wenhudcyvlhilpgazylg.supabase.co/functions/v1/parse-brochure',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlbmh1ZGN5dmxoaWxwZ2F6eWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTY0MTgsImV4cCI6MjA4NTA3MjQxOH0.Jdx993pFvb0JC87NaYhOQ6UR_7UIJBA1mkFQUeoK7bA',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlbmh1ZGN5dmxoaWxwZ2F6eWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTY0MTgsImV4cCI6MjA4NTA3MjQxOH0.Jdx993pFvb0JC87NaYhOQ6UR_7UIJBA1mkFQUeoK7bA',
          },
          body: JSON.stringify({ pdf_base64: base64 }),
        }
      )

      clearInterval(stepInterval)
      setParseProgress(100)
      setParseStepIdx(PARSE_STEPS.length - 1)

      if (!fnResponse.ok) {
        const errBody = await fnResponse.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${fnResponse.status}`)
      }

      const fnData = await fnResponse.json()
      if (fnData?.error) throw new Error(fnData.error)

      const parsed = fnData.result
      const extractedImages = fnData.extracted_images || []
      const imagesFound = fnData.images_found || 0
      const imagesClean = fnData.images_clean || 0

      // Map clean images to cover + gallery (don't overwrite if already set)
      if (extractedImages.length > 0) {
        if (!parsed.cover_image_url) parsed.cover_image_url = extractedImages[0]
        parsed.images = extractedImages.slice(1)
      }

      setTimeout(() => {
        setForm(prev => ({
          ...prev,
          ...parsed,
          city_stops: parsed.city_stops || [],
          search_tags: parsed.search_tags || [],
          mood_tags: parsed.mood_tags || [],
          highlights: parsed.highlights || [],
          inclusions: parsed.inclusions || [],
          exclusions: parsed.exclusions || [],
          tips: parsed.tips || [],
          itinerary_days: parsed.itinerary_days || [],
          cover_image_url: parsed.cover_image_url || prev.cover_image_url || '',
          images: parsed.images || prev.images || [],
        }))
        setStep('edit')
        const imgMsg = imagesFound > 0
          ? ` · ${imagesFound} images found, ${imagesClean} clean (no text overlay) extracted`
          : ''
        setAlert({
          type: 'success',
          msg: `Parsed successfully — ${parsed.itinerary_days?.length || 0} days, ${parsed.highlights?.length || 0} highlights, ${(parsed.inclusions?.length || 0) + (parsed.exclusions?.length || 0)} inclusions/exclusions extracted${imgMsg}.`
        })
      }, 400)
    } catch (err) {
      clearInterval(stepInterval)
      setStep(editId ? 'edit' : 'upload')
      setAlert({ type: 'error', msg: `Parse failed: ${err.message}` })
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setAlert({ type: 'error', msg: 'Title is required before saving.' }); return }
    setSaving(true)
    setAlert(null)

    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const payload = {
      title: form.title, slug,
      category: form.category, state: form.state, location: form.location,
      price_per_person: form.price_per_person ? Number(form.price_per_person) : null,
      difficulty: form.difficulty, duration_display: form.duration_display,
      seo_description: form.seo_description, city_stops: form.city_stops,
      search_tags: form.search_tags, mood_tags: form.mood_tags,
      highlights: form.highlights, inclusions: form.inclusions,
      exclusions: form.exclusions, tips: form.tips,
      itinerary_days: form.itinerary_days, vendor_name: form.vendor_name,
      vendor_contact: form.vendor_contact, vendor_notes: form.vendor_notes,
      is_active: form.is_active,
    }

    let error
    if (editId) {
      const res = await supabase.from('Itineraries').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('Itineraries').insert([payload])
      error = res.error
    }

    setSaving(false)
    if (error) {
      setAlert({ type: 'error', msg: `Save failed: ${error.message}` })
    } else {
      setAlert({ type: 'success', msg: `Itinerary "${form.title}" ${editId ? 'updated' : 'created'} successfully. Redirecting...` })
      setTimeout(() => navigate('/itineraries'), 1500)
    }
  }

  const totalFilled = Object.entries(form).filter(([, v]) => Array.isArray(v) ? v.length > 0 : v !== '' && v !== false).length
  const isEditMode = Boolean(editId)

  if (loadingExisting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontSize: 13 }}>
        Loading HOP-{String(editId).padStart(4, '0')}...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--purple-light)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              AI Parser
            </span>
            <h1 style={{ fontSize: 14, fontWeight: 600 }}>
              {isEditMode ? `Re-parse HOP-${String(editId).padStart(4, '0')}` : 'Brochure → Itinerary'}
            </h1>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Upload a DMC brochure PDF — Claude extracts all itinerary fields automatically
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {step === 'edit' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-dim)' }}>
              {totalFilled} / {Object.keys(EMPTY).length} fields filled
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setStep('upload'); setFile(null); setAlert(null) }}>
              Re-parse
            </button>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/itineraries')}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', flex: 1, overflow: 'hidden' }}>

        <div style={{ borderRight: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', background: 'var(--surface)' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Progress</div>
            {['Upload Brochure', 'AI Parsing', 'Review & Save'].map((s, i) => {
              const current = step === 'upload' ? 0 : step === 'parsing' ? 1 : 2
              const done = i < current, active = i === current
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0, background: done ? 'rgba(34,197,94,0.1)' : active ? 'var(--purple)' : 'var(--surface)', border: done ? '1px solid #22c55e' : active ? '1px solid var(--purple)' : '1px solid var(--border)', color: done ? '#22c55e' : active ? '#fff' : 'var(--text-muted)' }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: active ? 'var(--text)' : 'var(--text-dim)' }}>{s}</span>
                </div>
              )
            })}
          </div>

          {file && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>File</div>
              <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 3, wordBreak: 'break-all' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{(file.size / 1024).toFixed(0)} KB · PDF</div>
              </div>
            </div>
          )}

          {step === 'edit' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Field Confidence</div>
              {[
                { label: 'Title & basics', val: form.title },
                { label: 'Location', val: form.state },
                { label: 'Pricing', val: form.price_per_person },
                { label: 'Highlights', val: form.highlights },
                { label: 'Inclusions', val: form.inclusions },
                { label: 'Day plan', val: form.itinerary_days },
                { label: 'Vendor info', val: form.vendor_name },
              ].map(({ label, val }) => {
                const level = confLevel(val)
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: confColors[level], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
                  </div>
                )
              })}
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                Green = extracted · Orange = partial · Red = needs entry
              </div>
            </div>
          )}

          {step === 'edit' && (
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Set Live</span>
                <button type="button" onClick={() => set('is_active', !form.is_active)}
                  style={{ width: 36, height: 20, borderRadius: 10, background: form.is_active ? 'var(--purple)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 3, left: form.is_active ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                {form.is_active ? 'Will be visible on hoppity.in' : 'Saved as draft (not visible)'}
              </div>
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: 24 }}>
          {alert && (
            <div style={{ marginBottom: 16, borderRadius: 8, padding: '10px 14px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start', background: alert.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${alert.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: alert.type === 'success' ? '#22c55e' : '#ef4444' }}>
              <span style={{ flexShrink: 0 }}>{alert.type === 'success' ? '✓' : '!'}</span>
              <span style={{ flex: 1 }}>{alert.msg}</span>
              <span style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setAlert(null)}>✕</span>
            </div>
          )}

          {step === 'upload' && (
            <div>
              <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', ...(drag ? { borderColor: 'var(--purple)', background: 'rgba(139,92,246,0.05)' } : {}) }}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current.click()}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>
                  {file ? file.name : 'Drop DMC brochure PDF here'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                  {file ? `${(file.size / 1024).toFixed(0)} KB · Ready to parse` : 'or click to browse · PDF only'}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onDrop} />
                {file && (
                  <button className="btn btn-primary" type="button" onClick={e => { e.stopPropagation(); runParse() }}>
                    Parse with Claude AI
                  </button>
                )}
              </div>
              {isEditMode && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <button className="btn btn-ghost" onClick={() => setStep('edit')}>
                    Skip re-parse — edit existing fields directly
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'parsing' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 14 }}>Parsing brochure...</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Claude is reading and structuring your itinerary data</div>
              </div>
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ height: '100%', background: 'var(--purple)', borderRadius: 2, width: `${parseProgress}%`, transition: 'width 0.4s ease' }} />
              </div>
              {PARSE_STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: i < parseStepIdx ? '#22c55e' : i === parseStepIdx ? '#f59e0b' : 'var(--text-muted)', animation: i === parseStepIdx ? 'pulse 1s infinite' : 'none' }} />
                  <span style={{ color: i <= parseStepIdx ? 'var(--text)' : 'var(--text-muted)' }}>{s}</span>
                  {i < parseStepIdx && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e' }}>done</span>}
                  {i === parseStepIdx && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#f59e0b' }}>in progress</span>}
                </div>
              ))}
            </div>
          )}

          {step === 'edit' && (
            <>
              <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                {TABS.map((t, i) => (
                  <div key={i} onClick={() => setTab(i)}
                    style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottom: `2px solid ${tab === i ? 'var(--purple)' : 'transparent'}`, marginBottom: -1, color: tab === i ? 'var(--purple-light)' : 'var(--text-dim)', transition: 'all 0.15s' }}>
                    {t}
                    {i === 2 && form.itinerary_days.length > 0 && (
                      <span style={{ marginLeft: 6, background: 'rgba(139,92,246,0.1)', color: 'var(--purple-light)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                        {form.itinerary_days.length}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {tab === 0 && <BasicsTab form={form} set={set} />}
              {tab === 1 && <ContentTab form={form} set={set} />}
              {tab === 2 && <DaysTab form={form} set={set} />}
              {tab === 3 && <VendorTab form={form} set={set} />}
            </>
          )}
        </div>
      </div>

      {step === 'edit' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {isEditMode ? `Updating HOP-${String(editId).padStart(4, '0')}` : 'Creating new itinerary'}
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={() => navigate('/itineraries')}>Discard</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Saving...' : isEditMode ? 'Update Itinerary' : 'Save to Hoppity'}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
