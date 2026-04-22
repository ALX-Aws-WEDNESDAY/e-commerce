import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPrice, formatDiscount } from '@/utils/formatPrice'
import { cn } from '@/utils/cn'
import type { Product } from '@/types'

// ── RatingBadge ───────────────────────────────────────────────────────────────

interface RatingBadgeProps {
  rating: number
  reviewCount: number
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, reviewCount }) => {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-yellow-500 font-medium">
      ★ {rating.toFixed(1)}
      {reviewCount > 0 && (
        <span className="text-gray-500 font-normal">({reviewCount})</span>
      )}
    </span>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  onAddToCart: (productId: number) => void
  isAddingToCart?: boolean
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isAddingToCart }) => {
  return (
    <div className={cn(
      'bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-transparent',
      'dark:border-secondary-700 overflow-hidden hover:shadow-md transition-shadow',
      'flex flex-col'
    )}>
      {/* Image area */}
      <div className="relative">
        <Link to={`/products/${product.id}`}>
          <img
            src={product.images[0]?.url}
            alt={product.name}
            className="w-full aspect-[4/3] object-cover hover:opacity-90 transition-opacity"
          />
        </Link>
        {product.original_price && (
          <Badge variant="sale" className="absolute top-2 left-2">
            -{formatDiscount(product.original_price, product.price)}%
          </Badge>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 flex items-center justify-center">
            <Badge variant="pending">Out of Stock</Badge>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/products/${product.id}`}>
          <h3 className={cn(
            'font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2',
            'hover:text-brand-600 dark:hover:text-brand-400 transition-colors',
            'min-h-[3rem]'
          )}>
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{product.location}</p>
        <RatingBadge rating={product.rating} reviewCount={product.review_count} />

        {/* Spacer pushes price/button row to bottom */}
        <div className="flex-1" />

        {/* Price + Add to Cart row */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-brand-600 dark:text-brand-400 transition-colors">
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <span className="text-sm text-gray-500 dark:text-gray-400 line-through ml-2 transition-colors">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            disabled={!product.in_stock || isAddingToCart}
            onClick={() => onAddToCart(product.id)}
          >
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  )
}
