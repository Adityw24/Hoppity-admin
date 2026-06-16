import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Map, CheckCircle, XCircle, PlusCircle, TrendingUp, Activity,
  BedDouble, Building2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, priced: 0 })
  const [stayStats, setStayStats] = useState({ total: 0, active: 0, inactive: 0, priced: 0 })
  const [recent, setRecent] = useState([])
  const [recentStays, setRecentStays] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: total },
        { count: active },
        { count: priced },
        { count: stayTotal },
        { count: stayActive },
        { count: stayPriced },
        { data: recentRows },
        { data: recentStayRows },
        { data: recentLogRows },
      ] = await Promise.all([
        supabase.from('Itineraries').select('*', { count: 'exact', head: true }),
        supabase.from('Itineraries').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('Itineraries').select('*', { count: 'exact', head: true }).gt('price_per_person', 0),
        supabase.from('Properties').select('*', { count: 'exact', head: true }),
        supabase.from('Properties').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('Properties').select('*', { count: 'exact', head: true }).gt('price_per_night', 0),
        supabase
          .from('Itineraries')
          .select('id,title,slug,category,is_active,price_per_person,rating,created_at,location,cover_image_url')
          .order('id', { ascending: false })
          .limit(8),
        supabase
          .from('Properties')
          .select('id,name,location,property_type,property_category,is_active,price_per_night,cover_image_url,images_url,stay_code,created_at')
          .order('id', { ascending: false })
          .limit(8),
        supabase
          .from('Admin_logs')
          .select('id,admin_email,action,entity_title,created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      setStats({
        total:    total    || 0,
        active:   active   || 0,
        inactive: (total   || 0) - (active || 0),
        priced:   priced   || 0,
      })
      setStayStats({
        total:    stayTotal  || 0,
        active:   stayActive || 0,
        inactive: (stayTotal || 0) - (stayActive || 0),
        priced:   stayPriced || 0,
      })
      setRecent(recentRows || [])
      setRecentStays(recentStayRows || [])
      setRecentLogs(recentLogRows || [])
      setLoading(false)
    }
    load()
  }, [])

  const firstName = user?.user_metadata?.given_name || user?.email?.split('@')[0] || 'Admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const StatCard = ({ icon: Icon, label, value, sub, color = 'var(--text)' }) => (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 12 }}>{label}</p>
          <p style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </div>
  )

  const SectionLabel = ({ icon: Icon, children, to, linkText }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 14px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
        <Icon size={15} style={{ color: 'var(--purple-light)' }} /> {children}
      </h2>
      {to && (
        <Link to={to} style={{ fontSize: 12, color: 'var(--purple-light)', textDecoration: 'none' }}>
          {linkText || 'View all'} →
        </Link>
      )}
    </div>
  )

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {greeting}, {firstName}
        </h1>
      </div>

      {/* Itineraries stats */}
      <SectionLabel icon={Map} to="/itineraries">Itineraries</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Map} label="Total Itineraries" value={stats.total} sub={`${stats.active} active · ${stats.inactive} draft`} />
        <StatCard icon={CheckCircle} label="Active (Live)" value={stats.active} sub="Visible on website + app" color="var(--green)" />
        <StatCard icon={XCircle} label="Draft / Inactive" value={stats.inactive} sub="Hidden from users" color="var(--text-muted)" />
        <StatCard icon={TrendingUp} label="Priced Tours" value={stats.priced} sub="With fixed pricing" color="var(--purple-light)" />
      </div>

      {/* Stays stats */}
      <SectionLabel icon={BedDouble} to="/stays">Stays</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard icon={Building2} label="Total Stays" value={stayStats.total} sub={`${stayStats.active} active · ${stayStats.inactive} draft`} />
        <StatCard icon={CheckCircle} label="Active (Live)" value={stayStats.active} sub="Visible on website + app" color="var(--green)" />
        <StatCard icon={XCircle} label="Draft / Inactive" value={stayStats.inactive} sub="Hidden from users" color="var(--text-muted)" />
        <StatCard icon={TrendingUp} label="Priced Stays" value={stayStats.priced} sub="With nightly pricing" color="var(--purple-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
        {/* Left column: recent itineraries + recent stays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Recent itineraries */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Itineraries</h2>
              <Link to="/itineraries" style={{ fontSize: 12, color: 'var(--purple-light)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Title', 'Location', 'Category', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <Link to={`/itineraries/${t.id}/edit`} style={{ textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>
                            {t.title}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{t.location}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-purple">{t.category || '—'}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${t.is_active ? 'badge-green' : 'badge-red'}`}>
                            {t.is_active ? 'Active' : 'Draft'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent stays */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Stays</h2>
              <Link to="/stays" style={{ fontSize: 12, color: 'var(--purple-light)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : recentStays.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No stays yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Location', 'Type', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentStays.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <Link to={`/stays/${s.id}/edit`} style={{ textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>
                            {s.name}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{s.location || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-purple">{s.property_type || '—'}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                            {s.is_active ? 'Active' : 'Draft'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions + Audit log */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/itineraries/new" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <PlusCircle size={14} /> New Itinerary
              </button>
            </Link>
            <Link to="/stays/new" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <PlusCircle size={14} /> New Stay
              </button>
            </Link>
            <Link to="/itineraries" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Map size={14} /> All Itineraries
              </button>
            </Link>
            <Link to="/stays" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <BedDouble size={14} /> All Stays
              </button>
            </Link>
          </div>

          {/* Mini stats */}
          <div className="card" style={{ marginTop: 24, padding: 16 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Category Breakdown</p>
            {loading ? <div className="spinner" style={{ margin: '0 auto' }} /> : (
              <CategoryBreakdown data={recent} />
            )}
          </div>

          {/* Recent audit log */}
          <div className="card" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="section-label">Recent Activity</p>
              <Activity size={12} style={{ color: 'var(--text-dim)' }} />
            </div>
            {recentLogs.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>No activity yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentLogs.map(log => (
                  <div key={log.id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className={`badge ${
                        log.action === 'create' ? 'badge-green' :
                        log.action === 'delete' ? 'badge-red' :
                        log.action === 'toggle_active' ? 'badge-amber' : 'badge-purple'
                      }`} style={{ fontSize: 9 }}>
                        {log.action}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {log.entity_title || '—'}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      {log.admin_email?.split('@')[0]} · {new Date(log.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryBreakdown({ data }) {
  const counts = {}
  data.forEach(t => {
    counts[t.category || 'Unknown'] = (counts[t.category || 'Unknown'] || 0) + 1
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{cat}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n}</span>
        </div>
      ))}
    </div>
  )
}