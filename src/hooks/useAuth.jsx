import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isAllowedEmail } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (!isAllowedEmail(session.user.email)) {
          supabase.auth.signOut()
          setAuthError(`Access restricted to @triffair.com accounts.`)
        } else {
          setUser(session.user)
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (!isAllowedEmail(session.user.email)) {
          await supabase.auth.signOut()
          setAuthError(`Access denied. Only @triffair.com Google accounts are allowed.`)
          setUser(null)
        } else {
          setAuthError(null)
          setUser(session.user)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://admin.hoppity.in/dashboard'
        queryParams: {
          hd: 'triffair.com', // Hint Google to show only @triffair.com accounts
          prompt: 'select_account',
        },
      },
    })
    if (error) setAuthError(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
