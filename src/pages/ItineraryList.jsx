import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusCircle, Search, Pencil, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, ExternalLink, Filter
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CATEGORIES = ['All', 'Cultural', 'Wildlife', 'Adventure', 'Trekking', 'Heritage', 'Spiritual', 'Culinary']
const DIFFICULTIES = ['All', 'Easy', 'Moderate', 'Challenging']

export default function ItineraryList() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [diffFilter, setDiffFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All') // All | Active | Draft
  const [sortCol, setSortCol] = useState('id')
  const [sortAsc, setSortAsc] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('Itineraries')
      .select('id,title,slug,location,state,category,difficulty,duration,price,price_per_person,is_active,rating,review_count,cover_image_url,created_at,inclusions,exclusions,vendor_name,guide_id')
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

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.title?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q) || r.slug?.toLowerCase().includes(q)
    const matchCat = catFilter === 'All' || r.category === catFilter
    const matchDiff = diffFilter === 'All' || r.difficulty === diffFilter
    const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? r.is_active : !r.is_active)
    return matchSearch && matchCat && matchDiff && matchStatus
  })

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  const toggleActive = async (row) => {
    setToggling(row.id)
    await supabase.from('Itineraries').update({ is_active: !row.is_active }).eq('id', row.id)
    await supabase.from('Admin_logs').insert({
      admin_email: user.email,
      action: 'toggle_active',
      entity_type: 'itinerary',
      entity_id: String(row.id),
      entity_title: row.title,
      changes: { is_active: !row.is_active },
    }).catch(() => {})
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: !r.is_active } : r))
    setToggling(null)
  }

  const deleteRow = async (row) => {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return
    setDeleting(row.id)
    await supabase.from('Itineraries').delete().eq('id', row.id)
    await supabase.from('Admin_logs').insert({
      admin_email: user.email,
      action: 'delete',
      entity_type: 'itinerary',
      entity_id: String(row.id),
      entity_title: row.title,
    }).catch(() => {})
    setRows(prev => prev.filter(r => r.id !== row.id))
    setDeleting(null)
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>↕</span>
    return sortAsc
      ? <ChevronUp size={11} style={{ marginLeft: 4, color: 'var(--purple-light)' }} />
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

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Itineraries</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {filtered.length} of {rows.length} tours
          </p>
        </div>
        <Link to="/itineraries/new" style={{ textDecoration: 'none' }}>
          <button className="btn btn-primary">
            <PlusCircle size={14} /> New Itinerary
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
            placeholder="Search by title, location, slug…"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <button
          className={`btn btn-ghost btn-sm`}
          onClick={() => setShowFilters(f => !f)}
          style={{ borderColor: showFilters ? 'var(--border-active)' : undefined }}
        >
          <Filter size={13} /> Filters {showFilters ? '▲' : '▼'}
        </button>

        {/* Status quick toggle */}
        {['All', 'Active', 'Draft'].map(s => (
          <button
            key={s}
            className="btn btn-ghost btn-sm"
            onClick={() => setStatusFilter(s)}
            style={{
              borderColor: statusFilter === s ? 'var(--border-active)' : undefined,
              color: statusFilter === s ? 'var(--text)' : undefined,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 16,
          padding: 16, background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c} className="btn btn-ghost btn-sm" onClick={() => setCatFilter(c)}
                  style={{ borderColor: catFilter === c ? 'var(--border-active)' : undefined, color: catFilter === c ? 'var(--text)' : undefined }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Difficulty</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {DIFFICULTIES.map(d => (
                <button key={d} className="btn btn-ghost btn-sm" onClick={() => setDiffFilter(d)}
                  style={{ borderColor: diffFilter === d ? 'var(--border-active)' : undefined, color: diffFilter === d ? 'var(--text)' : undefined }}>
                  {d}
                </button>
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
            <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Failed to load itineraries</p>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono', fontSize: 12 }}>{loadError}</p>
            <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginTop: 16 }}>↻ Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No itineraries match your filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <ThBtn col="id">ID</ThBtn>
                  <ThBtn col="title">Title</ThBtn>
                  <ThBtn col="location">Location</ThBtn>
                  <ThBtn col="category">Category</ThBtn>
                  <ThBtn col="difficulty">Difficulty</ThBtn>
                  <ThBtn col="price">Price</ThBtn>
                  <ThBtn col="rating">Rating</ThBtn>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Inc/Exc</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Vendor</th>
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
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--purple-light)', fontWeight: 600 }}>
                        HOP-{String(row.id).padStart(4,'0')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {row.cover_image_url && (
                          <img src={row.cover_image_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {row.title}
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                            {row.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {row.location}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {row.category && <span className="badge badge-purple">{row.category}</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {row.difficulty && (
                        <span className={`badge ${row.difficulty === 'Easy' ? 'badge-green' : row.difficulty === 'Challenging' ? 'badge-red' : 'badge-amber'}`}>
                          {row.difficulty}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: 12, color: row.price_per_person > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                        {row.price_per_person > 0 ? `₹${Number(row.price_per_person).toLocaleString('en-IN')}` : 'On Request'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {row.rating > 0
                        ? <span style={{ fontSize: 12, color: 'var(--amber)' }}>★ {Number(row.rating).toFixed(1)}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                      }
                    </td>
                    {/* Inclusions / Exclusions count */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span className="badge badge-green" title="Inclusions">
                          +{row.inclusions?.length || 0}
                        </span>
                        <span className="badge badge-red" title="Exclusions">
                          −{row.exclusions?.length || 0}
                        </span>
                      </div>
                    </td>
                    {/* Vendor */}
                    <td style={{ padding: '12px 16px', maxWidth: 140 }}>
                      {row.vendor_name
                        ? <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{row.vendor_name}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                      }
                    </td>
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
                            title="Publish this itinerary to the website"
                            style={{ padding: '2px 8px', fontSize: 10, color: 'var(--green)', borderColor: 'rgba(16,185,129,0.3)' }}
                          >
                            {toggling === row.id ? '…' : 'Publish'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {/* Preview on website */}
                        <a
                          href={`https://www.hoppity.in/itinerary/${row.slug}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: 'var(--text-muted)', display: 'flex' }}
                          title="View on website"
                        >
                          <ExternalLink size={13} />
                        </a>

                        {/* Toggle active */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleActive(row)}
                          disabled={toggling === row.id}
                          title={row.is_active ? 'Set to Draft' : 'Set to Active'}
                          style={{ padding: '4px 8px' }}
                        >
                          {toggling === row.id
                            ? <div className="spinner" style={{ width: 12, height: 12 }} />
                            : row.is_active ? <EyeOff size={12} /> : <Eye size={12} />
                          }
                        </button>

                        {/* Edit */}
                        <Link to={`/itineraries/${row.id}/edit`} style={{ textDecoration: 'none' }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Edit">
                            <Pencil size={12} />
                          </button>
                        </Link>

                        {/* Delete */}
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
