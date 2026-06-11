import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusCircle, Search, Pencil, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, ExternalLink, Filter, BedDouble
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ── Filter constants ───────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  'All', 'Hotel', 'Hostel', 'Guesthouse', 'Homestay', 'Villa', 'Resort',
  'Treehouse', 'Heritage Hotel', 'Boutique Hotel', 'Eco Lodge',
  'Beach Villa', 'Jungle Lodge', 'Tent / Glamping',
]
const STAY_CATEGORIES = ['All', 'budget', 'signature', 'flagship']

// ── Category badge colours — same lookup as StayForm ─────────────────────────
const CAT_STYLE = {
  flagship:  { bg: 'rgba(196,163,90,0.15)', color: '#92400e',       border: 'rgba(196,163,90,0.35)' },
  signature: { bg: 'rgba(124,58,237,0.12)', color: 'var(--purple)', border: 'rgba(124,58,237,0.3)'  },
  budget:    { bg: 'rgba(16,185,129,0.12)', color: 'var(--green)',  border: 'rgba(16,185,129,0.3)'  },
}

export default function StayList() {
  const { user } = useAuth()

  const [rows,         setRows]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState('All')
  const [catFilter,    setCatFilter]    = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortCol,      setSortCol]      = useState('created_at')
  const [sortAsc,      setSortAsc]      = useState(false)
  const [deleting,     setDeleting]     = useState(null)
  const [toggling,     setToggling]     = useState(null)
  const [showFilters,  setShowFilters]  = useState(false)

  // ── load — selects ONLY columns that exist in the schema ─────────────────
  // Schema columns available: id, name, location, price_per_night,
  //   property_type, owner_id, status, created_at, description, address,
  //   meals_included, checkin_time, checkout_time, cancellation_policy,
  //   pet_policy, amenities, property_category, cover_image_url,
  //   images_url, is_active
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('Properties')
      .select(
        'id, name, location, property_type, property_category, ' +
        'price_per_night, is_active, cover_image_url, images_url, ' +
        'amenities, created_at, stay_code'
      )
      .order(sortCol, { ascending: sortAsc })

    if (error) {
      setLoadError(error.message)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }, [sortCol, sortAsc])

  useEffect(() => { load() }, [load])

  // ── client-side filter ───────────────────────────────────────────────────
  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.name?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q)
    const matchType   = typeFilter === 'All' || r.property_type     === typeFilter
    const matchCat    = catFilter  === 'All' || r.property_category === catFilter
    const matchStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' ? r.is_active === true : r.is_active === false)
    return matchSearch && matchType && matchCat && matchStatus
  })

  // ── sort ─────────────────────────────────────────────────────────────────
  const handleSort = col => {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  // ── toggleActive — writes is_active boolean ──────────────────────────────
  const toggleActive = async (row) => {
    setToggling(row.id)
    const newActive = !row.is_active
    const { error } = await supabase
      .from('Properties')
      .update({ is_active: newActive })
      .eq('id', row.id)

    if (error) {
      console.error('Failed to toggle stay active state:', error)
      setToggling(null)
      return
    }
    try {
      await supabase.from('Admin_logs').insert({
        admin_email:  user.email,
        action:       'toggle_active',
        entity_type:  'property',
        entity_id:    String(row.id),
        entity_title: row.name,
        changes:      { is_active: newActive },
      })
    } catch (_) { /* ignore */ }

    setRows(prev => prev.map(r =>
      r.id === row.id ? { ...r, is_active: newActive } : r
    ))
    setToggling(null)
  }

  // ── deleteRow ─────────────────────────────────────────────────────────────
  const deleteRow = async (row) => {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return
    setDeleting(row.id)
    await supabase.from('Properties').delete().eq('id', row.id)
    try {
      await supabase.from('Admin_logs').insert({
        admin_email:  user.email,
        action:       'delete',
        entity_type:  'property',
        entity_id:    String(row.id),
        entity_title: row.name,
      })
    } catch (_) { /* ignore */ }
    setRows(prev => prev.filter(r => r.id !== row.id))
    setDeleting(null)
  }

  // ── table helpers ─────────────────────────────────────────────────────────
  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>↕</span>
    return sortAsc
      ? <ChevronUp   size={11} style={{ marginLeft: 4, color: 'var(--purple-light)' }} />
      : <ChevronDown size={11} style={{ marginLeft: 4, color: 'var(--purple-light)' }} />
  }

  const ThBtn = ({ col, children }) => (
    <th
      onClick={() => handleSort(col)}
      style={{
        padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
        color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase',
        letterSpacing: '0.08em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      }}
    >
      {children}<SortIcon col={col} />
    </th>
  )

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BedDouble size={20} style={{ color: 'var(--purple-light)' }} /> Stays
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {filtered.length} of {rows.length} properties
          </p>
        </div>
        <Link to="/stays/new" style={{ textDecoration: 'none' }}>
          <button className="btn btn-primary">
            <PlusCircle size={14} /> New Stay
          </button>
        </Link>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or location…"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowFilters(f => !f)}
          style={{ borderColor: showFilters ? 'var(--border-active)' : undefined }}
        >
          <Filter size={13} /> Filters {showFilters ? '▲' : '▼'}
        </button>

        {['All', 'Active', 'Draft'].map(s => (
          <button key={s} className="btn btn-ghost btn-sm"
            onClick={() => setStatusFilter(s)}
            style={{
              borderColor: statusFilter === s ? 'var(--border-active)' : undefined,
              color:       statusFilter === s ? 'var(--text)'          : undefined,
            }}
          >{s}</button>
        ))}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 16, padding: 16,
          background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
        }}>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STAY_CATEGORIES.map(c => (
                <button key={c} className="btn btn-ghost btn-sm" onClick={() => setCatFilter(c)}
                  style={{
                    borderColor: catFilter === c ? 'var(--border-active)' : undefined,
                    color:       catFilter === c ? 'var(--text)'          : undefined,
                  }}
                >
                  {c === 'All' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Property Type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PROPERTY_TYPES.map(t => (
                <button key={t} className="btn btn-ghost btn-sm" onClick={() => setTypeFilter(t)}
                  style={{
                    borderColor: typeFilter === t ? 'var(--border-active)' : undefined,
                    color:       typeFilter === t ? 'var(--text)'          : undefined,
                  }}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>

        ) : loadError ? (
          <div style={{ padding: 60, textAlign: 'center', fontSize: 14 }}>
            <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Failed to load stays</p>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono', fontSize: 12 }}>{loadError}</p>
            <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginTop: 16 }}>↻ Retry</button>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No stays match your filters.
          </div>

        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <ThBtn col="id">ID</ThBtn>
                  <ThBtn col="name">Name</ThBtn>
                  <ThBtn col="location">Location</ThBtn>
                  <ThBtn col="property_category">Category</ThBtn>
                  <ThBtn col="property_type">Type</ThBtn>
                  <ThBtn col="price_per_night">Price / Night</ThBtn>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    Amenities
                  </th>
                  <ThBtn col="is_active">Status</ThBtn>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >

                    {/* ID */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--purple-light)', fontWeight: 600 }}>
                        {row.stay_code || `STAY-${String(row.id).slice(-4).toUpperCase()}`}
                      </span>
                    </td>

                    {/* Name + cover thumbnail */}
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {row.cover_image_url || row.images_url ? (
                          <img
                            src={row.cover_image_url || row.images_url}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                            background: 'var(--surface-2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <BedDouble size={14} style={{ color: 'var(--text-dim)' }} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {row.name}
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                            {row.location || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {row.location || '—'}
                    </td>

                    {/* Category badge */}
                    <td style={{ padding: '12px 16px' }}>
                      {row.property_category && CAT_STYLE[row.property_category] ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px',
                          borderRadius: 100, fontFamily: 'DM Mono',
                          background: CAT_STYLE[row.property_category].bg,
                          color:      CAT_STYLE[row.property_category].color,
                          border:    `1px solid ${CAT_STYLE[row.property_category].border}`,
                        }}>
                          {row.property_category.toUpperCase()}
                        </span>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Property type */}
                    <td style={{ padding: '12px 16px' }}>
                      {row.property_type
                        ? <span className="badge badge-purple">{row.property_type}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Price per night */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: 12, color: row.price_per_night > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                        {row.price_per_night > 0
                          ? `₹${Number(row.price_per_night).toLocaleString('en-IN')}`
                          : 'On Request'}
                      </span>
                    </td>

                    {/* Amenities — first 3 pills + overflow count */}
                    <td style={{ padding: '12px 16px' }}>
                      {Array.isArray(row.amenities) && row.amenities.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 160 }}>
                          {row.amenities.slice(0, 3).map(a => (
                            <span key={a} className="badge badge-green" style={{ fontSize: 9 }}>{a}</span>
                          ))}
                          {row.amenities.length > 3 && (
                            <span className="badge" style={{ fontSize: 9, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                              +{row.amenities.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    {/* Status + quick publish */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge ${row.is_active ? 'badge-green' : 'badge-amber'}`}>
                          {row.is_active ? '● Live' : '○ Draft'}
                        </span>
                        {!row.is_active && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleActive(row)}
                            disabled={toggling === row.id}
                            title="Publish this stay"
                            style={{ padding: '2px 8px', fontSize: 10, color: 'var(--green)', borderColor: 'rgba(16,185,129,0.3)' }}
                          >
                            {toggling === row.id ? '…' : 'Publish'}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>

                        <a
                          href={`https://www.hoppity.in/stays/${row.property_category}/${row.id}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: 'var(--text-muted)', display: 'flex' }}
                          title="View on website"
                        >
                          <ExternalLink size={13} />
                        </a>

                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleActive(row)}
                          disabled={toggling === row.id}
                          title={row.is_active ? 'Set to Draft' : 'Set to Live'}
                          style={{ padding: '4px 8px' }}
                        >
                          {toggling === row.id
                            ? <div className="spinner" style={{ width: 12, height: 12 }} />
                            : row.is_active ? <EyeOff size={12} /> : <Eye size={12} />
                          }
                        </button>

                        <Link to={`/stays/${row.id}/edit`} style={{ textDecoration: 'none' }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Edit">
                            <Pencil size={12} />
                          </button>
                        </Link>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteRow(row)}
                          disabled={deleting === row.id}
                          style={{ padding: '4px 8px' }}
                          title="Delete"
                        >
                          {deleting === row.id
                            ? <div className="spinner" style={{ width: 12, height: 12 }} />
                            : <Trash2 size={12} />
                          }
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}