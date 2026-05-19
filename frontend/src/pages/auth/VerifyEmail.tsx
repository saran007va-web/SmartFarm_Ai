import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sprout, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../../lib/api'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!email) {
      navigate('/register')
    }
  }, [email, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')

    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post('/api/auth/verify-otp', { email, otp: otpCode })
      setSuccess(true)
      setTimeout(() => {
        navigate('/farm')
      }, 2000)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error
      setError(errorMsg || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return

    setResending(true)
    setError('')

    try {
      await api.post('/api/auth/resend-otp', { email })
      setCountdown(60)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex" style={{ background: 'var(--color-surface-2)' }}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center" style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div className="flex justify-center mb-6">
              <CheckCircle size={64} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>
              Email Verified!
            </h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Redirecting to your farm...
            </p>
          </div>
        </div>
      </div>
    )
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
            <Mail size={42} strokeWidth={1.5} />
          </div>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Verify Your Email
          </h1>
          <p className="text-xl text-green-100 text-center max-w-md">
            We've sent a verification code to your email
          </p>
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

          <Link to="/login" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>
            Enter verification code
          </h2>
          <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>
            We've sent a 6-digit code to <span className="font-medium" style={{ color: 'var(--color-text)' }}>{email}</span>
          </p>

          {error && (
            <div className="alert alert-danger mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex gap-2 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="input text-center text-xl font-bold"
                  style={{ width: '48px', height: '56px' }}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="font-medium"
                style={{
                  color: countdown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}