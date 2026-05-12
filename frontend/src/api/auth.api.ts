import { apiClient } from './client'
import type { LoginPayload, RegisterPayload, User } from '@/types'

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient
      .post<{ access?: string; user: User }>('/users/login/', data)
      .then((r) => ({ user: r.data.user, accessToken: r.data.access })),

  logout: () => apiClient.post('/users/logout/').then((r) => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<{ user: User }>('/users/register/', data).then((r) => r.data.user),

  me: () => apiClient.get<{ user: User }>('/users/me/').then((r) => r.data.user),

  fetchCsrf: () => apiClient.get('/users/csrf/'),
}
