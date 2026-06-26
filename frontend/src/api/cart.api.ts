import { apiClient } from './client'
import type { Cart } from '@/types'

export const cartApi = {
  get: async () => {
    const { data } = await apiClient.get<Cart>('/cart/')
    return data
  },

  addItem: async (productId: number, quantity: number = 1) => {
    const { data } = await apiClient.post<Cart>('/cart/items/', { product_id: productId, quantity })
    return data
  },

  updateItem: async (itemId: number, quantity: number) => {
    const { data } = await apiClient.patch<Cart>(`/cart/items/${itemId}/`, { quantity })
    return data
  },

  removeItem: async (itemId: number) => {
    await apiClient.delete(`/cart/items/${itemId}/`)
  },

  clear: async () => {
    await apiClient.delete('/cart/')
  },
}
