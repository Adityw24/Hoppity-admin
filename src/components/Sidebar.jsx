import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, PlusCircle, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/itineraries', icon: Map, label: 'Itineraries' },
  { to: '/itineraries/new', icon: PlusCircle, label: 'New Itinerary' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, var(--purple), var(--purple-light))',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,58,237,0.3)',
          }}>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>H</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Hoppity</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={15} style={{ color: isActive ? 'var(--purple-light)' : 'var(--text-dim)' }} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + sign out */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        {user && (
          <div style={{
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  style={{ width: 26, height: 26, borderRadius: '50%' }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            background: 'transparent', border: 'none',
            fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
