import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import MediaUpload from '../components/MediaUpload'

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = ['Basics', 'Media', 'Policies', 'Details']

const STAY_CATEGORIES = [
  { value: 'budget',    label: '🎒 Budget',    desc: 'Hostels, guesthouses, homestays' },
  { value: 'signature', label: '🏡 Signature', desc: 'Boutique, treehouses, heritage' },
  { value: 'flagship',  label: '✦ Flagship',   desc: "Hoppity's most iconic, personally vetted" },
]

const PROPERTY_TYPES = [
  'Hotel', 'Hostel', 'Guesthouse', 'Homestay', 'Villa', 'Resort',
  'Treehouse', 'Heritage Hotel', 'Boutique Hotel', 'Eco Lodge',
  'Beach Villa', 'Jungle Stay', 'Estate Stay', 'Palace', 'Tent / Glamping',
]

const AMENITY_OPTIONS = [
  'Wifi', 'Pool', 'Spa', 'AC', 'Parking', 'Bonfire', 'All meals',
  'Breakfast', 'Fine Dining', 'Safari', 'Beach access', 'Nature walks',
  'Snorkelling', 'Dive centre', 'Heritage tour', 'Library', 'Gym',
  'Rooftop bar', 'Pet friendly', 'Airport transfer',
]

// ── Time helpers ───────────────────────────────────────────────────────────────
// Postgres `time without time zone` expects "HH:MM:SS".
// <input type="time"> gives "HH:MM" (24h) — convert on save, reverse on load.

function toPostgresTime(str) {
  if (!str?.trim()) return null
  // Already HH:MM or HH:MM:SS from <input type="time">
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str.trim())) {
    const parts = str.trim().split(':')
    return `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2] ?? '00'}`
  }
  // Legacy AM/PM format fallback
  const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let h = parseInt(match[1], 10)
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && h !== 12) h += 12
  if (meridiem === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${match[2]}:00`
}

// FIX #3: Return "HH:MM" (24h) so it's compatible with <input type="time">
function fromPostgresTime(str) {
  if (!str) return ''
  const [h, m] = str.split(':').map(Number)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Images parse helper ───────────────────────────────────────────────────────
// Parse images_url back into an array — handles:
//   • a real Postgres text[] (already an array)
//   • a JSON-encoded array string  e.g. '["a.jpg","b.jpg"]'
//   • an unquoted bracket string   e.g. '[a.jpg, b.jpg]'
//   • a comma-separated string     e.g. 'a.jpg, b.jpg'
//   • a single URL string
function parseImagesUrl(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  const t = String(val).trim()
  if (!t) return []
  if (t.startsWith('[')) {
    try {
      const p = JSON.parse(t)
      if (Array.isArray(p)) return p.filter(Boolean)
    } catch { /* fall through */ }
  }
  // strip stray surrounding brackets, then split + de-quote
  const inner = t.startsWith('[') && t.endsWith(']') ? t.slice(1, -1) : t
  return inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
}

// ── Maps link validation ─────────────────────────────────────────────────────
// Optional field, but if filled it must be a real http(s) link.
function isValidMapsLink(str) {
  if (!str?.trim()) return true            // empty is allowed
  try {
    const u = new URL(str.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false                           // not a parseable URL
  }
}

// ── STAY code generator ────────────────────────────────────────────────────────
// Format: STAY-{3 letters}-{4-digit sequence}  e.g. STAY-TTL-0001
// Rule: take consonants first; if < 3, fill from all letters; pad with X.

function tStayInitials(name) {
  const letters   = name.toUpperCase().replace(/[^A-Z]/g, '')
  const consonants = letters.replace(/[AEIOU]/g, '')
  return (consonants + letters + 'XXX').slice(0, 3)
}

async function generateStayCode(name) {
  const initials = tStayInitials(name.trim())
  const { data, error } = await supabase
    .from('Properties')
    .select('stay_code')
    .not('stay_code', 'is', null)
    .order('stay_code', { ascending: false })
    .limit(1)
  let nextNum = 1
  if (!error && data?.length > 0 && data[0].stay_code) {
    const match = data[0].stay_code.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  return `STAY-${initials}-${String(nextNum).padStart(4, '0')}`
}

// ── EMPTY state ────────────────────────────────────────────────────────────────

const EMPTY = {
  name:                '',
  description:         '',
  property_type:       '',
  property_category:   'signature',
  location:            '',
  address:             '',
  maps_url:            '',
  price_per_night:     '',
  amenities:           [],
  cover_image_url:     '',
  images_url:          '',
  meals_included:      '',
  checkin_time:        '',
  checkout_time:       '',
  cancellation_policy: '',
  pet_policy:          '',
  owner_id:            null,
  is_active:           false,
  stay_code:            '',
  // UI only — never sent to DB
  images_arr:          [],
}

// ── Label / Field — MODULE SCOPE so React never remounts inputs on re-render ──

const Label = ({ children, required }) => (
  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--text-muted)', marginBottom:6 }}>
    {children}{required && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}
  </label>
)

const Field = ({ label, required, hint, children }) => (
  <div>
    {label && <Label required={required}>{label}</Label>}
    {children}
    {hint && <p style={{ marginTop:5, fontSize:11, color:'var(--text-dim)' }}>{hint}</p>}
  </div>
)

// ── Category badge colours lookup ─────────────────────────────────────────────
const CAT_STYLE = {
  flagship:  { bg:'rgba(196,163,90,0.15)', color:'#92400e',       border:'rgba(196,163,90,0.35)' },
  signature: { bg:'rgba(124,58,237,0.12)', color:'var(--purple)',  border:'rgba(124,58,237,0.3)'  },
  budget:    { bg:'rgba(16,185,129,0.12)', color:'var(--green)',   border:'rgba(16,185,129,0.3)'  },
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StayForm() {
  const { id }   = useParams()
  const isEdit   = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab,     setTab]     = useState('Basics')
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)
  // FIX #4: Store UUID as plain string — never coerce to Number
  const [dbId,    setDbId]    = useState(id || null)

  // ── Load existing row (edit mode) ────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    supabase.from('Properties').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) console.error('Load error:', error)
        if (data) {
          // Parse the full image array so edit mode restores ALL images
          const imgs = parseImagesUrl(data.images_url)
          setForm({
            ...EMPTY,
            ...data,
            price_per_night: data.price_per_night ? String(data.price_per_night) : '',
            amenities:       Array.isArray(data.amenities) ? data.amenities : [],
            // FIX #3: fromPostgresTime now returns "HH:MM" for <input type="time">
            checkin_time:    fromPostgresTime(data.checkin_time),
            checkout_time:   fromPostgresTime(data.checkout_time),
            images_arr:      imgs,
            images_url:      imgs[0] || '',
            cover_image_url: data.cover_image_url || imgs[0] || '',
            stay_code:       data.stay_code || '',
            maps_url:        data.maps_url || '',
          })
          // FIX #4: Always store as string UUID
          setDbId(String(data.id))
        }
        setLoading(false)
      })
  }, [id, isEdit])

  // ── Generic field setter ─────────────────────────────────────────────────
  const set = useCallback((field, val) =>
    setForm(f => ({ ...f, [field]: val })), [])

  // ── Amenity toggle ───────────────────────────────────────────────────────
  const toggleAmenity = useCallback((a) =>
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter(x => x !== a)
        : [...f.amenities, a],
    })), [])

  // ── Image handlers ───────────────────────────────────────────────────────
  // images_arr holds the FULL list of uploaded URLs (this is what gets saved).
  // images_url here is kept as the first URL for the inline preview only.
  const handleImagesChange = useCallback((urls) =>
    setForm(f => ({
      ...f,
      images_arr:      urls,
      images_url:      urls[0] ?? '',
      cover_image_url: f.cover_image_url || urls[0] || '',
    })), [])

  const handleCoverChange = useCallback((url) =>
    setForm(f => ({ ...f, cover_image_url: url })), [])

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── ensureDraftRow ───────────────────────────────────────────────────────
  // FIX #1: Added created_at to satisfy NOT NULL constraint
  // FIX #2: Guard against missing user / FK violation
  const ensureDraftRow = useCallback(async () => {
    if (dbId) return dbId
    if (!form.name?.trim()) return null
    if (!user?.id) {
      showToast('error', 'You must be logged in to save a property.')
      return null
    }
    try {
      const code = await generateStayCode(form.name.trim())
      const { data, error } = await supabase
        .from('Properties')
        .insert({
          name:              form.name.trim(),
          property_category: form.property_category || 'signature',
          is_active:         false,
          amenities:         [],
          owner_id:          user.id,
          created_at:        new Date().toISOString(),
          stay_code:         code,
        })
        .select('id, stay_code')
        .single()
      if (error) throw error
      setDbId(String(data.id))
      set('stay_code', data.stay_code)
      return String(data.id)
    } catch (e) {
      console.error('ensureDraftRow failed:', e)
      showToast('error', `Failed to create draft: ${e.message}`)
      return null
    }
  }, [dbId, form.name, form.property_category, user, showToast])

  // ── togglePublish ────────────────────────────────────────────────────────
  const togglePublish = useCallback(async () => {
    // FIX #2: Guard against unauthenticated user
    if (!user?.id) {
      showToast('error', 'You must be logged in to publish.')
      return
    }
    const newActive = !form.is_active
    set('is_active', newActive)
    try {
      let currentId = dbId || id
      if (!currentId) currentId = await ensureDraftRow()
      if (!currentId) throw new Error('Save the property name first before publishing.')

      // FIX #4: Use UUID string directly — no Number() coercion
      const { error } = await supabase
        .from('Properties')
        .update({ is_active: newActive })
        .eq('id', currentId)
      if (error) throw error

      if (currentId !== dbId) setDbId(String(currentId))
      showToast('success', newActive ? 'Property is now LIVE' : 'Property moved to Draft')
    } catch (err) {
      set('is_active', !newActive)   // revert on failure
      showToast('error', err.message)
    }
  }, [dbId, ensureDraftRow, form.is_active, id, set, showToast, user])

  // ── Validation ─────────────────────────────────────────────────────────
  const validateForm = () => {
    // FIX #2: Require logged-in user before allowing save
    if (!user?.id)
      return { valid:false, error:'You must be logged in to save a property.', tab:'Basics' }
    if (!form.name?.trim())
      return { valid:false, error:'Property name is required', tab:'Basics' }
    if (!form.property_category)
      return { valid:false, error:'Select a category', tab:'Basics' }
    if (form.price_per_night && isNaN(parseFloat(form.price_per_night)))
      return { valid:false, error:'Price per night must be a number', tab:'Basics' }
    if (form.maps_url?.trim() && !isValidMapsLink(form.maps_url))
      return { valid:false, error:'Google Maps link must be a valid URL (https://…)', tab:'Basics' }
    return { valid:true }
  }

  // ── handleSave — upsert logic ─────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    const validation = validateForm()
    if (!validation.valid) {
      setTab(validation.tab)
      showToast('error', validation.error)
      return
    }

    setSaving(true)
    try {
      // FIX #4: Use dbId or id as plain string UUID
      const currentId = dbId || id || null

      const payload = {
        name:                form.name.trim(),
        description:         form.description?.trim()         || null,
        property_type:       form.property_type               || null,
        property_category:   form.property_category           || 'signature',
        location:            form.location?.trim()            || null,
        address:             form.address?.trim()             || null,
        maps_url:            form.maps_url?.trim()             || null,
        price_per_night:     form.price_per_night
        ? parseFloat(form.price_per_night) : null,
        amenities:           form.amenities,
        cover_image_url:     form.cover_image_url             || null,
        // Persist the FULL image array as JSON so every uploaded image is saved
        images_url:          form.images_arr?.length ? JSON.stringify(form.images_arr) : null,
        meals_included:      form.meals_included?.trim()      || null,
        cancellation_policy: form.cancellation_policy?.trim() || null,
        pet_policy:          form.pet_policy?.trim()          || null,
        checkin_time:        toPostgresTime(form.checkin_time),
        checkout_time:       toPostgresTime(form.checkout_time),
        is_active:           form.is_active,
        // FIX #2: Always use the real user id — never null for a logged-in user
        owner_id:            user.id,
      }

      // Never write DB-managed columns back
      delete payload.id
      delete payload.updated_at

      let savedId = currentId

      if (currentId) {
        // UPDATE existing row — no created_at needed
        const { error } = await supabase
          .from('Properties')
          .update(payload)
          .eq('id', currentId)
        if (error) throw error
      } else {
        // INSERT new row — generate STAY code and supply created_at
        const code = await generateStayCode(form.name.trim())
        const { data, error } = await supabase
          .from('Properties')
          .insert({ ...payload, created_at: new Date().toISOString(), stay_code: code })
          .select('id, stay_code')
          .single()
        if (error) throw error
        savedId = String(data.id)
        setDbId(savedId)
        set('stay_code', data.stay_code)
      }

      // Admin log — silent fail if table absent
      try {
        await supabase.from('Admin_logs').insert({
          admin_email:  user?.email,
          action:       isEdit ? 'update' : 'create',
          entity_type:  'property',
          entity_id:    String(savedId),
          entity_title: form.name,
          changes:      payload,
        })
      } catch (_) { /* ignore */ }

      showToast('success',
        isEdit
          ? payload.is_active
            ? 'Changes saved — property is live.'
            : 'Changes saved — property is still in Draft.'
          : payload.is_active
            ? 'Property created and live on the website.'
            : 'Property created as Draft — toggle to publish.',
      )
      if (!isEdit) setTimeout(() => navigate(`/stays/${savedId}/edit`), 1200)
    } catch (err) {
      console.error('Save error:', err)
      showToast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', height:'100vh' }}>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:100,
          display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderRadius:10,
          background: toast.type==='success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border:`1px solid ${toast.type==='success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
          color: toast.type==='success' ? 'var(--green)' : 'var(--red)',
          fontSize:13, fontWeight:500, boxShadow:'0 4px 24px rgba(0,0,0,0.3)', maxWidth:360,
        }}>
          {toast.type==='success' ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:16, padding:'16px 32px',
        borderBottom:'1px solid var(--border)', background:'var(--surface)',
        position:'sticky', top:0, zIndex:10,
      }}>
        <button type="button" className="btn btn-ghost btn-sm"
          onClick={() => navigate('/stays')}>
          <ArrowLeft size={13}/> Back
        </button>

        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ fontSize:16, fontWeight:600 }}>
              {isEdit ? `Editing: ${form.name || 'Untitled'}` : 'New Stay'}
            </h1>

            {(form.code || dbId) && (
              <span className="mono badge badge-purple" style={{ fontSize:11, letterSpacing:'0.05em' }}>
                {form.code || '…'}
              </span>
            )}

            {form.property_category && CAT_STYLE[form.property_category] && (
              <span style={{
                fontSize:10, fontWeight:700, padding:'3px 10px',
                borderRadius:100, fontFamily:'DM Mono',
                background: CAT_STYLE[form.property_category].bg,
                color:      CAT_STYLE[form.property_category].color,
                border:    `1px solid ${CAT_STYLE[form.property_category].border}`,
              }}>
                {form.property_category.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Publish toggle */}
        <button type="button" onClick={togglePublish} style={{
          display:'flex', alignItems:'center', gap:8, padding:'6px 14px',
          borderRadius:8, cursor:'pointer', transition:'all 0.15s',
          background: form.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
          border:`1.5px solid ${form.is_active ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
        }}>
          <span style={{
            width:8, height:8, borderRadius:'50%', flexShrink:0,
            background: form.is_active ? 'var(--green)' : '#f59e0b',
          }}/>
          <span style={{
            fontSize:12, fontWeight:700, fontFamily:'DM Mono',
            color: form.is_active ? 'var(--green)' : '#92400e',
          }}>
            {form.is_active ? 'LIVE' : 'DRAFT — click to publish'}
          </span>
        </button>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? <><div className="spinner" style={{ width:14, height:14 }}/> Saving…</>
            : <><Save size={13}/> Save</>}
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', padding:'0 32px',
        borderBottom:'1px solid var(--border)', background:'var(--surface)',
      }}>
        {TABS.map(t => (
          <button key={t} type="button"
            onClick={async () => {
              if (t === 'Media' && !dbId && form.name?.trim()) await ensureDraftRow()
              setTab(t)
            }}
            style={{
              padding:'12px 20px', background:'none', border:'none', cursor:'pointer',
              borderBottom: tab===t ? '2px solid var(--purple)' : '2px solid transparent',
              fontSize:13, fontWeight: tab===t ? 600 : 400,
              color: tab===t ? 'var(--text)' : 'var(--text-muted)',
              fontFamily:'DM Sans, sans-serif', transition:'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* ── Form body ──────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
        <div style={{ maxWidth:780 }}>

          {/* Draft warning */}
          {!form.is_active && (
            <div style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
              borderRadius:10, marginBottom:20,
              background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)',
            }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#92400e', marginBottom:2 }}>
                  This property is in Draft
                </p>
                <p style={{ fontSize:12, color:'#b45309' }}>
                  It is NOT visible on the website or app. Toggle{' '}
                  <strong>"DRAFT — click to publish"</strong> in the top bar to make it live.
                </p>
              </div>
              <button type="button" onClick={togglePublish} style={{
                padding:'7px 14px', borderRadius:7, border:'none',
                background:'#f59e0b', color:'white', fontSize:12,
                fontWeight:700, cursor:'pointer', flexShrink:0,
              }}>Publish now</button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              BASICS TAB
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'Basics' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              <Field label="Category" required hint="Controls which section this appears in on the website">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:4 }}>
                  {STAY_CATEGORIES.map(cat => (
                    <button key={cat.value} type="button"
                      onClick={() => set('property_category', cat.value)}
                      style={{
                        padding:'12px 14px', borderRadius:10,
                        cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                        border: form.property_category===cat.value
                          ? '2px solid var(--purple)' : '1.5px solid var(--border)',
                        background: form.property_category===cat.value
                          ? 'rgba(124,58,237,0.06)' : 'var(--surface)',
                      }}
                    >
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:3 }}>
                        {cat.label}
                      </p>
                      <p style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>
                        {cat.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <Field label="Property name" required>
                  <input type="text" className="field"
                    value={form.name}
                    onChange={e => set('name', e.currentTarget.value)}
                    placeholder="Tiger Trail Lodge" autoComplete="off"
                  />
                </Field>
                <Field label="Property type">
                  <select className="field" value={form.property_type}
                    onChange={e => set('property_type', e.currentTarget.value)}>
                    <option value="">Select type…</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Location" hint="Display text e.g. Jim Corbett, Uttarakhand">
                <input type="text" className="field"
                  value={form.location}
                  onChange={e => set('location', e.currentTarget.value)}
                  placeholder="Jim Corbett, Uttarakhand" autoComplete="off"
                />
              </Field>

              {/* ── Google Maps link ──────────────────────────────────── */}
              <Field label="Google Maps link" hint="Paste the share link from Google Maps — must start with http:// or https://">
                <input type="url" className="field"
                  value={form.maps_url}
                  onChange={e => set('maps_url', e.currentTarget.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  autoComplete="off"
                  style={form.maps_url && !isValidMapsLink(form.maps_url)
                    ? { borderColor: 'var(--red)' }
                    : undefined}
                />
                {form.maps_url && !isValidMapsLink(form.maps_url) && (
                  <p style={{ marginTop:5, fontSize:11, color:'var(--red)' }}>
                    Enter a valid link starting with http:// or https://
                  </p>
                )}
              </Field>

              <Field label="Description" hint="Shown on the detail page — write 3–4 paragraphs.">
                <textarea className="field"
                  value={form.description}
                  onChange={e => set('description', e.currentTarget.value)}
                  rows={8}
                  placeholder="Describe the setting, rooms, food, activities, and what makes it special…"
                />
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <Field label="Price per night (₹)" hint="Leave blank for 'On Request'">
                  <input type="number" className="field"
                    value={form.price_per_night}
                    onChange={e => set('price_per_night', e.currentTarget.value)}
                    placeholder="14500" min="0"
                  />
                </Field>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              MEDIA TAB
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'Media' && (
            <div style={{ display:'flex', flexDirection:'column', gap:28 }}>

              {!dbId && !form.name?.trim() && (
                <div style={{
                  padding:'12px 16px', borderRadius:10, fontSize:13, color:'#92400e',
                  background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)',
                }}>
                  ⚠️ Add a property name on the Basics tab first — it's needed to save images immediately.
                </div>
              )}

              {form.name?.trim() && (
                <div style={{
                  padding:'10px 14px', borderRadius:8, fontSize:12, color:'var(--text-muted)',
                  background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.2)',
                }}>
                  📁 Files stored at:{' '}
                  <code style={{
                    fontFamily:'DM Mono', fontSize:12, color:'var(--purple-light)',
                    background:'rgba(124,58,237,0.08)', padding:'1px 6px', borderRadius:4,
                  }}>
                    propertymedia /{form.name.trim()} /
                  </code>
                </div>
              )}

              <div>
                <p className="section-label" style={{ marginBottom:12 }}>Photos</p>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16, lineHeight:1.5 }}>
                  Upload images from your device. All uploaded images are saved to the listing; the first image is used as the cover photo by default.
                </p>
                <MediaUpload
                  label="Photos" multiple
                  value={form.images_arr}
                  onChange={handleImagesChange}
                  accept="image/*"
                  bucket="propertymedia"
                  folder={`image/${form.name?.trim() || 'untitled'}`}
                  itineraryId={dbId}
                />
                {form.images_arr?.length > 0 && (
                  <div style={{
                    marginTop:10, padding:'8px 12px', borderRadius:7,
                    background:'var(--surface-alt)', border:'1px solid var(--border)',
                  }}>
                    <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4 }}>
                      {form.images_arr.length} image{form.images_arr.length > 1 ? 's' : ''} saved to <code>images_url</code>:
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {form.images_arr.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer"
                          style={{ fontSize:11, color:'var(--purple-light)', wordBreak:'break-all', fontFamily:'DM Mono' }}>
                          {i + 1}. {u}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="section-label" style={{ marginBottom:12 }}>Cover Image Override</p>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
                  Override which image is shown on listing cards. By default, the first photo is used.
                </p>
                <MediaUpload
                  label="Cover" multiple={false}
                  value={form.cover_image_url}
                  onChange={handleCoverChange}
                  accept="image/*"
                  bucket="propertymedia"
                  folder={`image/${form.name?.trim() || 'untitled'}`}
                  itineraryId={dbId}
                  isCover
                />
                {form.cover_image_url && (
                  <div style={{ marginTop:14 }}>
                    <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:8 }}>Cover preview:</p>
                    <img src={form.cover_image_url} alt="Cover preview"
                      style={{ width:'100%', maxWidth:360, height:200, objectFit:'cover', borderRadius:10, border:'1px solid var(--border)' }}
                    />
                    <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:6, fontFamily:'DM Mono', wordBreak:'break-all' }}>
                      {form.cover_image_url}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              POLICIES TAB
              FIX #3: type="time" inputs now work correctly because
              fromPostgresTime returns "HH:MM" (24h) format
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'Policies' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              <Field label="Full address" hint="Shown to guests after booking is confirmed">
                <textarea className="field"
                  value={form.address}
                  onChange={e => set('address', e.currentTarget.value)}
                  rows={3}
                  placeholder="Village Road, Jim Corbett Buffer Zone, Ramnagar, Uttarakhand 244715"
                />
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <Field label="Check-in time" hint="Select a time (e.g. 14:00 = 2:00 PM)">
                  <input type="time" className="field"
                    value={form.checkin_time}
                    onChange={e => set('checkin_time', e.currentTarget.value)}
                  />
                </Field>
                <Field label="Check-out time" hint="Select a time (e.g. 11:00 = 11:00 AM)">
                  <input type="time" className="field"
                    value={form.checkout_time}
                    onChange={e => set('checkout_time', e.currentTarget.value)}
                  />
                </Field>
              </div>

              <Field label="Meals included" hint="e.g. All meals, Breakfast only, No meals">
                <input type="text" className="field"
                  value={form.meals_included}
                  onChange={e => set('meals_included', e.currentTarget.value)}
                  placeholder="All meals included" autoComplete="off"
                />
              </Field>

              <Field label="Cancellation policy">
                <textarea className="field"
                  value={form.cancellation_policy}
                  onChange={e => set('cancellation_policy', e.currentTarget.value)}
                  rows={3}
                  placeholder="Free cancellation up to 7 days before check-in. 50% refund within 7–3 days…"
                />
              </Field>

              <Field label="Pet policy">
                <input type="text" className="field"
                  value={form.pet_policy}
                  onChange={e => set('pet_policy', e.currentTarget.value)}
                  placeholder="Pets not allowed" autoComplete="off"
                />
              </Field>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              DETAILS TAB
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'Details' && (
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

              <Field label="Amenities" hint="Tap to toggle — saved as a JSON array in the DB">
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                  {AMENITY_OPTIONS.map(a => {
                    const active = form.amenities.includes(a)
                    return (
                      <button key={a} type="button" onClick={() => toggleAmenity(a)}
                        style={{
                          padding:'7px 14px', borderRadius:100, fontSize:12,
                          cursor:'pointer', transition:'all 0.15s',
                          fontFamily:'DM Sans, sans-serif', fontWeight:500,
                          border:     active ? '1.5px solid var(--purple)' : '1.5px solid var(--border)',
                          background: active ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                          color:      active ? 'var(--purple)' : 'var(--text-muted)',
                        }}
                      >{active ? '✓ ' : ''}{a}</button>
                    )
                  })}
                </div>

                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <input type="text" id="custom-amenity" className="field"
                    placeholder="Add custom amenity…" autoComplete="off" style={{ flex:1 }}
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      const val = e.currentTarget.value.trim()
                      if (val && !form.amenities.includes(val)) {
                        toggleAmenity(val)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const inp = document.getElementById('custom-amenity')
                      const val = inp?.value?.trim()
                      if (val && !form.amenities.includes(val)) {
                        toggleAmenity(val)
                        inp.value = ''
                      }
                    }}>Add</button>
                </div>
              </Field>

              {dbId && (
                <div className="card" style={{ padding:16 }}>
                  <p className="section-label" style={{ marginBottom:12 }}>Identifiers</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      ['Hoppity ID',        <span className="mono badge badge-purple" style={{ fontSize:13, letterSpacing:'0.05em' }}>{form.code || '—'}</span>],
                      ['Database ID',      <span className="mono" style={{ fontSize:12 }}>{dbId}</span>],
                      ['Category',         <span className="mono" style={{ fontSize:12 }}>{form.property_category}</span>],
                      ['Status',           <span className="mono" style={{ fontSize:12 }}>{form.is_active ? 'LIVE' : 'Draft'}</span>],
                      ['Image count',      <span className="mono" style={{ fontSize:12 }}>{form.images_arr?.length || 0}</span>],
                      ['cover_image_url',  <span className="mono" style={{ fontSize:11, color:'var(--text-dim)', wordBreak:'break-all' }}>{form.cover_image_url || '—'}</span>],
                      ['maps_url',         <span className="mono" style={{ fontSize:11, color:'var(--text-dim)', wordBreak:'break-all' }}>{form.maps_url || '—'}</span>],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                        <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{lbl}</span>
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