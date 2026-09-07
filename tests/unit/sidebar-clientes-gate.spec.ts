import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import type { MeResponse } from '@/features/auth/types'

/**
 * Gate de «Clientes y mascotas» (issue #402): la entrada es la única pantalla
 * de propietarios/mascotas para una empresa que solo contrató CORE, así que
 * tiene que aparecer con CUALQUIERA de los dos permisos de lectura —no exigir
 * los dos a la vez, que es el defecto que ya sufrió «Mi suscripción»— y
 * desaparecer sin ninguno de los dos.
 */

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home', fullPath: '/' }),
  useRouter: () => ({ push }),
}))

function empleado(permissions: string[]): MeResponse {
  return {
    id: 1,
    type: 'EMPLOYEE',
    companyId: 1,
    name: 'Empleado de prueba',
    employeeCode: 'EP',
    mustChangePassword: false,
    permissions,
    branchIds: [1],
  } as MeResponse
}

function montar() {
  return mount(AppSidebar, {
    global: {
      stubs: { BranchSelector: true, SidebarSubItem: true, RouterLink: true },
    },
  })
}

beforeEach(() => {
  useAuthStore().me = null
  push.mockClear()
})

describe('AppSidebar — entrada «Clientes y mascotas» (#402)', () => {
  it('no aparece sin owner.read ni animal.read', () => {
    useAuthStore().me = empleado([])
    const wrapper = montar()

    expect(wrapper.text()).not.toContain('Clientes y mascotas')
  })

  it('aparece con owner.read solo', () => {
    useAuthStore().me = empleado([PERMISSIONS.OWNER_READ])
    const wrapper = montar()

    expect(wrapper.text()).toContain('Clientes y mascotas')
  })

  it('aparece con animal.read solo, sin owner.read', () => {
    useAuthStore().me = empleado([PERMISSIONS.ANIMAL_READ])
    const wrapper = montar()

    expect(wrapper.text()).toContain('Clientes y mascotas')
  })

  it('un click navega a la ruta `clientes`', async () => {
    useAuthStore().me = empleado([PERMISSIONS.OWNER_READ])
    const wrapper = montar()

    const items = wrapper.findAllComponents({ name: 'SidebarNavItem' })
    const clientes = items.find((i) => i.props('label') === 'Clientes y mascotas')
    expect(clientes).toBeTruthy()

    await clientes?.trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'clientes' })
  })
})
