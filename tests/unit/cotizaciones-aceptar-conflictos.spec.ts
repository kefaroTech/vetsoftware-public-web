import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useCotizaciones } from '@/features/suscripcion/composables/useCotizaciones'
import { useToastStore } from '@/stores/toast.store'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'

/**
 * Los 409 de la carrera de cobro en el cambio de plan. El backend redacta
 * `SUBSCRIPTION_HAS_PENDING_GATEWAY_PAYMENT` en inglés y con IDs internos —`errorFrom` lo
 * mostraría tal cual, porque toma el `detail` del backend antes que cualquier `fallback`—, y
 * `QUOTE_ALREADY_CONVERTED` no es un fallo: es la carrera de dos administradoras aceptando la
 * misma propuesta, y la que pierde debe recargar, no ver un error.
 */

const permisos = ['quote.accept', 'quote.reject']
vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    me: { value: { permissions: permisos, branchIds: [] } },
    companyId: { value: 7 },
  }),
}))

const accept = vi.fn()
const findById = vi.fn()
vi.mock('@/features/suscripcion/api/cotizaciones.api', () => ({
  cotizacionesApi: {
    accept: (id: number, payload: unknown) => accept(id, payload),
    findById: (id: number) => findById(id),
    reject: vi.fn(),
    listAll: vi.fn(),
    selfServe: vi.fn(),
  },
}))

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

const OFERTA: QuoteResponse = {
  id: 42,
  quoteNumber: 'COT-2026-0042',
  totalAmount: 300_000,
  status: 'SENT',
  validUntil: '2030-01-01',
}

beforeEach(async () => {
  accept.mockReset()
  findById.mockReset().mockResolvedValue(OFERTA)
  const { loadDetalle } = useCotizaciones()
  await loadDetalle(42)
})

describe('useCotizaciones().aceptar() ante los 409 de la carrera de cobro', () => {
  it('éxito: acepta y avisa', async () => {
    accept.mockResolvedValueOnce({ ...OFERTA, status: 'ACCEPTED' })

    const ok = await useCotizaciones().aceptar('ana@clinica.com')

    expect(ok).toBe(true)
  })

  it('QUOTE_ALREADY_CONVERTED: recarga y lo cuenta como resuelto, no como error', async () => {
    accept.mockRejectedValueOnce(httpError(409, { code: 'QUOTE_ALREADY_CONVERTED' }))
    findById.mockResolvedValueOnce({ ...OFERTA, status: 'ACCEPTED' })

    const ok = await useCotizaciones().aceptar('ana@clinica.com')

    expect(ok).toBe(true)
    expect(findById).toHaveBeenCalledWith(42)
    const toasts = useToastStore().toasts
    expect(toasts.some((t) => t.kind === 'error')).toBe(false)
    expect(toasts.some((t) => t.title === 'Ya se aceptó esta propuesta')).toBe(true)
  })

  it('SUBSCRIPTION_HAS_PENDING_GATEWAY_PAYMENT: traduce, no muestra el detail en inglés', async () => {
    accept.mockRejectedValueOnce(
      httpError(409, {
        code: 'SUBSCRIPTION_HAS_PENDING_GATEWAY_PAYMENT',
        detail: 'Subscription 42 has a pending gateway payment in flight',
      }),
    )

    const ok = await useCotizaciones().aceptar('ana@clinica.com')

    expect(ok).toBe(false)
    const toast = useToastStore().toasts.at(-1)
    expect(toast?.message).not.toMatch(/pending gateway payment/i)
    expect(toast?.message).toContain('Todavía hay un cobro en trámite')
  })

  it('un 409 sin traducción propia cae al mensaje del backend, como antes', async () => {
    accept.mockRejectedValueOnce(
      httpError(409, { code: 'INVALID_QUOTE_STATUS_TRANSITION', detail: 'Ya fue respondida.' }),
    )

    const ok = await useCotizaciones().aceptar('ana@clinica.com')

    expect(ok).toBe(false)
    const toast = useToastStore().toasts.at(-1)
    expect(toast?.message).toBe('Ya fue respondida.')
  })
})
