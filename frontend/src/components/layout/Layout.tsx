import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { useMe } from '@/hooks/useAuth'
import { useThemeStore } from '@/store/theme.store'
import { pageTransition } from '@/lib/animations'

export const Layout: React.FC = () => {
  useMe()
  const theme = useThemeStore((s) => s.theme)
  const location = useLocation()
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement
    const applyTheme = (currentTheme: 'light' | 'dark' | 'system') => {
      root.classList.remove('light', 'dark')
      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(currentTheme)
      }
    }
    applyTheme(theme)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') applyTheme('system')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setCommandOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-200">
      <Navbar onSearchOpen={() => setCommandOpen(true)} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'font-body',
          },
        }}
      />
    </div>
  )
}
