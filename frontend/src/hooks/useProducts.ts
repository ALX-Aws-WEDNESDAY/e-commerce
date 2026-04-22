import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api'
import type { ProductFilters } from '@/types'

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => [...productKeys.all, 'list', filters] as const,
  detail: (id: number) => [...productKeys.all, 'detail', id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
  featured: () => [...productKeys.all, 'featured'] as const,
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsApi.list(filters),
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.detail(id),
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: productsApi.categories,
    staleTime: 1000 * 60 * 10, // categories rarely change — cache 10min
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: productKeys.featured(),
    queryFn: productsApi.featured,
  })
}
