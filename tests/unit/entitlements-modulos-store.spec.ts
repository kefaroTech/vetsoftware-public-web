import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useModulosStore } from '@/features/entitlements/stores/modulos.store'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'

/**
 * El store de «Tus módulos». Lo consumen tanto la pantalla de compra como `useModuloEstado`: las
 * dos deben ver exactamente los mismos datos, así que el store se prueba solo — sin composables
 * encima — para que un fallo aquí no se confunda con uno de ellos.
 */

const listAll = vi.fn()

vi.mock('@/features/entitlements/api/modulos.api', () => ({
  modulosApi: {
    listAll: (...args: unknown[]) => listAll(...args),
  },
}))

function modulo(over: Partial<ModuleShowcaseResponse> = {}): ModuleShowcaseResponse {
  return {
    code: 'SCHEDULING',
    name: 'Agenda',
    shortDescription: 'Citas y calendario',
    state: 'FREE_LIMITED',
    ceilings: [],
    purchasable: true,
    canPurchase: true,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useModulosStore', () => {
  it('cargar() puebla modulos y apaga cargando', async () => {
    listAll.mockResolvedValueOnce([modulo()])
    const store = useModulosStore()

    const promesa = store.cargar()
    expect(store.cargando).toBe(true)
    await promesa

    expect(store.cargando).toBe(false)
    expect(store.modulos).toHaveLength(1)
    expect(store.error).toBeNull()
  })

  it('sin forzar, una segunda llamada reutiliza la caché ya poblada', async () => {
    listAll.mockResolvedValueOnce([modulo()])
    const store = useModulosStore()

    await store.cargar()
    await store.cargar()

    expect(listAll).toHaveBeenCalledTimes(1)
  })

  it('force: true recarga de verdad aunque ya haya datos', async () => {
    listAll.mockResolvedValueOnce([modulo()])
    listAll.mockResolvedValueOnce([modulo({ code: 'CLINICAL_HISTORY' })])
    const store = useModulosStore()

    await store.cargar()
    await store.cargar(true)

    expect(listAll).toHaveBeenCalledTimes(2)
    expect(store.modulos.map((m) => m.code)).toEqual(['CLINICAL_HISTORY'])
  })

  it('dos llamadas concurrentes deduplican en una sola petición en vuelo', async () => {
    let resolver: (v: ModuleShowcaseResponse[]) => void = () => {}
    listAll.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve
      }),
    )
    const store = useModulosStore()

    const a = store.cargar()
    const b = store.cargar()
    resolver([modulo()])
    await Promise.all([a, b])

    expect(listAll).toHaveBeenCalledTimes(1)
  })

  it('un fallo del servidor vacía la lista y deja el mensaje en error', async () => {
    listAll.mockRejectedValueOnce(new Error('caído'))
    const store = useModulosStore()

    await store.cargar()

    expect(store.modulos).toEqual([])
    expect(store.error).toBe('No se pudieron cargar tus módulos')
  })

  it('porCodigo devuelve undefined cuando el módulo no está en el escaparate', async () => {
    listAll.mockResolvedValueOnce([modulo({ code: 'SCHEDULING' })])
    const store = useModulosStore()
    await store.cargar()

    expect(store.porCodigo('SCHEDULING')?.code).toBe('SCHEDULING')
    expect(store.porCodigo('SURGERY')).toBeUndefined()
  })
})
