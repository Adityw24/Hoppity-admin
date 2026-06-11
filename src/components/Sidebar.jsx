import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Map, PlusCircle, LogOut, Activity, Video, DollarSign, BookOpen, FileSearch, Hotel, BedDouble } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('Blog_Posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      setPendingCount(count || 0)
    }
    fetchPending()
    const interval = setInterval(fetchPending, 60000)
    return () => clearInterval(interval)
  }, [])

  const links = [
    { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/itineraries',        icon: Map,             label: 'Itineraries' },
    { to: '/itineraries/new',    icon: PlusCircle,      label: 'New Itinerary' },
    { to: '/stays',              icon: BedDouble,             label: 'Stays' },
    { to: '/stays/new',          icon: PlusCircle,      label: 'New Stay' },
    { to: '/itineraries/parse',  icon: FileSearch,      label: 'Parse Brochure',  badge: 'AI' },
    { to: '/creators',           icon: Video,           label: 'Creator Videos',  badge: null },
    { to: '/earnings',           icon: DollarSign,      label: 'Affiliate Earnings' },
    { to: '/blog',               icon: BookOpen,        label: 'Blog Posts',      count: pendingCount },
    { to: '/audit',              icon: Activity,        label: 'Audit Log' },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside style={{
      width: 220,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 16px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>H</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>Hoppity</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {links.map(({ to, icon: Icon, label, badge, count }) => (
          <NavLink key={to} to={to} end={to === '/itineraries'|| to === '/stays'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 7,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? 'var(--purple-light)' : 'var(--text-dim)',
              background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent',
              transition: 'all 0.15s',
            })}>
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ color: isActive ? 'var(--purple-light)' : 'var(--text-dim)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.03em', color: '#fff', background: 'var(--purple)', borderRadius: 4, padding: '2px 5px' }}>
                    {badge}
                  </span>
                )}
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#ef4444', borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                    {count}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / sign out */}
      <div style={{ padding: '12px 8px 0', borderTop: '1px solid var(--border)' }}>
        {user && (
          <div style={{ padding: '6px 10px', marginBottom: 4, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        )}
        <button onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
