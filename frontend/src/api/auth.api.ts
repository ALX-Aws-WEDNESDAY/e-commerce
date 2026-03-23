import { apiClient } from './client'
import type { LoginPayload, RegisterPayload, User } from '@/types'

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<{ access?: string; user: User }>('/users/login/', data).then((r) => {
      if (r.data.access) {
        localStorage.setItem('access_token', r.data.access)
      }
      return r.data.user as User
    }),

  logout: () =>
    apiClient.post('/users/logout/').then((r) => {
      localStorage.removeItem('access_token')
      return r.data
    }),

  register: (data: RegisterPayload) =>
    apiClient.post<{ user: User }>('/users/register/', data).then((r) => r.data.user as User),

  me: () =>
    apiClient.get<{ user: User }>('/users/me/').then((r) => r.data.user as User),

  // Fetches CSRF cookie from Django before any auth mutation
  fetchCsrf: () =>
    apiClient.get('/users/csrf/'),
}
