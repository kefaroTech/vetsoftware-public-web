import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useOwnersStore } from '@/features/clientes/stores/owners.store'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import type { PageResponse } from '@/types/pagination'

/**
 * El store de «Clientes y mascotas» (issue #402): paginación servidor, búsqueda
 * con debounce en el composable de arriba, y las dos rutas de lectura que el
 * backend expone (`GET /owners` sin filtro, `GET /owners/search` con `q`).
 */

const listPage = vi.fn()
const search = vi.fn()
const create = vi.fn()
const update = vi.fn()
const remove = vi.fn()

vi.mock('@/features/dashboard/views/consulta/nueva/api/owner.api', () => ({
  ownerApi: {
    listPage: (...args: unknown[]) => listPage(...args),
    search: (...args: unknown[]) => search(...args),
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
    remove: (...args: unknown[]) => remove(...args),
    findById: vi.fn(),
  },
}))

function ownerResponse(over: Partial<OwnerResponse> = {}): OwnerResponse {
  return {
    id: 1,
    name: 'Ana Restrepo',
    email: 'ana@correo.com',
    document: '123456',
    address: 'Cra 7',
    phone: '3001234567',
    city: { id: 9, name: 'Medellín' },
    company: { id: 1, name: 'Clínica', identifier: '900123' },
    createdDate: '2026-01-01T00:00:00',
    documentType: 'CEDULA_CIUDADANIA',
    personType: 'NATURAL',
    verificationDigit: null,
    legalName: null,
    withholdingAgent: false,
    taxRegime: 'NO_RESPONSABLE_IVA',
    fiscalResponsibility: 'NO_APLICA',
    ...over,
  }
}

function page(content: OwnerResponse[], over: Partial<PageResponse<OwnerResponse>> = {}) {
  return {
    content,
    page: 0,
    pageSize: 20,
    totalElements: content.length,
    totalPages: 1,
    ...over,
  } as PageResponse<OwnerResponse>
}

/** Mismo criterio que `http-client.spec.ts`: `getProblemDetailMessage` solo lee `AxiosError`. */
function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    config,
    null,
    response,
  )
}

describe('useOwnersStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin texto de búsqueda llama a listPage, no a search', async () => {
    listPage.mockResolvedValueOnce(page([ownerResponse()]))
    const store = useOwnersStore()

    await store.search()

    expect(listPage).toHaveBeenCalledWith(0, store.pageSize)
    expect(search).not.toHaveBeenCalled()
    expect(store.owners).toHaveLength(1)
    expect(store.owners[0]?.name).toBe('Ana Restrepo')
  })

  it('con texto de búsqueda llama a /owners/search con el término recortado', async () => {
    search.mockResolvedValueOnce(page([ownerResponse({ name: 'Milo' })]))
    const store = useOwnersStore()

    await store.setQuery('  milo  ')

    expect(search).toHaveBeenCalledWith('milo', 0, store.pageSize)
    expect(store.page).toBe(1)
  })

  it('cambiar de página retrocede sola si la página quedó vacía tras un borrado', async () => {
    const store = useOwnersStore()
    store.page = 3
    listPage.mockResolvedValueOnce(page([], { totalElements: 2, totalPages: 1 }))
    listPage.mockResolvedValueOnce(page([ownerResponse()], { totalElements: 2, totalPages: 1 }))

    await store.search()

    expect(store.page).toBe(1)
    expect(listPage).toHaveBeenCalledTimes(2)
  })

  it('reset invalida una búsqueda en vuelo: su respuesta tardía no repuebla el estado', async () => {
    const store = useOwnersStore()
    let resolveFirst: (v: PageResponse<OwnerResponse>) => void = () => {}
    listPage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve
      }),
    )

    const primeraBusqueda = store.search()
    store.reset()
    resolveFirst(page([ownerResponse()]))
    await primeraBusqueda

    expect(store.owners).toHaveLength(0)
  })

  it('create refresca la página actual y devuelve el cliente creado', async () => {
    create.mockResolvedValueOnce(ownerResponse({ id: 7, name: 'Nuevo Cliente' }))
    listPage.mockResolvedValueOnce(page([ownerResponse({ id: 7, name: 'Nuevo Cliente' })]))
    const store = useOwnersStore()

    const created = await store.create({
      name: 'Nuevo Cliente',
      document: '999',
      phone: '3000000000',
      email: '',
      documentType: 'CEDULA_CIUDADANIA',
      personType: 'NATURAL',
      address: '',
      cityId: 9,
    })

    expect(created.id).toBe('7')
    expect(listPage).toHaveBeenCalledTimes(1)
  })

  it('update reemplaza solo el cliente afectado en la lista ya cargada', async () => {
    listPage.mockResolvedValueOnce(
      page([ownerResponse({ id: 1, name: 'Uno' }), ownerResponse({ id: 2, name: 'Dos' })], {
        totalElements: 2,
      }),
    )
    const store = useOwnersStore()
    await store.search()

    update.mockResolvedValueOnce(ownerResponse({ id: 2, name: 'Dos actualizado' }))
    await store.update(2, {
      name: 'Dos actualizado',
      document: '999',
      phone: '',
      email: '',
      documentType: 'CEDULA_CIUDADANIA',
      personType: 'NATURAL',
      address: '',
      cityId: 9,
    })

    expect(store.owners.map((o) => o.name)).toEqual(['Uno', 'Dos actualizado'])
  })

  it('un fallo del servidor deja el mensaje del ProblemDetail en error y relanza', async () => {
    listPage.mockRejectedValueOnce(
      httpError(403, { detail: 'No tienes permiso para ver clientes.' }),
    )
    const store = useOwnersStore()

    await expect(store.search()).rejects.toBeTruthy()
    expect(store.error).toBe('No tienes permiso para ver clientes.')
    expect(store.loading).toBe(false)
  })
})
