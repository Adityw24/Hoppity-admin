import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ArrayField from '../components/ArrayField'
import DayBuilder from '../components/DayBuilder'
import MediaUpload from '../components/MediaUpload'

const TABS       = ['Basics', 'Content', 'Media', 'Itinerary', 'Vendor']
const CATEGORIES = ['Cultural', 'Wildlife', 'Adventure', 'Trekking', 'Heritage', 'Spiritual', 'Culinary']
const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging']
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
]

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const EMPTY = {
  title: '', slug: '', location: '', state: '', category: 'Cultural',
  difficulty: 'Moderate', duration: '', duration_display: '', price: 'Price On Request',
  price_per_person: '', tag: '', blurb: '', route: '', meeting_point: '',
  max_group_size: 12, min_group_size: 1, is_active: false,
  highlights: [], inclusions: [], exclusions: [], tips: [], city_stops: [],
  cover_image_url: '', images: [], video_url: '', itinerary_days: [],
  vendor_name: '', vendor_contact: '', vendor_notes: '', guide_id: '',
  search_tags: [],
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: Label and Field must live at MODULE SCOPE — never inside the
// component function.
//
// When a component is defined inside another component's render body, React
// sees a different function reference on every render. It treats it as a
// completely new component type, tears down the old DOM node and mounts a
// fresh one — which destroys the <input> element and kills focus after every
// single keystroke. That is the "one word at a time" bug.
//
// Moving them here (outside export default) gives them a stable identity
// forever. React can reconcile them normally and inputs keep their focus.
// ─────────────────────────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
    {children}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
  </label>
)

const Field = ({ label, required, children, hint }) => (
  <div>
    {label && <Label required={required}>{label}</Label>}
    {children}
    {hint && <p style={{ marginTop: 5, fontSize: 11, color: 'var(--text-dim)' }}>{hint}</p>}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function ItineraryForm() {
  const { id } = useParams()
  const isEdit  = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab,        setTab]        = useState('Basics')
  const [form,       setForm]       = useState(EMPTY)
  const [loading,    setLoading]    = useState(isEdit)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState(null)
  const [slugManual, setSlugManual] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    supabase.from('Itineraries').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) console.error('Failed to load itinerary:', error)
        if (data) {
          setForm({
            ...EMPTY,
            ...data,
            price_per_person: data.price_per_person ? String(data.price_per_person) : '',
            images:         data.images         || [],
            highlights:     data.highlights     || [],
            inclusions:     data.inclusions     || [],
            exclusions:     data.exclusions     || [],
            tips:           data.tips           || [],
            city_stops:     data.city_stops     || [],
            itinerary_days: data.itinerary_days || [],
            search_tags:    data.search_tags    || [],
          })
          setSlugManual(true)
        }
        setLoading(false)
      })
  }, [id, isEdit])

  // ── Core field setter ───────────────────────────────────────────────────────
  // Pass the value through exactly as-is. Do NOT coerce to String — booleans
  // (is_active), numbers (group sizes) and arrays (highlights etc.) must keep
  // their native types so Supabase and controlled inputs work correctly.
  const set = useCallback((field, val) => {
    setForm(f => ({ ...f, [field]: val }))
  }, [])

  // Title + slug are updated in one atomic setForm call to avoid stale-closure
  // issues when both fields need to change together.
  const handleTitleChange = useCallback((val) => {
    setForm(f => ({
      ...f,
      title: val,
      slug: slugManual ? f.slug : slugify(val),
    }))
  }, [slugManual])

  // ── Stable callbacks for complex child components ───────────────────────────
  // [] dep array → same function reference on every render.
  // Prevents ArrayField / MediaUpload / DayBuilder from seeing new props and
  // triggering unnecessary re-renders that could unmount their internal inputs.
  const setHighlights = useCallback(v => setForm(f => ({ ...f, highlights:      v })), [])
  const setInclusions = useCallback(v => setForm(f => ({ ...f, inclusions:      v })), [])
  const setExclusions = useCallback(v => setForm(f => ({ ...f, exclusions:      v })), [])
  const setTips       = useCallback(v => setForm(f => ({ ...f, tips:            v })), [])
  const setCityStops  = useCallback(v => setForm(f => ({ ...f, city_stops:      v })), [])
  const setSearchTags = useCallback(v => setForm(f => ({ ...f, search_tags:     v })), [])
  const setItinerary  = useCallback(v => setForm(f => ({ ...f, itinerary_days:  v })), [])
  const setCoverImg   = useCallback(v => setForm(f => ({ ...f, cover_image_url: v })), [])
  const setVideoUrl   = useCallback(v => setForm(f => ({ ...f, video_url:       v })), [])
  const setImages     = useCallback(v => setForm(f => ({
    ...f,
    images: v,
    cover_image_url: f.cover_image_url || (v.length > 0 ? v[0] : ''),
  })), [])
  const setVendorContact = useCallback(v => {
    // keep digits only and limit to 10 chars
    const digits = String(v || '').replace(/\D+/g, '').slice(0, 10)
    setForm(f => ({ ...f, vendor_contact: digits }))
  }, [])

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const validateForm = () => {
    const errors = []
    const tabFor = (t) => t

    const isValidUrl = (u) => {
      try { new URL(u); return true } catch { return false }
    }
    const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

    if (!form.title || !String(form.title).trim()) {
      errors.push('Title is required')
      return { valid: false, errors, tab: tabFor('Basics') }
    }
    if (!form.slug || !String(form.slug).trim()) {
      errors.push('Slug is required')
      return { valid: false, errors, tab: tabFor('Basics') }
    }

    if (form.price_per_person && isNaN(parseFloat(form.price_per_person))) {
      errors.push('Price per person must be a number')
      return { valid: false, errors, tab: tabFor('Basics') }
    }

    const minG = parseInt(form.min_group_size) || 0
    const maxG = parseInt(form.max_group_size) || 0
    if (minG < 1) {
      errors.push('Min group size must be at least 1')
      return { valid: false, errors, tab: tabFor('Basics') }
    }
    if (maxG < minG) {
      errors.push('Max group size must be greater than or equal to Min group size')
      return { valid: false, errors, tab: tabFor('Basics') }
    }

    // Arrays: ensure no empty entries
    const arrayChecks = [
      { key: 'search_tags', tab: 'Basics' },
      { key: 'highlights', tab: 'Content' },
      { key: 'inclusions', tab: 'Content' },
      { key: 'exclusions', tab: 'Content' },
      { key: 'tips', tab: 'Content' },
      { key: 'city_stops', tab: 'Content' },
    ]
    for (const a of arrayChecks) {
      const arr = form[a.key]
      if (Array.isArray(arr)) {
        for (const v of arr) {
          if (!String(v || '').trim()) {
            errors.push(`Please remove empty entries from ${a.key.replace('_',' ')}`)
            return { valid: false, errors, tab: tabFor(a.tab) }
          }
        }
      }
    }

    // Itinerary days validation
    if (Array.isArray(form.itinerary_days) && form.itinerary_days.length > 0) {
      for (let i = 0; i < form.itinerary_days.length; i++) {
        const d = form.itinerary_days[i]
        if (!d || !String(d.title || '').trim()) {
          errors.push(`Day ${i + 1}: title is required`)
          return { valid: false, errors, tab: tabFor('Itinerary') }
        }
        if (!d || !String(d.description || '').trim()) {
          errors.push(`Day ${i + 1}: description is required`)
          return { valid: false, errors, tab: tabFor('Itinerary') }
        }
      }
    }

    // Media validations
    if (form.video_url && String(form.video_url).trim() && !isValidUrl(String(form.video_url).trim())) {
      errors.push('Video URL is not a valid URL')
      return { valid: false, errors, tab: tabFor('Media') }
    }

    // Vendor validations
    if (form.guide_id && String(form.guide_id).trim() && !isUUID(String(form.guide_id).trim())) {
      errors.push('Guide ID must be a valid UUID')
      return { valid: false, errors, tab: tabFor('Vendor') }
    }

    if (form.vendor_contact && String(form.vendor_contact).trim() && !/^\d{1,10}$/.test(String(form.vendor_contact).trim())) {
      errors.push('Vendor Contact must contain only digits and be at most 10 digits')
      return { valid: false, errors, tab: tabFor('Vendor') }
    }

    return { valid: true, errors: [] }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const validation = validateForm()
    if (!validation.valid) {
      setTab(validation.tab || 'Basics')
      showToast('error', validation.errors[0])
      return
    }

    setSaving(true)
    try {
      // Ensure slug exists and is unique before sending to DB
      const baseSlugSource = (form.slug && String(form.slug).trim()) ? String(form.slug).trim() : String(form.title || '').trim()
      let baseSlug = slugify(baseSlugSource || '')
      if (!baseSlug) baseSlug = `itinerary-${Date.now()}`

      // Helper: make slug unique by appending -2, -3... if necessary
      const makeUniqueSlug = async (candidate) => {
        let slugCandidate = candidate
        let idx = 2
        while (true) {
          const { data, error } = await supabase.from('Itineraries').select('id').eq('slug', slugCandidate).maybeSingle()
          if (error) throw error
          if (!data) return slugCandidate
          // If editing same record, allow same slug
          if (isEdit && data && String(data.id) === String(id)) return slugCandidate
          // Otherwise try next suffix
          slugCandidate = `${candidate}-${idx}`
          idx += 1
          if (idx > 100) return `${candidate}-${Date.now()}`
        }
      }

      const uniqueSlug = await makeUniqueSlug(baseSlug)

      const payload = {
        ...form,
        slug: uniqueSlug,
        price_per_person: form.price_per_person ? parseFloat(form.price_per_person) : null,
        max_group_size:   parseInt(form.max_group_size)  || 12,
        min_group_size:   parseInt(form.min_group_size)  || 1,
        cover_image_url:  form.cover_image_url || form.images[0] || null,
        guide_id:         form.guide_id?.trim()         || null,
        vendor_name:      form.vendor_name?.trim()      || null,
        vendor_contact:   form.vendor_contact?.trim()   || null,
        vendor_notes:     form.vendor_notes?.trim()     || null,
      }

      // Never send DB-managed or read-only columns back to Supabase
      delete payload.id
      delete payload.rating
      delete payload.review_count
      delete payload.created_at
      delete payload.search_vector
      delete payload.updated_at

      let savedId = id
      if (isEdit) {
        const { error } = await supabase.from('Itineraries').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('Itineraries').insert(payload).select('id').single()
        if (error) throw error
        savedId = data.id
      }

      try {
        await supabase.from('Admin_logs').insert({
          admin_email:  user?.email,
          action:       isEdit ? 'update' : 'create',
          entity_type:  'itinerary',
          entity_id:    String(savedId),
          entity_title: form.title,
          changes:      payload,
        })
      } catch (e) { /* ignore logging errors */ }

      const activeStatus = payload.is_active
      showToast(
        'success',
        isEdit
          ? activeStatus
            ? 'Changes saved — tour is live.'
            : 'Changes saved — tour is still in Draft (not visible on site).'
          : activeStatus
            ? 'Itinerary created and live on the website.'
            : 'Itinerary created as Draft — toggle to Live to publish it.'
      )
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
        background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/itineraries')}>
          <ArrowLeft size={13} /> Back
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 16, fontWeight: 600 }}>
              {isEdit ? `Editing: ${form.title || 'Untitled'}` : 'New Itinerary'}
            </h1>
            {isEdit && id && (
              <span className="mono badge badge-purple" style={{ fontSize: 11 }}>
                HOP-{String(id).padStart(4, '0')}
              </span>
            )}
          </div>
          {form.slug && (
            <p className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              /{form.slug}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
              background: form.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              border: `1.5px solid ${form.is_active ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: form.is_active ? 'var(--green)' : '#f59e0b', flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: form.is_active ? 'var(--green)' : '#92400e', fontFamily: 'DM Mono' }}>
              {form.is_active ? 'LIVE' : 'DRAFT — click to publish'}
            </span>
          </button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</>
            : <><Save size={13} /> Save</>}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {TABS.map(t => (
          <button
            key={t} type="button" onClick={() => setTab(t)}
            style={{
              padding: '12px 20px', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--purple)' : '2px solid transparent',
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 780 }}>

          {/* Draft warning banner */}
          {!form.is_active && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 10, marginBottom: 20,
            }}>
              <span style={{ fontSize: 18 }}>&#9888;&#65039;</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                  This itinerary is in Draft
                </p>
                <p style={{ fontSize: 12, color: '#b45309' }}>
                  It is NOT visible on the website or app. Toggle{' '}
                  <strong>"DRAFT — click to publish"</strong>{' '}
                  in the top bar to make it live.
                </p>
              </div>
              <button
                type="button"
                onClick={() => set('is_active', true)}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none',
                  background: '#f59e0b', color: 'white', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
                }}
              >
                Publish now
              </button>
            </div>
          )}

          {/* ── BASICS ─────────────────────────────────────────── */}
          {tab === 'Basics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Title" required>
                  <input
                    type="text"
                    className="field"
                    value={form.title}
                    onChange={e => handleTitleChange(e.currentTarget.value)}
                    placeholder="Of Rains, Rivers and Root Bridges"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Slug (URL path)" required hint="Used in URL: hoppity.in/itinerary/your-slug">
                  <input
                    type="text"
                    className="field mono"
                    value={form.slug}
                    onChange={e => { setSlugManual(true); set('slug', e.currentTarget.value) }}
                    placeholder="rains-rivers-root-bridges"
                    style={{ fontSize: 13 }}
                    autoComplete="off"
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Location" hint="Display text, e.g. Meghalaya or Meghalaya and Assam">
                  <input
                    type="text"
                    className="field"
                    value={form.location}
                    onChange={e => set('location', e.currentTarget.value)}
                    placeholder="Meghalaya"
                    autoComplete="off"
                  />
                </Field>
                <Field label="State" hint="Primary state for filtering">
                  <select className="field" value={form.state} onChange={e => set('state', e.currentTarget.value)}>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Category">
                  <select className="field" value={form.category} onChange={e => set('category', e.currentTarget.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select className="field" value={form.difficulty} onChange={e => set('difficulty', e.currentTarget.value)}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Tag / Badge" hint="e.g. Monsoon Special">
                  <input
                    type="text"
                    className="field"
                    value={form.tag}
                    onChange={e => set('tag', e.currentTarget.value)}
                    placeholder="Signature Journey"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Search Tags" hint="Keywords travellers search for — press Enter after each">
                  <ArrayField
                    values={form.search_tags}
                    onChange={setSearchTags}
                    placeholder="monsoon, northeast india, root bridges..."
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Duration" hint="e.g. 6D / 5N">
                  <input
                    type="text"
                    className="field"
                    value={form.duration}
                    onChange={e => {
                      set('duration', e.currentTarget.value)
                      set('duration_display', e.currentTarget.value)
                    }}
                    placeholder="6D / 5N"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Duration (display)" hint="Overrides above in UI">
                  <input
                    type="text"
                    className="field"
                    value={form.duration_display}
                    onChange={e => set('duration_display', e.currentTarget.value)}
                    placeholder="6 Days / 5 Nights"
                    autoComplete="off"
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Price (display text)" hint="e.g. Rs 18,000 or Price On Request">
                  <input
                    type="text"
                    className="field"
                    value={form.price}
                    onChange={e => set('price', e.currentTarget.value)}
                    placeholder="Price On Request"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Price per person (Rs)" hint="Leave blank for On Request">
                  <input
                    type="number"
                    className="field"
                    value={form.price_per_person}
                    onChange={e => set('price_per_person', e.currentTarget.value)}
                    placeholder="18000"
                    min="0"
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Min group size">
                  <input
                    type="number"
                    className="field"
                    value={form.min_group_size}
                    onChange={e => set('min_group_size', e.currentTarget.value)}
                    min="1"
                  />
                </Field>
                <Field label="Max group size">
                  <input
                    type="number"
                    className="field"
                    value={form.max_group_size}
                    onChange={e => set('max_group_size', e.currentTarget.value)}
                    min="1"
                  />
                </Field>
              </div>

            </div>
          )}

          {/* ── CONTENT ────────────────────────────────────────── */}
          {tab === 'Content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <Field label="Blurb" hint="1-2 sentence description shown on listing cards">
                <textarea
                  className="field"
                  value={form.blurb}
                  onChange={e => set('blurb', e.currentTarget.value)}
                  rows={3}
                  placeholder="A monsoon journey through the Khasi Hills..."
                />
              </Field>

              <Field label="Route" hint="Arrow-separated journey path">
                <input
                  type="text"
                  className="field"
                  value={form.route}
                  onChange={e => set('route', e.currentTarget.value)}
                  placeholder="Guwahati to Sohra to Shillong to Guwahati"
                  autoComplete="off"
                />
              </Field>

              <Field label="City Stops" hint="e.g. 2N Sohra, 1N Shillong">
                <ArrayField
                  values={form.city_stops}
                  onChange={setCityStops}
                  placeholder="Add stop (e.g. 2N Sohra)"
                />
              </Field>

              <Field label="Meeting Point">
                <input
                  type="text"
                  className="field"
                  value={form.meeting_point}
                  onChange={e => set('meeting_point', e.currentTarget.value)}
                  placeholder="Guwahati Airport, Gate 2"
                  autoComplete="off"
                />
              </Field>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <p className="section-label" style={{ marginBottom: 16 }}>Lists</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <Field label="Highlights">
                    <ArrayField values={form.highlights} onChange={setHighlights} placeholder="Add highlight" />
                  </Field>
                  <Field label="Inclusions">
                    <ArrayField values={form.inclusions} onChange={setInclusions} placeholder="Add inclusion" />
                  </Field>
                  <Field label="Exclusions">
                    <ArrayField values={form.exclusions} onChange={setExclusions} placeholder="Add exclusion" />
                  </Field>
                  <Field label="Tips">
                    <ArrayField values={form.tips} onChange={setTips} placeholder="Add travel tip" />
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
                  Upload images from your device or enter an image URL directly.
                  The first image will be used as the listing cover photo.
                </p>
                <MediaUpload label="Photos" multiple value={form.images} onChange={setImages} accept="image/*" />
              </div>

              <div>
                <p className="section-label" style={{ marginBottom: 12 }}>Cover Image Override</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Override which image is used as the cover. By default, the first photo is the cover.
                </p>
                <MediaUpload label="Cover" multiple={false} value={form.cover_image_url} onChange={setCoverImg} accept="image/*" />
              </div>

              <div>
                <p className="section-label" style={{ marginBottom: 12 }}>Video</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Used in the app feed. Upload an MP4 or paste a URL.
                </p>
                <MediaUpload label="Video" multiple={false} value={form.video_url} onChange={setVideoUrl} accept="video/*" />
                <div style={{ marginTop: 12 }}>
                  <Label>Or enter video URL directly</Label>
                  <input
                    type="text"
                    className="field"
                    value={form.video_url}
                    onChange={e => set('video_url', e.currentTarget.value)}
                    placeholder="https://..."
                    autoComplete="off"
                  />
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
              <DayBuilder days={form.itinerary_days} onChange={setItinerary} />
            </div>
          )}

          {/* ── VENDOR (INTERNAL ONLY) ─────────────────────────── */}
          {tab === 'Vendor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{
                padding: '12px 16px', background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>&#128274;</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>Internal use only</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Vendor details are never shown on the public website or app. Visible to admins only.
                  </p>
                </div>
              </div>

              <Field label="Vendor / Operator Name" hint="The ground operator or tour company running this itinerary">
                <input
                  type="text"
                  className="field"
                  value={form.vendor_name}
                  onChange={e => set('vendor_name', e.currentTarget.value)}
                  placeholder="e.g. Northeast Trails Pvt. Ltd."
                  autoComplete="off"
                />
              </Field>

              <Field label="Vendor Contact" hint="Phone (digits only, max 10)">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="field"
                  value={form.vendor_contact}
                  onChange={e => setVendorContact(e.currentTarget.value)}
                  placeholder="e.g. 9876543210"
                  autoComplete="off"
                />
              </Field>

              <Field label="Internal Notes" hint="Cost price, margin, SLAs, special instructions">
                <textarea
                  className="field"
                  value={form.vendor_notes}
                  onChange={e => set('vendor_notes', e.currentTarget.value)}
                  rows={5}
                  placeholder="e.g. Cost Rs 12,000/pax. Margin 30%. Min 4 pax to run."
                />
              </Field>

              <Field label="Guide ID (Supabase UUID)" hint="Links to Host_details table — optional">
                <input
                  type="text"
                  className="field mono"
                  value={form.guide_id}
                  onChange={e => set('guide_id', e.currentTarget.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={{ fontSize: 12 }}
                  autoComplete="off"
                />
              </Field>

              {isEdit && id && (
                <div className="card" style={{ padding: 16 }}>
                  <p className="section-label" style={{ marginBottom: 12 }}>Unique Identifiers</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      ['Hoppity ID',  <span className="mono badge badge-purple" style={{ fontSize: 13 }}>HOP-{String(id).padStart(4, '0')}</span>],
                      ['Database ID', <span className="mono" style={{ fontSize: 12 }}>{id}</span>],
                      ['URL Slug',    <span className="mono" style={{ fontSize: 12, color: 'var(--purple-light)' }}>{form.slug}</span>],
                      ['Public URL',  <a href={`https://www.hoppity.in/itinerary/${form.slug}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: 'var(--purple-light)', fontFamily: 'DM Mono', textDecoration: 'none' }}>
                          hoppity.in/itinerary/{form.slug}
                        </a>],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lbl}</span>
                        {val}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

    </form>
  )
}
