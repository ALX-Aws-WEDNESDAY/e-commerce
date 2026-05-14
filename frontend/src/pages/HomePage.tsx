import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Truck, ShieldCheck, Lock, Star } from 'lucide-react'
import { useFeaturedProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/products/ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { staggerContainer, fadeUp, slideFromRight, listItem } from '@/lib/animations'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=400&q=80',
  'https://images.unsplash.com/photo-1588421357574-87938a86fa28?w=400&q=80',
  'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=400&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
]

const TRUST_ITEMS = [
  { icon: Truck, label: 'Fast Delivery', sub: 'Across Kenya in 2–5 days' },
  { icon: ShieldCheck, label: 'Verified Sellers', sub: 'Every seller is vetted' },
  { icon: Lock, label: 'Secure Checkout', sub: 'M-Pesa, card & bank' },
]

const STATS = [
  { value: '10K+', label: 'Happy customers' },
  { value: '500+', label: 'Local sellers' },
  { value: '5K+', label: 'Products' },
]

export const HomePage: React.FC = () => {
  const { data: featuredProducts, isLoading, error } = useFeaturedProducts()

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-xl"
            >
              <motion.div variants={fadeUp} className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <Star className="h-3 w-3 fill-primary" />
                  Kenya's authentic marketplace
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6 font-display"
              >
                Discover{' '}
                <span className="text-primary">Authentic</span>
                <br />
                African Products
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-lg text-muted-foreground leading-relaxed mb-8"
              >
                Connect with local artisans and businesses across Kenya. Quality products,
                fair prices, and authentic craftsmanship — delivered to your door.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to="/products">
                  <Button size="lg" className="gap-2 w-full sm:w-auto">
                    Start Shopping <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/categories">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Browse Categories
                  </Button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="flex items-center gap-8">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-bold text-foreground font-display">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: image mosaic */}
            <motion.div
              variants={slideFromRight}
              initial="hidden"
              animate="visible"
              className="relative hidden lg:block"
            >
              <div className="grid grid-cols-2 gap-3 relative">
                {/* Decorative accent */}
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-amber-400/20 rounded-3xl -z-10" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-primary/15 rounded-2xl -z-10" />

                {HERO_IMAGES.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                    className={`overflow-hidden rounded-2xl shadow-lg ${
                      i === 0 ? 'row-span-1' : ''
                    } ${i === 1 ? 'mt-6' : ''} ${i === 3 ? '-mt-6' : ''}`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-44 object-cover"
                      loading="eager"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {TRUST_ITEMS.map((item) => (
              <motion.div
                key={item.label}
                variants={listItem}
                className="flex items-center gap-4 py-5 sm:py-6 px-6 sm:px-8"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex items-end justify-between mb-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-3xl font-bold text-foreground font-display mb-2">
                Featured Products
              </h2>
              <p className="text-muted-foreground">
                Handpicked selection from Kenya's best sellers
              </p>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all group"
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-52 w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Failed to load featured products</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {featuredProducts?.map((product) => (
                <motion.div key={product.id} variants={listItem}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div
            className="text-center mt-10 sm:hidden"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Link to="/products">
              <Button variant="outline" size="lg" className="gap-2">
                View All Products <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Promo banner ── */}
      <section className="py-12 md:py-16 bg-secondary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-2xl font-bold text-white font-display mb-1">
                Are you a Kenyan seller?
              </h2>
              <p className="text-secondary-300 text-sm">
                Join 500+ artisans and businesses already selling on Elites.
              </p>
            </div>
            <Link to="/register" className="shrink-0">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 gap-2"
              >
                Start Selling <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
