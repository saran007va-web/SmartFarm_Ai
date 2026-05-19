import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Loader2, Sprout } from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002"

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState("")
  const [status, setStatus] = useState("Processing your login...")

  useEffect(() => {
    const code = searchParams.get("code")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      setError("Google authentication was cancelled or failed")
      return
    }

    if (!code) {
      setError("No authorization code received")
      return
    }

    const handleCallback = async () => {
      try {
        setStatus("Completing authentication...")

        const response = await fetch(`${API_URL}/api/auth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Authentication failed")
        }

        localStorage.setItem("vaagai_token", data.token)
        if (data.user?.id) {
          localStorage.setItem("vaagai_user_id", data.user.id)
        }
        localStorage.setItem("user", JSON.stringify(data.user))
        navigate("/farm", { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed")
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sprout className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AgriTech</span>
          </div>
          <div className="p-6 bg-destructive/10 text-destructive rounded-lg">
            <p className="font-medium">Authentication Failed</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <a
            href="/signin"
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-medium">{status}</p>
        <p className="text-sm text-muted-foreground mt-2">Please wait...</p>
      </div>
    </div>
  )
}