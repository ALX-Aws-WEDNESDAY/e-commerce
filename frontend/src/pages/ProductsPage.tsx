import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, LayoutGrid, LayoutList, X, Search, Package } from 'lucide-react'
import { useProducts, useCategories } from '@/hooks/useProducts'
import { ProductCard } from '@/components/products/ProductCard'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, listItem, fadeUp } from '@/lib/animations'

type ViewMode = 'grid' | 'list'

const FilterSidebar: React.FC<{
  categories: { id: number; name: string; slug: string }[]
  selectedCategory: string | null
  inStockOnly: boolean
  onCategoryChange: (slug: string | null) => void
  onInStockChange: (val: boolean) => void
  onClear: () => void
}> = ({ categories, selectedCategory, inStockOnly, onCategoryChange, onInStockChange, onClear }) => {
  const hasFilters = selectedCategory || inStockOnly

  return (
    <div className="space-y-6">
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          <X className="h-3 w-3" /> Clear all filters
        </button>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Categories
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex items-center gap-2 text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
              !selectedCategory
                ? 'text-primary font-semibold bg-primary/8'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.slug)}
              className={`flex items-center gap-2 text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                selectedCategory === cat.slug
                  ? 'text-primary font-semibold bg-primary/8'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Availability
        </h3>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox
            checked={inStockOnly}
            onCheckedChange={(v) => onInStockChange(Boolean(v))}
          />
          <span className="text-sm">In stock only</span>
        </label>
      </div>
    </div>
  )
}

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const inStockOnly = searchParams.get('in_stock') === 'true'

  const { data: categoriesData } = useCategories()
  const categories = categoriesData ?? []

  const filters: Record<string, string> = {}
  if (category) filters.category = category
  if (search) filters.search = search
  if (inStockOnly) filters.in_stock = 'true'

  const { data: productsData, isLoading, error } = useProducts(filters)
  const products = productsData?.results ?? []

  const activeFilterCount = [category, inStockOnly].filter(Boolean).length

  const updateParam = (key: string, val: string | null) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val)
    else p.delete(key)
    setSearchParams(p, { replace: true })
  }

  const handleClear = () => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    setSearchParams(p, { replace: true })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl font-bold text-foreground font-display mb-1">All Products</h1>
        <p className="text-muted-foreground text-sm">
          Authentic products from verified Kenyan sellers
        </p>
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search products..."
            value={search || ''}
            onChange={(e) => updateParam('search', e.target.value || null)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
          />
        </div>

        {/* Mobile filter trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 md:hidden shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader className="mb-6">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <FilterSidebar
              categories={categories}
              selectedCategory={category}
              inStockOnly={inStockOnly}
              onCategoryChange={(slug) => updateParam('category', slug)}
              onInStockChange={(v) => updateParam('in_stock', v ? 'true' : null)}
              onClear={handleClear}
            />
          </SheetContent>
        </Sheet>

        {/* Results count */}
        <span className="text-sm text-muted-foreground ml-auto shrink-0">
          {isLoading ? '—' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
        </span>

        {/* View toggle */}
        <div className="hidden sm:flex items-center rounded-lg border overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 mb-5"
          >
            {category && (
              <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary font-medium px-3 py-1 rounded-full">
                {categories.find((c) => c.slug === category)?.name ?? category}
                <button onClick={() => updateParam('category', null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {inStockOnly && (
              <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary font-medium px-3 py-1 rounded-full">
                In stock only
                <button onClick={() => updateParam('in_stock', null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="sticky top-24">
            <FilterSidebar
              categories={categories}
              selectedCategory={category}
              inStockOnly={inStockOnly}
              onCategoryChange={(slug) => updateParam('category', slug)}
              onInStockChange={(v) => updateParam('in_stock', v ? 'true' : null)}
              onClear={handleClear}
            />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div
              className={`grid gap-5 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 text-muted-foreground">
              Failed to load products. Please try again.
            </div>
          ) : products.length === 0 ? (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No products found</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Try adjusting your filters or search query
              </p>
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear filters
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={`${category}-${inStockOnly}-${search}-${viewMode}`}
              className={`grid gap-5 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {products.map((product) => (
                <motion.div key={product.id} variants={listItem} layout>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
