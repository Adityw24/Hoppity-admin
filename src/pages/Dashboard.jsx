import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Map, CheckCircle, XCircle, PlusCircle, TrendingUp, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, priced: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('Itineraries')
        .select('id,title,slug,category,is_active,price_per_person,rating,created_at,location,cover_image_url')
        .order('id', { ascending: false })
        .limit(50)

      if (data) {
        setStats({
          total: data.length,
          active: data.filter(t => t.is_active).length,
          inactive: data.filter(t => !t.is_active).length,
          priced: data.filter(t => t.price_per_person > 0).length,
        })
        setRecent(data.slice(0, 8))
      }
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

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {greeting}, {firstName}
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard icon={Map} label="Total Itineraries" value={stats.total} sub="All time" />
        <StatCard icon={CheckCircle} label="Active" value={stats.active} sub="Live on website + app" color="var(--green)" />
        <StatCard icon={XCircle} label="Draft / Inactive" value={stats.inactive} sub="Hidden from users" color="var(--text-muted)" />
        <StatCard icon={TrendingUp} label="Priced Tours" value={stats.priced} sub="With fixed pricing" color="var(--purple-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
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

        {/* Quick actions */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/itineraries/new" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <PlusCircle size={14} /> New Itinerary
              </button>
            </Link>
            <Link to="/itineraries" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Map size={14} /> All Itineraries
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
