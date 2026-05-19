import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/farm', { replace: true })
        } else if (event === 'SIGNED_OUT') {
          navigate('/login', { replace: true })
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/farm', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-primary-light)' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full animate-pulse mx-auto mb-4" style={{ background: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>Signing you into VaagAi...</p>
      </div>
    </div>
  )
}