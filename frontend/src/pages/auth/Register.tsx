import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sprout, Loader2, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { useRegister } from '../../hooks/useAuth'

export default function Register() {
  const navigate = useNavigate()
  const register = useRegister()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const result = await register.mutateAsync({ name, email, password })
      console.log('Registration success:', result)
      navigate('/verify-email', { state: { email } })
    } catch (err: any) {
      console.error('Registration error:', err)
      const errorMsg = err?.response?.data?.error
      if (errorMsg) {
        setError(Array.isArray(errorMsg) ? errorMsg[0]?.message : errorMsg)
      } else {
        setError('Registration failed. Please try again.')
      }
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
            Create your account
          </h2>
          <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Start your smart farming journey
          </p>

          {error && (
            <div className="alert alert-danger mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
                  placeholder="Create a password"
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

            <div>
              <label className="label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={register.isPending}
            >
              {register.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--color-primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}