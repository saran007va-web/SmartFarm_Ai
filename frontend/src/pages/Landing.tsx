import { useState } from "react"
import { Link } from "react-router-dom"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sprout,
  CloudSun,
  LineChart,
  Settings,
  Users,
  Shield,
  ChevronRight,
  TrendingUp,
  Droplets,
  Sun,
  X,
  Loader2,
  Mail,
  Lock,
} from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002"

const features = [
  {
    icon: Sprout,
    title: "Smart Crop Planning",
    description: "AI-powered crop recommendations based on soil analysis, weather patterns, and market trends.",
  },
  {
    icon: CloudSun,
    title: "Weather Integration",
    description: "Real-time weather forecasts and alerts to protect your crops and optimize operations.",
  },
  {
    icon: LineChart,
    title: "Market Intelligence",
    description: "Live market prices and trends to help you make informed selling decisions.",
  },
  {
    icon: Settings,
    title: "Irrigation Automation",
    description: "Smart irrigation systems that optimize water usage based on soil moisture and weather.",
  },
  {
    icon: Users,
    title: "Farm Management",
    description: "Complete farm management with task tracking, team collaboration, and record keeping.",
  },
  {
    icon: Shield,
    title: "AI Insights",
    description: "Advanced AI analytics providing actionable insights to improve yield and reduce costs.",
  },
]

const stats = [
  { value: "40%", label: "Yield Increase", icon: TrendingUp },
  { value: "30%", label: "Water Savings", icon: Droplets },
  { value: "50%", label: "Time Reduction", icon: Sun },
  { value: "24/7", label: "AI Support", icon: Sprout },
]

const steps = [
  {
    number: "01",
    title: "Create Your Farm",
    description: "Sign up and add your farm details including location, size, and crop types.",
  },
  {
    number: "02",
    title: "Connect Sensors",
    description: "Integrate soil sensors, weather stations, and other IoT devices for real-time data.",
  },
  {
    number: "03",
    title: "Get AI Recommendations",
    description: "Receive personalized insights for planting, irrigation, harvesting, and more.",
  },
  {
    number: "04",
    title: "Optimize Operations",
    description: "Implement recommendations and track performance with detailed analytics.",
  },
]

export default function Landing() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

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
      window.location.href = "/farm"
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AgriTech</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Benefits
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/signin">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Smart Farming with{" "}
              <span className="text-primary">AI-Powered</span> Insights
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Transform your agricultural operations with cutting-edge AI technology.
              Optimize yields, conserve resources, and make data-driven decisions for a sustainable future.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="gap-2">
                  Start Free Trial
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
                <Link to="/demo">
                  <Button size="lg" variant="outline" className="gap-2">
                    Get Started
                  </Button>
                </Link>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border p-6 shadow-2xl z-50">
                    <Dialog.Title className="text-2xl font-bold text-center">Welcome Back</Dialog.Title>
                    <Dialog.Description className="text-center text-muted-foreground mb-4">
                      Sign in to access the demo
                    </Dialog.Description>
                    <form onSubmit={handleLogin} className="space-y-4">
                      {loginError && (
                        <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
                          {loginError}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="loginEmail">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="loginEmail"
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
                        <Label htmlFor="loginPassword">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="loginPassword"
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
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative">
            <div className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-2 shadow-2xl">
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Sprout className="h-24 w-24 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Farm Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Modernize Your Farm
            </h2>
            <p className="mt-4 text-muted-foreground">
              Comprehensive tools designed to help you grow smarter, not harder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-background/50 backdrop-blur">
                <CardHeader>
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get started in minutes with our simple four-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="absolute top-8 -right-4 h-6 w-6 text-muted-foreground rotate-0 md:rotate-90 lg:rotate-0 lg:right-auto lg:top-8 lg:-right-8 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits / Stats */}
      <section id="benefits" className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Proven Results
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Join thousands of farmers who have transformed their operations
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/10 mb-4">
                  <stat.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-4xl font-bold">{stat.value}</div>
                <div className="mt-1 text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-4xl bg-gradient-to-br from-primary to-primary/80 border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold text-primary-foreground">
                Ready to Transform Your Farm?
              </h2>
              <p className="mt-4 text-primary-foreground/90 max-w-xl mx-auto">
                Join over 10,000 farmers who are already using AgriTech to increase yields and reduce costs.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button size="lg" variant="secondary" className="gap-2">
                    Get Started Free
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Contact Sales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sprout className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">AgriTech</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Smart farming solutions for the modern agricultural industry.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} AgriTech. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}