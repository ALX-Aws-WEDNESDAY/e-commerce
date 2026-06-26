import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingCart, Star, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDiscount } from '@/utils/formatPrice'
import { useAddToCart } from '@/hooks/useCart'
import { cn } from '@/utils/cn'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  /** When used standalone, card handles its own add-to-cart. */
  onAddToCart?: (productId: number) => void
  isAddingToCart?: boolean
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isAddingToCart: externalPending,
}) => {
  const [hovered, setHovered] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  const addToCartMutation = useAddToCart()
  const isPending = externalPending ?? addToCartMutation.isPending

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onAddToCart) {
      onAddToCart(product.id)
    } else {
      addToCartMutation.mutate({ productId: product.id, quantity: 1 })
    }
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlisted((prev) => !prev)
  }

  return (
    <Card
      className="group overflow-hidden border bg-card hover:shadow-lg transition-shadow duration-300 flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="relative overflow-hidden">
        <Link to={`/products/${product.id}`} tabIndex={-1}>
          <motion.img
            src={product.images[0]?.url}
            alt={product.name}
            className="w-full aspect-[4/3] object-cover"
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </Link>

        {/* Hover overlay with Quick Add */}
        <AnimatePresence>
          {hovered && product.in_stock && (
            <motion.div
              className="absolute inset-0 bg-black/35 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  disabled={isPending}
                  className="gap-2 shadow-lg"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {isPending ? 'Adding...' : 'Quick Add'}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-background border rounded-full px-3 py-1">
              Out of Stock
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.original_price && (
            <span className="text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
              -{formatDiscount(product.original_price, product.price)}%
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={cn(
            'absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center',
            'bg-background/90 backdrop-blur-sm shadow-sm transition-all duration-200',
            'opacity-0 group-hover:opacity-100',
            wishlisted ? 'opacity-100' : '',
          )}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <motion.div
            animate={wishlisted ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                wishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
              )}
            />
          </motion.div>
        </button>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Name */}
        <Link to={`/products/${product.id}`}>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors min-h-[2.5rem] mb-1.5">
            {product.name}
          </h3>
        </Link>

        {/* Location */}
        {product.location && (
          <div className="flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{product.location}</span>
          </div>
        )}

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-foreground">{product.rating.toFixed(1)}</span>
            {product.review_count > 0 && (
              <span className="text-xs text-muted-foreground">({product.review_count})</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant={product.in_stock ? 'default' : 'outline'}
            disabled={!product.in_stock || isPending}
            onClick={handleAddToCart}
            className="text-xs h-8 px-3 shrink-0"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                  className="inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full"
                />
                Adding
              </span>
            ) : product.in_stock ? (
              'Add to Cart'
            ) : (
              'Unavailable'
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
