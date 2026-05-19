import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sprout, Loader2, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmail(email, password)
      // Verify localStorage is set before navigating
      const token = localStorage.getItem('vaagai_token')
      const userId = localStorage.getItem('vaagai_user_id')
      console.log('Before redirect - Token:', token, 'UserId:', userId)

      if (token && userId) {
        navigate('/farm', { replace: true })
      } else {
        setError('Login failed - please try again')
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-surface-2)' }}>
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a4d1a 0%, #2d7a2d 50%, #1a4d1a 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div
            className="flex items-center justify-center rounded-3xl mb-8"
            style={{
              width: 80, height: 80,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Sprout size={42} strokeWidth={1.5} />
          </div>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            VaagAi
          </h1>
          <p className="text-xl text-green-100 text-center max-w-md">
            Grow smarter with AI-powered farming insights
          </p>
          <div className="mt-12 flex gap-8 text-green-100/70 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Weather</div>
              <div>Real-time forecasts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Crops</div>
              <div>Smart planning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Market</div>
              <div>Price tracking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="w-full max-w-md"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(135deg, #2d7a2d, #1a4d1a)',
              }}
            >
              <Sprout size={24} style={{ color: 'white' }} />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>
              VaagAi
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>
            Welcome back
          </h2>
          <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Sign in to your account to continue
          </p>

          {/* Google OAuth button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border rounded-xl py-3 px-4 text-sm font-medium transition mb-4"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <hr style={{ flex: 1, borderColor: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or</span>
            <hr style={{ flex: 1, borderColor: 'var(--color-border)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-5">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter your password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} style={{ color: 'var(--color-text-muted)' }} />
                  ) : (
                    <Eye size={18} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium" style={{ color: 'var(--color-primary)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}