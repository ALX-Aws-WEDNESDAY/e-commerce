import { apiClient } from './client'
import type { Order, CreateOrderPayload } from '@/types'

export const ordersApi = {
  create: async (data: CreateOrderPayload) => {
    const { data: response } = await apiClient.post<Order>('/orders/', data)
    return response
  },

  list: async () => {
    const { data } = await apiClient.get<Order[]>('/orders/')
    return data
  },

  detail: async (id: number) => {
    const { data } = await apiClient.get<Order>(`/orders/${id}/`)
    return data
  },
}
