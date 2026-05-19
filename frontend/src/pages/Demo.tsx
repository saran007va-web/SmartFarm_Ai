import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sprout,
  CloudSun,
  Droplets,
  Thermometer,
  TrendingUp,
  Calendar,
  Plus,
  X,
  Loader2,
  Mail,
  Lock,
  ChevronRight,
  Leaf,
  BarChart3,
  MapPin,
  Cloud,
} from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002"

const demoFeatures = [
  {
    icon: CloudSun,
    title: "Weather",
    description: "Real-time weather forecasts",
    value: "24°C Partly Cloudy",
  },
  {
    icon: Droplets,
    title: "Soil Moisture",
    description: "Current soil hydration levels",
    value: "68%",
  },
  {
    icon: Thermometer,
    title: "Temperature",
    description: "Current temperature",
    value: "26°C",
  },
  {
    icon: TrendingUp,
    title: "Yield Prediction",
    description: "AI-powered yield forecast",
    value: "+15%",
  },
]

const demoCrops = [
  { name: "Rice", area: "5 acres", status: "Growing", daysLeft: 45 },
  { name: "Wheat", area: "3 acres", status: "Planted", daysLeft: 90 },
  { name: "Tomatoes", area: "1 acre", status: "Flowering", daysLeft: 30 },
]

const demoTasks = [
  { task: "Irrigate Rice Field", due: "Today", priority: "High" },
  { task: "Fertilizer Application", due: "Tomorrow", priority: "Medium" },
  { task: "Pest Inspection", due: "In 3 days", priority: "Low" },
]

const demoMarketPrices = [
  { crop: "Rice (Paddy)", price: "₹2,200/quintal", change: "+3.2%" },
  { crop: "Wheat", price: "₹2,150/quintal", change: "+1.5%" },
  { crop: "Tomatoes", price: "₹1,800/quintal", change: "-2.1%" },
]

export default function Demo() {
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/dashboard")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const triggerLogin = (path: string = "/dashboard") => {
    setRedirectPath(path)
    setLoginOpen(true)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      localStorage.setItem("vaagai_token", data.token)
      if (data.user?.id) {
        localStorage.setItem("vaagai_user_id", data.user.id)
      }
      localStorage.setItem("user", JSON.stringify(data.user))
      setLoginOpen(false)
      navigate(redirectPath)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AgriTech</span>
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Demo Mode</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => triggerLogin("/dashboard")}>
              Sign In to Continue
            </Button>
            <Link to="/signup">
              <Button size="sm">Sign Up Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20">
          <h1 className="text-2xl font-bold">Welcome to AgriTech Demo</h1>
          <p className="text-muted-foreground mt-2">
            This is a preview of our smart farming platform. Sign in to access full features and start managing your farm.
          </p>
          <Button className="mt-4" onClick={() => triggerLogin("/dashboard")}>
            Sign In to Start Farming <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {demoFeatures.map((feature, index) => (
            <Card key={index} className="border-border/50">
              <CardHeader className="pb-2">
                <feature.icon className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-xs">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{feature.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Crop Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" />
                  Active Crops
                </CardTitle>
                <CardDescription>Your current crop status</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => triggerLogin("/dashboard")}>
                <Plus className="h-4 w-4 mr-1" /> Add Crop
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoCrops.map((crop, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{crop.name}</p>
                      <p className="text-sm text-muted-foreground">{crop.area}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        {crop.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{crop.daysLeft} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Tasks
                </CardTitle>
                <CardDescription>Scheduled farm activities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => triggerLogin("/dashboard")}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{task.task}</p>
                      <p className="text-sm text-muted-foreground">Due: {task.due}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === "High" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                      task.priority === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market Prices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Market Prices
              </CardTitle>
              <CardDescription>Latest agricultural market rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoMarketPrices.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{item.crop}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.price}</p>
                      <p className={`text-xs ${item.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                        {item.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Farm Map Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Farm Visualization
              </CardTitle>
              <CardDescription>Interactive 3D farm view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Farm Map Preview</p>
                  <p className="text-sm text-muted-foreground mt-2">Sign in to view full map</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50">
              <CardHeader>
                <Cloud className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Weather Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Real-time weather forecasts and 7-day predictions to plan your farming activities.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Market Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Live market prices and trends to help you sell at the best time.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Smart recommendations for planting, irrigation, and harvesting.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Login Dialog */}
      <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border p-6 shadow-2xl z-50">
            <Dialog.Title className="text-2xl font-bold text-center">Welcome Back</Dialog.Title>
            <Dialog.Description className="text-center text-muted-foreground mb-4">
              Sign in to continue to the full platform
            </Dialog.Description>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="demoLoginEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="demoLoginEmail"
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="demoLoginPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="demoLoginPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.location.href = `${API_URL}/api/auth/google`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium" onClick={() => setLoginOpen(false)}>
                Sign up
              </Link>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 rounded-full p-1 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AgriTech. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}