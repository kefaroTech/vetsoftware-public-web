import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useModulosCompra } from '@/features/suscripcion/composables/useModulosCompra'
import { useMediosPagoStore } from '@/features/suscripcion/stores/medios-pago.store'
import type { SubscriptionPaymentMethodResponse } from '@/features/suscripcion/types/medios-pago.types'

const purchase = vi.fn()
vi.mock('@/features/suscripcion/api/modulos.api', () => ({
  compraModulosApi: { purchase: (...args: unknown[]) => purchase(...args) },
}))

const toastSuccess = vi.fn()
const toastErrorFrom = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: toastSuccess,
    errorFrom: toastErrorFrom,
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

function medioActivo(
  over: Partial<SubscriptionPaymentMethodResponse> = {},
): SubscriptionPaymentMethodResponse {
  return {
    id: 7,
    companyId: 1,
    methodKind: 'CARD',
    gateway: 'WOMPI',
    mandateStatus: 'ACTIVE',
    mandateEvidence: '',
    authorizedAt: '2026-01-01',
    defaultMethod: true,
    createdDate: '2026-01-01',
    ...over,
  }
}

beforeEach(() => {
  purchase.mockReset()
  toastSuccess.mockReset()
  toastErrorFrom.mockReset()
})

describe('useModulosCompra · selección', () => {
  it('alterna un código dentro y fuera de la selección', () => {
    const { seleccion, haySeleccion, alternar } = useModulosCompra()

    expect(haySeleccion.value).toBe(false)
    alternar('SCHEDULING', true)
    expect(seleccion.value.has('SCHEDULING')).toBe(true)
    expect(haySeleccion.value).toBe(true)
    alternar('SCHEDULING', false)
    expect(haySeleccion.value).toBe(false)
  })
})

describe('useModulosCompra · medio de pago', () => {
  it('usa el medio activo por defecto de la empresa', () => {
    useMediosPagoStore().methods = [medioActivo()]

    const { paymentSourceId } = useModulosCompra()

    expect(paymentSourceId.value).toBe(7)
  })

  it('sin medio por defecto, usa el recién tokenizado en esta sesión', () => {
    const { paymentSourceId, registrarMedioNuevo } = useModulosCompra()

    expect(paymentSourceId.value).toBeNull()
    registrarMedioNuevo({
      paymentMethodId: 99,
      brand: 'VISA',
      lastFour: '4242',
      expiresOn: '2030-01',
      defaultMethod: false,
    })
    expect(paymentSourceId.value).toBe(99)
  })

  it('un medio revocado no cuenta como medio por defecto', () => {
    useMediosPagoStore().methods = [medioActivo({ mandateStatus: 'REVOKED' })]

    const { paymentSourceId } = useModulosCompra()

    expect(paymentSourceId.value).toBeNull()
  })
})

describe('useModulosCompra · confirmar compra', () => {
  it('no llama al servidor sin medio de pago ni selección', async () => {
    const { confirmarCompra } = useModulosCompra()

    const ok = await confirmarCompra([])

    expect(ok).toBe(false)
    expect(purchase).not.toHaveBeenCalled()
  })

  it('manda catalogItemCodes, ciclo y clientRequestId; limpia la selección y guarda la confirmación', async () => {
    useMediosPagoStore().methods = [medioActivo()]
    purchase.mockResolvedValue({
      quoteId: 1,
      lines: [{ catalogItemCode: 'SCHEDULING', firstChargeDate: '2026-09-30', chargedNow: false }],
    })

    const { alternar, confirmarCompra, confirmacion, seleccion } = useModulosCompra()
    alternar('SCHEDULING', true)
    const ok = await confirmarCompra([{ code: 'SCHEDULING', name: 'Agenda de citas' }])

    expect(ok).toBe(true)
    expect(purchase).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogItemCodes: ['SCHEDULING'],
        paymentSourceId: 7,
        billingCycle: 'MONTHLY',
      }),
    )
    expect(purchase.mock.calls[0]?.[0]?.clientRequestId).toEqual(expect.any(String))
    expect(seleccion.value.size).toBe(0)
    expect(confirmacion.value?.[0]?.nombre).toBe('Agenda de citas')
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('un fallo del servidor no limpia la selección y avisa por `errorFrom`', async () => {
    useMediosPagoStore().methods = [medioActivo()]
    purchase.mockRejectedValue(new Error('falló la pasarela'))

    const { alternar, confirmarCompra, seleccion } = useModulosCompra()
    alternar('SCHEDULING', true)
    const ok = await confirmarCompra([])

    expect(ok).toBe(false)
    expect(seleccion.value.has('SCHEDULING')).toBe(true)
    expect(toastErrorFrom).toHaveBeenCalled()
  })
})
