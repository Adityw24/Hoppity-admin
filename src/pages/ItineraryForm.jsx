import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ArrayField from '../components/ArrayField'
import DayBuilder from '../components/DayBuilder'
import MediaUpload from '../components/MediaUpload'

const TABS = ['Basics', 'Content', 'Media', 'Itinerary']
const CATEGORIES = ['Cultural', 'Wildlife', 'Adventure', 'Trekking', 'Heritage', 'Spiritual', 'Culinary']
const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging']
const STATES = [
  'Andaman & Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam',
  'Bihar','Chandigarh','Chhattisgarh','Daman & Diu','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala',
  'Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
  'Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim',
  'Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
]

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
      {children}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
    </label>
  )
}

function Field({ label, required, children, hint, error }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && <p style={{ marginTop: 4, fontSize: 11, color: 'var(--red)' }}>{error}</p>}
      {!error && hint && <p style={{ marginTop: 5, fontSize: 11, color: 'var(--text-dim)' }}>{hint}</p>}
    </div>
  )
}

const EMPTY = {
  title: '', slug: '', location: '', state: '', category: 'Cultural',
  difficulty: 'Moderate', duration: '', duration_display: '', price: 'Price On Request',
  price_per_person: '', tag: '', blurb: '', route: '', meeting_point: '',
  max_group_size: 12, min_group_size: 1, is_active: false,
  highlights: [], inclusions: [], exclusions: [], tips: [], city_stops: [],
  cover_image_url: '', images: [], video_url: '', itinerary_days: [],
}

export default function ItineraryForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab, setTab] = useState('Basics')
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg }
  const [slugManual, setSlugManual] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isEdit) return
    supabase.from('Itineraries').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setForm({
            ...EMPTY,
            ...data,
            price_per_person: data.price_per_person ? String(data.price_per_person) : '',
            images: data.images || [],
            highlights: data.highlights || [],
            inclusions: data.inclusions || [],
            exclusions: data.exclusions || [],
            tips: data.tips || [],
            city_stops: data.city_stops || [],
            itinerary_days: data.itinerary_days || [],
          })
          setSlugManual(true) // Don't auto-update slug on edit
        }
        setLoading(false)
      })
  }, [id, isEdit])

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const handleTitleChange = (val) => {
    set('title', val)
    if (!slugManual) set('slug', slugify(val))
  }

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.slug.trim()) e.slug = 'Slug is required'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Only lowercase letters, numbers and hyphens'
    if (!form.location.trim()) e.location = 'Location is required'
    if (!form.state) e.state = 'State is required'
    if (!form.duration.trim()) e.duration = 'Duration is required'
    if (!form.price.trim()) e.price = 'Price display text is required'
    const min = parseInt(form.min_group_size)
    const max = parseInt(form.max_group_size)
    if (!min || min < 1) e.min_group_size = 'Must be at least 1'
    if (!max || max < 1) e.max_group_size = 'Must be at least 1'
    else if (min && min > max) e.max_group_size = 'Must be ≥ min group size'
    if (form.price_per_person && parseFloat(form.price_per_person) <= 0) e.price_per_person = 'Must be a positive number'
    if (!form.blurb.trim()) e.blurb = 'Blurb is required'
    form.itinerary_days.forEach((day, i) => {
      if (!day.title.trim()) e[`day_${i}_title`] = `Day ${i + 1} title is required`
    })
    return e
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const basicsFields = ['title', 'slug', 'location', 'state', 'duration', 'price', 'min_group_size', 'max_group_size', 'price_per_person']
      if (basicsFields.some(f => errs[f])) setTab('Basics')
      else if (errs.blurb) setTab('Content')
      else if (Object.keys(errs).some(k => k.startsWith('day_'))) setTab('Itinerary')
      showToast('error', 'Please fix the highlighted errors')
      return
    }
    setErrors({})

    setSaving(true)
    try {
      const payload = {
        ...form,
        price_per_person: form.price_per_person ? parseFloat(form.price_per_person) : null,
        max_group_size: parseInt(form.max_group_size) || 12,
        min_group_size: parseInt(form.min_group_size) || 1,
        // Ensure cover_image_url is first image if not set
        cover_image_url: form.cover_image_url || form.images[0] || null,
      }
      // Remove internal-only fields
      delete payload.id
      delete payload.rating
      delete payload.review_count
      delete payload.created_at

      let savedId = id
      if (isEdit) {
        const { error } = await supabase.from('Itineraries').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('Itineraries').insert(payload).select('id').single()
        if (error) throw error
        savedId = data.id
      }

      // Log action
      await supabase.from('Admin_logs').insert({
        admin_email: user.email,
        action: isEdit ? 'update' : 'create',
        entity_type: 'itinerary',
        entity_id: String(savedId),
        entity_title: form.title,
        changes: payload,
      }).catch(() => {})

      showToast('success', isEdit ? 'Changes saved.' : 'Itinerary created.')
      if (!isEdit) setTimeout(() => navigate(`/itineraries/${savedId}/edit`), 1200)
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setSaving(false)
    }
  }



  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 10,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
          color: toast.type === 'success' ? 'var(--green)' : 'var(--red)',
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          maxWidth: 360,
        }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 32px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/itineraries')}>
          <ArrowLeft size={13} /> Back
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600 }}>
            {isEdit ? `Editing: ${form.title || 'Untitled'}` : 'New Itinerary'}
          </h1>
          {form.slug && (
            <p className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              /{form.slug}
            </p>
          )}
        </div>

        {/* Active toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {form.is_active ? 'Active' : 'Draft'}
          </span>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: form.is_active ? 'var(--green)' : 'var(--surface-2)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: form.is_active ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : <><Save size={13} /> Save</>}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {TABS.map(t => {
          const tabHasError =
            (t === 'Basics' && ['title','slug','location','state','duration','price','min_group_size','max_group_size','price_per_person'].some(f => errors[f])) ||
            (t === 'Content' && !!errors.blurb) ||
            (t === 'Itinerary' && Object.keys(errors).some(k => k.startsWith('day_')))
          return (
            <button
              key={t} type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '12px 20px', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--purple)' : '2px solid transparent',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t}
              {tabHasError && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 780 }}>

          {/* ── BASICS ─────────────────────────────────────────── */}
          {tab === 'Basics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Title" required error={errors.title}>
                  <input className="field" value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="Of Rains, Rivers & Root Bridges" />
                </Field>
                <Field label="Slug (URL path)" required hint="Used in URL: hoppity.in/itinerary/your-slug" error={errors.slug}>
                  <input className="field mono" value={form.slug} onChange={e => { setSlugManual(true); set('slug', e.target.value) }} placeholder="rains-rivers-root-bridges" style={{ fontSize: 13 }} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Location" hint="Display text, e.g. 'Meghalaya' or 'Meghalaya • Assam'" error={errors.location}>
                  <input className="field" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Meghalaya" />
                </Field>
                <Field label="State" hint="Primary state for filtering" error={errors.state}>
                  <select className="field" value={form.state} onChange={e => set('state', e.target.value)}>
                    <option value="">— Select state —</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Category">
                  <select className="field" value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select className="field" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Tag / Badge" hint="e.g. Monsoon Special">
                  <input className="field" value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="Signature Journey" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Duration" hint="e.g. 6D / 5N" error={errors.duration}>
                  <input className="field" value={form.duration} onChange={e => { set('duration', e.target.value); set('duration_display', e.target.value) }} placeholder="6D / 5N" />
                </Field>
                <Field label="Duration (display)" hint="Overrides above in UI">
                  <input className="field" value={form.duration_display} onChange={e => set('duration_display', e.target.value)} placeholder="6 Days / 5 Nights" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Price (display text)" hint="e.g. ₹18,000 or 'Price On Request'" error={errors.price}>
                  <input className="field" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Price On Request" />
                </Field>
                <Field label="Price per person (₹)" hint="Leave blank for On Request" error={errors.price_per_person}>
                  <input className="field" type="number" value={form.price_per_person} onChange={e => set('price_per_person', e.target.value)} placeholder="18000" min="0" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Min group size" error={errors.min_group_size}>
                  <input className="field" type="number" value={form.min_group_size} onChange={e => set('min_group_size', e.target.value)} min="1" />
                </Field>
                <Field label="Max group size" error={errors.max_group_size}>
                  <input className="field" type="number" value={form.max_group_size} onChange={e => set('max_group_size', e.target.value)} min="1" />
                </Field>
              </div>
            </div>
          )}

          {/* ── CONTENT ────────────────────────────────────────── */}
          {tab === 'Content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Field label="Blurb" hint="1–2 sentence description shown on listing cards" error={errors.blurb}>
                <textarea className="field" value={form.blurb} onChange={e => set('blurb', e.target.value)} rows={3} placeholder="A monsoon journey through the Khasi Hills…" />
              </Field>

              <Field label="Route" hint="Arrow-separated journey path">
                <input className="field" value={form.route} onChange={e => set('route', e.target.value)} placeholder="Guwahati → Sohra → Shillong → Guwahati" />
              </Field>

              <Field label="City Stops" hint="e.g. '2N Sohra', '1N Shillong'">
                <ArrayField values={form.city_stops} onChange={v => set('city_stops', v)} placeholder="Add stop (e.g. 2N Sohra)" />
              </Field>

              <Field label="Meeting Point">
                <input className="field" value={form.meeting_point} onChange={e => set('meeting_point', e.target.value)} placeholder="Guwahati Airport, Gate 2" />
              </Field>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <p className="section-label" style={{ marginBottom: 16 }}>Lists</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <Field label="Highlights">
                    <ArrayField values={form.highlights} onChange={v => set('highlights', v)} placeholder="Add highlight" />
                  </Field>
                  <Field label="Inclusions">
                    <ArrayField values={form.inclusions} onChange={v => set('inclusions', v)} placeholder="Add inclusion" />
                  </Field>
                  <Field label="Exclusions">
                    <ArrayField values={form.exclusions} onChange={v => set('exclusions', v)} placeholder="Add exclusion" />
                  </Field>
                  <Field label="Tips">
                    <ArrayField values={form.tips} onChange={v => set('tips', v)} placeholder="Add travel tip" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── MEDIA ──────────────────────────────────────────── */}
          {tab === 'Media' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <p className="section-label" style={{ marginBottom: 12 }}>Photos</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                  Upload from your device, paste a Google Drive share link, or add a URL directly.
                  The first image becomes the cover photo on listing cards.
                </p>
                <MediaUpload
                  label="Photos"
                  multiple
                  value={form.images}
                  onChange={v => {
                    set('images', v)
                    if (!form.cover_image_url && v.length > 0) set('cover_image_url', v[0])
                  }}
                  accept="image/*"
                />
              </div>

              <div>
                <p className="section-label" style={{ marginBottom: 12 }}>Cover Image Override</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Override which image is used as the cover. By default, the first photo is the cover.
                </p>
                <MediaUpload
                  label="Cover"
                  multiple={false}
                  value={form.cover_image_url}
                  onChange={v => set('cover_image_url', v)}
                  accept="image/*"
                />
              </div>

              <div>
                <p className="section-label" style={{ marginBottom: 12 }}>Video</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Used in the app's TikTok-style feed. Upload an MP4 or paste a URL.
                </p>
                <MediaUpload
                  label="Video"
                  multiple={false}
                  value={form.video_url}
                  onChange={v => set('video_url', v)}
                  accept="video/*"
                />
                <div style={{ marginTop: 12 }}>
                  <Label>Or enter video URL directly</Label>
                  <input className="field" value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://…" />
                </div>
              </div>
            </div>
          )}

          {/* ── ITINERARY DAYS ─────────────────────────────────── */}
          {tab === 'Itinerary' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Build the day-by-day itinerary. Each day has a title, description, and a list of activities.
                Use the arrows to reorder days.
              </p>
              <DayBuilder
                days={form.itinerary_days}
                onChange={v => {
                  set('itinerary_days', v)
                  setErrors(e => {
                    const n = { ...e }
                    Object.keys(n).forEach(k => { if (k.startsWith('day_')) delete n[k] })
                    return n
                  })
                }}
                errors={errors}
              />
            </div>
          )}

        </div>
      </div>

    </form>
  )
}
