import React from 'react'
import { ProductCard } from '@/components/products/ProductCard'
import type { Product } from '@/types'

interface ProductGridProps {
  products: Product[]
  onAddToCart: (productId: number) => void
  isAddingToCart?: boolean
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart, isAddingToCart }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          isAddingToCart={isAddingToCart}
        />
      ))}
    </div>
  )
}
