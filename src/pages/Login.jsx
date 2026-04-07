import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading, authError, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', width: 400, padding: '0 20px' }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52,
            background: 'linear-gradient(135deg, var(--purple), var(--purple-light))',
            borderRadius: 16, marginBottom: 20,
            boxShadow: '0 0 40px rgba(124,58,237,0.4)',
          }}>
            <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>H</span>
          </div>
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: 8,
          }}>
            Hoppity Internal
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Admin Panel
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Manage itineraries, content, and tours
          </p>
        </div>

        {/* Auth card */}
        <div className="card" style={{ padding: 28 }}>
          {authError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '12px 14px',
              marginBottom: 20, fontSize: 13,
              color: '#fca5a5', lineHeight: 1.5,
            }}>
              {authError}
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px',
              background: 'white', color: '#1f1f1f',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              transition: 'all 0.15s',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'DM Sans, sans-serif',
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#f5f5f5' }}
            onMouseLeave={e => { e.target.style.background = 'white' }}
          >
            {/* Google logo SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div style={{
            marginTop: 20, padding: '12px 14px',
            background: 'var(--surface-2)', borderRadius: 8,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Access restricted to <span className="mono" style={{ color: 'var(--purple-light)' }}>@triffair.com</span> Google accounts only. Other accounts will be rejected.
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-dim)' }}>
          Hoppity Internal Tools · Confidential
        </p>
      </div>
    </div>
  )
}
