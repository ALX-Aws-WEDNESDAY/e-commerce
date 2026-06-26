import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Smartphone,
  Shirt,
  Home,
  Sparkles,
  ShoppingBasket,
  Dumbbell,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { useCategories } from '@/hooks/useProducts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { staggerContainer, listItem, fadeUp } from '@/lib/animations'
import type { Category } from '@/types'

/* Map category names to icon names — falls back to Tag for unknown names */
const getCategoryIconName = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.includes('electron') || lower.includes('tech') || lower.includes('phone'))
    return 'smartphone'
  if (lower.includes('fashion') || lower.includes('apparel') || lower.includes('cloth'))
    return 'shirt'
  if (lower.includes('home') || lower.includes('kitchen') || lower.includes('furnit'))
    return 'home'
  if (lower.includes('beauty') || lower.includes('health') || lower.includes('care'))
    return 'sparkles'
  if (lower.includes('food') || lower.includes('grocer') || lower.includes('drink'))
    return 'shoppingBasket'
  if (lower.includes('sport') || lower.includes('outdoor') || lower.includes('fit'))
    return 'dumbbell'
  return 'tag'
}

const BG_GRADIENTS = [
  'from-emerald-50 to-emerald-100/60 dark:from-emerald-950/30 dark:to-emerald-900/20',
  'from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20',
  'from-blue-50 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-900/20',
  'from-rose-50 to-rose-100/60 dark:from-rose-950/30 dark:to-rose-900/20',
  'from-violet-50 to-violet-100/60 dark:from-violet-950/30 dark:to-violet-900/20',
  'from-orange-50 to-orange-100/60 dark:from-orange-950/30 dark:to-orange-900/20',
]

const ICON_COLORS = [
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-blue-600 dark:text-blue-400',
  'text-rose-600 dark:text-rose-400',
  'text-violet-600 dark:text-violet-400',
  'text-orange-600 dark:text-orange-400',
]

const ICON_COMPONENTS = {
  smartphone: Smartphone,
  shirt: Shirt,
  home: Home,
  sparkles: Sparkles,
  shoppingBasket: ShoppingBasket,
  dumbbell: Dumbbell,
  tag: Tag,
} as const

interface CategoryCardProps {
  category: Category
  index: number
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, index }) => {
  const iconName = getCategoryIconName(category.name)
  const IconComponent = ICON_COMPONENTS[iconName]
  const gradient = BG_GRADIENTS[index % BG_GRADIENTS.length]
  const iconColor = ICON_COLORS[index % ICON_COLORS.length]

  return (
    <motion.div variants={listItem}>
      <Link to={`/products?category=${category.slug}`}>
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden border hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700/50 transition-all duration-300 group cursor-pointer">
            {/* Icon area */}
            <div className={`bg-gradient-to-br ${gradient} px-6 pt-8 pb-6 flex flex-col items-center`}>
              <div className="h-16 w-16 rounded-2xl bg-white dark:bg-secondary-800 shadow-sm flex items-center justify-center mb-4 group-hover:shadow-md transition-shadow">
                <IconComponent className={`h-7 w-7 ${iconColor} group-hover:scale-110 transition-transform duration-200`} />
              </div>
              <h3 className="text-base font-bold text-foreground text-center font-display">
                {category.name}
              </h3>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Browse all products
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
          </Card>
        </motion.div>
      </Link>
    </motion.div>
  )
}

export const CategoriesPage: React.FC = () => {
  const { data: categories, isLoading, error } = useCategories()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        className="mb-10"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl font-bold text-foreground font-display mb-2">
          Browse by Category
        </h1>
        <p className="text-muted-foreground text-sm">
          Explore our curated selection of product categories from Kenyan sellers
        </p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <Skeleton className="h-3 w-1/3 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-muted-foreground">
          Failed to load categories. Please try again.
        </div>
      ) : !categories || categories.length === 0 ? (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-center py-20"
        >
          <p className="text-muted-foreground">No categories found.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {categories.map((category, i) => (
            <CategoryCard key={category.id} category={category} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
