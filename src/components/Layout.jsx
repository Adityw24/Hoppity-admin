import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1, marginLeft: 220,
        background: 'var(--bg)',
        minHeight: '100vh',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
