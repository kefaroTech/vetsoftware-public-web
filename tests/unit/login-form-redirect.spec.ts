import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import type * as UseAuthModulo from '@/features/auth/composables/useAuth'

/**
 * A dónde navega tras autenticar (issue #53). El guard del router deja el
 * destino original en `?redirect=`; este es el único punto del front público
 * donde ese valor se consume y se decide la navegación tras el login (aquí no
 * hay un `useAuth().login()` que navegue por su cuenta, a diferencia del
 * gemelo de la consola — ver `use-auth.spec.ts` para el saneamiento en sí).
 */

const push = vi.fn()
const currentRoute = { query: {} as Record<string, unknown> }
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => currentRoute,
}))

const login = vi.fn()
vi.mock('@/features/auth/composables/useAuth', async () => {
  const actual = await vi.importActual<typeof UseAuthModulo>('@/features/auth/composables/useAuth')
  return { ...actual, useAuth: () => ({ login }) }
})

const loginEmployee = vi.fn()
vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: { loginEmployee: (payload: unknown) => loginEmployee(payload) },
}))

beforeEach(() => {
  push.mockReset()
  login.mockReset()
  login.mockResolvedValue(undefined)
  loginEmployee.mockReset()
  loginEmployee.mockResolvedValue({ token: 'tok', type: 'EMPLOYEE' })
  currentRoute.query = {}
})

async function submit() {
  const wrapper = mount(LoginForm, { global: { stubs: { RouterLink: true } } })
  await wrapper.find('input[autocomplete="username"]').setValue('ADMIN-001')
  await wrapper.find('input[autocomplete="current-password"]').setValue('secreta')
  await wrapper.find('form').trigger('submit.prevent')
  await Promise.resolve()
  await Promise.resolve()
}

describe('LoginForm: destino tras autenticar', () => {
  it('vuelve a la ruta que el guard recordó en ?redirect=', async () => {
    currentRoute.query = { redirect: '/dashboard/agenda' }

    await submit()

    expect(push).toHaveBeenCalledWith('/dashboard/agenda')
  })

  it('ignora un ?redirect= que no sea una ruta interna y cae al home', async () => {
    // Sin este filtro, `?redirect=` sería un open redirect.
    currentRoute.query = { redirect: 'https://evil.example.com' }

    await submit()

    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('sin ?redirect= cae al home, como antes', async () => {
    await submit()

    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })
})
