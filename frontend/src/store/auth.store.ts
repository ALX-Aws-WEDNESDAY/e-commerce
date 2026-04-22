import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

type AuthStore = {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
  refreshToken: string | null
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearUser: () => set({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      merge: (_persisted, current) => {
        const persisted = _persisted as Partial<AuthStore>
        return {
          ...current,
          user: persisted.user ?? null,
          isAuthenticated: persisted.isAuthenticated ?? false,
          // Tokens are never rehydrated from localStorage — in-memory only
          accessToken: null,
          refreshToken: null,
        }
      },
    }
  )
)