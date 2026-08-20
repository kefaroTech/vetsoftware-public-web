import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { SELECTED_BRANCH_KEY } from '@/constants/storageKeys'

/**
 * La sede activa es contexto de SESIÓN, no del dispositivo: decide en qué
 * sucursal se factura, se abre caja y se descuenta stock. Sobrevivía al cierre de
 * sesión por partida doble —la clave en `localStorage` y el `ref` en memoria— y la
 * única función que decía limpiarla («usar al cerrar sesión») ni limpiaba la
 * selección ni la llamaba nadie. El siguiente usuario del mismo equipo empezaba a
 * trabajar sobre la sede del anterior sin haberla elegido (issue #68).
 */

const AUTH_STORAGE_KEY = 'vetsoft.auth'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(AUTH_STORAGE_KEY, '{"token":"t.t.t","type":"EMPLOYEE"}')
  localStorage.setItem(SELECTED_BRANCH_KEY, '7')
})

describe('sede activa y cierre de sesión', () => {
  it('arranca con la sede persistida', () => {
    expect(useBranchStore().selectedBranchId).toBe(7)
  })

  it('al perder la sesión se borra la selección, la cache y la clave', async () => {
    // Sin recarga de página: es el camino del guard del router tras un `/auth/me`
    // fallido, donde el `ref` en memoria sobreviviría al borrado de la clave.
    const branch = useBranchStore()
    expect(branch.selectedBranchId).toBe(7)

    useAuthStore().clearSession()
    await nextTick()

    expect(branch.selectedBranchId).toBeNull()
    expect(branch.loaded).toBe(false)
    expect(localStorage.getItem(SELECTED_BRANCH_KEY)).toBeNull()
  })
})
