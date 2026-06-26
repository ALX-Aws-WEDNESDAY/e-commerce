import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Package,
  LayoutGrid,
  ShoppingCart,
  User,
  LogIn,
  ArrowRight,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { productsApi } from '@/api/products.api'
import { formatPrice } from '@/utils/formatPrice'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { scaleIn } from '@/lib/animations'
import type { Product } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const QUICK_LINKS = [
  { label: 'All Products', icon: Package, to: '/products' },
  { label: 'Categories', icon: LayoutGrid, to: '/categories' },
  { label: 'Shopping Cart', icon: ShoppingCart, to: '/cart' },
]

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { openCart } = useCartStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const data = await productsApi.list({ search: q })
      setResults(data.results.slice(0, 6))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 220)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  const handleSelect = (to: string) => {
    onClose()
    navigate(to)
  }

  const handleCartOpen = () => {
    onClose()
    openCart()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 px-4"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Command
              className="rounded-2xl shadow-2xl border bg-background overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center border-b px-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
                <CommandInput
                  placeholder="Search products, navigate..."
                  value={query}
                  onValueChange={setQuery}
                  className="flex-1 border-0 focus:ring-0 text-sm py-4 bg-transparent placeholder:text-muted-foreground"
                />
                {searching && (
                  <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                <kbd className="ml-2 hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <CommandList className="max-h-96 overflow-y-auto">
                {/* Product results */}
                {results.length > 0 && (
                  <CommandGroup heading="Products">
                    {results.map((product) => (
                      <CommandItem
                        key={product.id}
                        onSelect={() => handleSelect(`/products/${product.id}`)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                      >
                        <img
                          src={product.images[0]?.url}
                          alt={product.name}
                          className="h-9 w-9 rounded-lg object-cover border bg-muted shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {query && results.length === 0 && !searching && (
                  <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
                    No products found for &ldquo;{query}&rdquo;
                  </CommandEmpty>
                )}

                {!query && (
                  <>
                    <CommandGroup heading="Navigate">
                      {QUICK_LINKS.map((link) => (
                        <CommandItem
                          key={link.to}
                          onSelect={() =>
                            link.to === '/cart' ? handleCartOpen() : handleSelect(link.to)
                          }
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                        >
                          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <link.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm">{link.label}</span>
                        </CommandItem>
                      ))}
                      {!isAuthenticated && (
                        <CommandItem
                          onSelect={() => handleSelect('/login')}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                        >
                          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm">Sign In</span>
                        </CommandItem>
                      )}
                      {isAuthenticated && (
                        <CommandItem
                          onSelect={() => handleSelect('/account')}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                        >
                          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm">My Account</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                    <CommandSeparator />
                    <div className="px-4 py-2.5">
                      <p className="text-[11px] text-muted-foreground">
                        Tip: Start typing to search across all products
                      </p>
                    </div>
                  </>
                )}
              </CommandList>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
