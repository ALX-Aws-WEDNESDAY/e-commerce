import { apiClient } from './client'
import type { Product, ProductFilters, ProductsResponse, Category } from '@/types'

/**
 * Normalises raw API product data.
 *
 * The backend may return a flat `image` string instead of an `images` array
 * (e.g. from older endpoints or DRF serialiser differences). This mapper
 * explicitly constructs each required field so TypeScript can verify shape
 * completeness without escaping the type system.
 */
const mapProduct = (data: Record<string, unknown>): Product => ({
  id: data.id as number,
  name: data.name as string,
  slug: data.slug as string,
  description: data.description as string,
  price: data.price as string,
  original_price: data.original_price as string | undefined,
  category: data.category as Product['category'],
  images: data.images
    ? (data.images as Product['images'])
    : data.image
      ? [{ id: 1, url: data.image as string, is_primary: true }]
      : [],
  rating: data.rating as number,
  review_count: data.review_count as number,
  in_stock: data.in_stock as boolean,
  seller: data.seller as string,
  location: data.location as string,
  created_at: data.created_at as string,
})

export const productsApi = {
  list: async (filters: ProductFilters = {}) => {
    const { data } = await apiClient.get<ProductsResponse>('/products/', { params: filters })
    return {
      ...data,
      results: data.results.map(mapProduct),
    }
  },

  detail: async (id: number) => {
    const { data } = await apiClient.get<Record<string, unknown>>(`/products/${id}/`)
    return mapProduct(data)
  },

  categories: async () => {
    const { data } = await apiClient.get<Category[]>('/categories/')
    return data
  },

  featured: async () => {
    const { data } = await apiClient.get<Product[]>('/products/featured/')
    return data.map(mapProduct)
  },
}
