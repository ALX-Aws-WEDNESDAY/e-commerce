import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Instagram, Twitter, Facebook, Mail, MapPin, Phone, ArrowRight } from 'lucide-react'
import { staggerContainer, listItem } from '@/lib/animations'

const CATEGORIES = [
  { label: 'Electronics', to: '/categories' },
  { label: 'Fashion & Apparel', to: '/categories' },
  { label: 'Home & Kitchen', to: '/categories' },
  { label: 'Beauty & Health', to: '/categories' },
  { label: 'Food & Groceries', to: '/categories' },
  { label: 'Sports & Outdoors', to: '/categories' },
]

const SUPPORT = [
  { label: 'Help Center', to: '/help' },
  { label: 'Shipping & Delivery', to: '/shipping' },
  { label: 'Returns & Refunds', to: '/returns' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
]

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="bg-secondary-900 text-white">
      {/* Newsletter strip */}
      <div className="bg-primary/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-lg font-display">
                Stay in the loop
              </h3>
              <p className="text-white/80 text-sm mt-0.5">
                New arrivals, exclusive deals, and stories from Kenyan artisans.
              </p>
            </div>
            {subscribed ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white font-medium text-sm bg-white/20 rounded-lg px-4 py-2.5"
              >
                Thanks for subscribing!
              </motion.p>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex w-full sm:w-auto gap-2"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 sm:w-64 px-4 py-2.5 rounded-lg text-sm bg-white/15 border border-white/25 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-white/95 transition-colors whitespace-nowrap"
                >
                  Subscribe <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* Brand */}
          <motion.div variants={listItem} className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-bold">E</span>
              </div>
              <span className="text-xl font-bold font-display">Elites</span>
            </Link>
            <p className="text-secondary-300 text-sm leading-relaxed mb-5">
              Connecting Kenya's finest artisans and businesses with customers who value quality and authenticity.
            </p>
            <div className="space-y-2 text-sm text-secondary-300">
              <a href="mailto:info@elites.africa" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                info@elites.africa
              </a>
              <a href="tel:+254700000000" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                +254 700 000 000
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Nairobi, Kenya
              </p>
            </div>
            {/* Social icons */}
            <div className="flex items-center gap-3 mt-5">
              <a
                href="#"
                className="p-2 rounded-lg bg-secondary-800 hover:bg-secondary-700 text-secondary-300 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-secondary-800 hover:bg-secondary-700 text-secondary-300 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-secondary-800 hover:bg-secondary-700 text-secondary-300 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div variants={listItem}>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Categories
            </h3>
            <ul className="space-y-2.5">
              {CATEGORIES.map((c) => (
                <li key={c.label}>
                  <Link
                    to={c.to}
                    className="text-secondary-300 hover:text-white text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Support */}
          <motion.div variants={listItem}>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Support
            </h3>
            <ul className="space-y-2.5">
              {SUPPORT.map((s) => (
                <li key={s.label}>
                  <Link
                    to={s.to}
                    className="text-secondary-300 hover:text-white text-sm transition-colors"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={listItem}>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Why Elites
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Verified Local Sellers', sub: 'Every seller is vetted' },
                { label: 'Secure Payments', sub: 'M-Pesa, card & more' },
                { label: 'Fast Delivery', sub: 'Across Kenya in 2–5 days' },
                { label: 'Easy Returns', sub: '30-day hassle-free returns' },
              ].map((b) => (
                <div key={b.label} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{b.label}</p>
                    <p className="text-secondary-400 text-xs">{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Copyright */}
        <div className="border-t border-secondary-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-secondary-400 text-sm">
            © 2026 Elites. All rights reserved. Made in Kenya.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
