import { computed, ref } from 'vue'
import { AUTH_STORAGE_KEY } from '@/services/http/http.client'
import type { AuthSession } from '../types'

function loadInitial(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (parsed?.token && parsed?.type) {
      return { token: parsed.token, type: parsed.type }
    }
    return null
  } catch {
    return null
  }
}

const session = ref<AuthSession | null>(loadInitial())

export function useAuth() {
  function login(next: AuthSession) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    session.value = next
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    session.value = null
  }

  return {
    session: computed(() => session.value),
    isAuthenticated: computed(() => session.value !== null),
    login,
    logout,
  }
}

export function getToken(): string | null {
  return session.value?.token ?? null
}
