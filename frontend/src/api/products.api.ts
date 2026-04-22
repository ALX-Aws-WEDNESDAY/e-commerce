import { apiClient } from './client'
import type { Product, ProductFilters, ProductsResponse, Category } from '@/types'

const mapProduct = (data: Record<string, unknown>): Product => ({
  ...data,
  images: data.image ? [{ id: 1, url: data.image as string, is_primary: true }] : [],
} as unknown as Product)

export const productsApi = {
  list: async (filters: ProductFilters = {}) => {
    const { data } = await apiClient.get<ProductsResponse>('/products/', { params: filters })
    return {
      ...data,
      results: data.results.map(mapProduct) as Product[],
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
