import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import { useAddToCart } from '@/hooks/useCart'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { CategoryPills } from '@/components/products/CategoryPills'
import { ProductGrid } from '@/components/products/ProductGrid'

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('search', val)
    } else {
      newParams.delete('search')
    }
    setSearchParams(newParams, { replace: true })
  }

  const filters: Record<string, string> = {}
  if (category) filters.category = category
  if (search) filters.search = search

  const { data: productsData, isLoading, error } = useProducts(filters)
  const addToCart = useAddToCart()

  const handleAddToCart = (productId: number) => {
    addToCart.mutate({ productId, quantity: 1 })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load products. Please try again.</p>
        </div>
      </div>
    )
  }

  const products = productsData?.results || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 transition-colors">All Products</h1>
        <p className="text-gray-600 dark:text-gray-300 transition-colors">Discover our complete collection of authentic African products</p>
      </div>

      <div className="mb-6 max-w-md">
        <input 
          type="text" 
          placeholder="Search products by name..." 
          className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 rounded-lg focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          value={search || ''}
          onChange={handleSearchChange}
        />
      </div>

      <CategoryPills />

      {products.length === 0 ? (
        <EmptyState
          icon="package"
          title="No products found"
          description="Check back later for new products from our local sellers."
        />
      ) : (
        <ProductGrid products={products} onAddToCart={handleAddToCart} isAddingToCart={addToCart.isPending} />
      )}
    </div>
  )
}