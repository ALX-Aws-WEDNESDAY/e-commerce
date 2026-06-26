import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck, Star, Truck } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useLogin } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from 'sonner'
import { staggerContainer, fadeUp, listItem } from '@/lib/animations'

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'Secure, encrypted payments' },
  { icon: Truck, text: 'Fast delivery across Kenya' },
  { icon: Star, text: 'Verified local sellers only' },
]

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from || '/', { replace: true })
    }
  }, [isAuthenticated, navigate, location.state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ email, password })
    } catch {
      setError('Invalid email or password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-primary flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/30 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center">
              <span className="text-primary font-bold text-lg">E</span>
            </div>
            <span className="text-white text-2xl font-bold font-display">Elites</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl font-bold text-white font-display leading-tight mb-4">
            Kenya's authentic online marketplace
          </h2>
          <p className="text-white/80 text-sm leading-relaxed mb-8">
            Connect with thousands of verified local sellers offering quality products at fair prices.
          </p>
          <div className="space-y-3">
            {TRUST_POINTS.map((p) => (
              <div key={p.text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <p.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-sm">{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">
          © 2026 Elites. Made in Kenya.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <Toaster position="top-center" />
        <motion.div
          className="w-full max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo */}
          <motion.div variants={fadeUp} className="mb-8 lg:hidden text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <span className="text-xl font-bold font-display">Elites</span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-2xl font-bold font-display">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to your Elites account
            </p>
          </motion.div>

          <form onSubmit={handleSubmit}>
            <motion.div variants={staggerContainer} className="space-y-4">
              <motion.div variants={listItem} className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </motion.div>

              <motion.div variants={listItem} className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div variants={listItem}>
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                        className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                      />
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>

          <motion.p variants={fadeUp} className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
