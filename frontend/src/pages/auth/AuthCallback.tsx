import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const userParam = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      console.error('Auth error:', error)
      navigate('/login?error=' + error, { replace: true })
      return
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam))
        localStorage.setItem('vaagai_token', token)
        localStorage.setItem('vaagai_user_id', user.id)
        navigate('/dashboard', { replace: true })
      } catch (e) {
        console.error('Failed to parse user data:', e)
        navigate('/login?error=invalid_data', { replace: true })
      }
    } else {
      // No token in URL - check if we're in the middle of OAuth flow
      // Try to detect if this is from Supabase redirect
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Supabase-style redirect - handle it
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-primary-light)' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full animate-pulse mx-auto mb-4" style={{ background: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>Signing you into VaagAi...</p>
      </div>
    </div>
  )
}