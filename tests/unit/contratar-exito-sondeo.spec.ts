import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ContratarExitoView from '@/features/contratacion/views/ContratarExitoView.vue'
import { useResultadoContratacionStore } from '@/features/contratacion/stores/resultadoContratacion.store'
import type { ResultadoContratacion } from '@/features/contratacion/types/contratacion.types'
import type { FirstPeriodPaymentResponse } from '@/features/contratacion/types/pago.types'

/**
 * EL SONDEO DEL PASO 7.
 *
 * `wompiApi.primerPago()` nace `PENDING` siempre en Wompi (§2 de la especificación: la
 * transacción «siempre nace PENDING»), así que esta pantalla no puede pintar el desenlace con la
 * primera respuesta — tiene que seguir preguntando hasta que Wompi conteste algo final, o hasta
 * que el plazo se agote y quede el aviso de «seguimos confirmando».
 */

const push = vi.fn()
const replace = vi.fn()
const primerPago = vi.fn<() => Promise<FirstPeriodPaymentResponse>>()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/features/contratacion/api/pago.api', () => ({
  wompiApi: { primerPago: () => primerPago() },
}))

function resultado(over: Partial<ResultadoContratacion> = {}): ResultadoContratacion {
  return {
    origen: 'PLAN',
    titulo: 'Pack Clínica',
    empresaNombre: 'Clínica Norte',
    modulosActivados: ['Núcleo', 'Agenda'],
    lineasPrueba: [
      {
        code: 'CORE',
        name: 'Núcleo',
        trialEndDate: '2026-09-28',
        trialDays: 30,
        precioDespues: null,
      },
    ],
    subtotal: 189_000,
    impuesto: 35_910,
    total: 224_910,
    ciclo: 'MENSUAL',
    cotizacionId: 55,
    cotizacionNumero: 'COT-2026-0055',
    validaHasta: '2026-09-13',
    pago: null,
    ...over,
  }
}

async function montar() {
  useResultadoContratacionStore().guardar(resultado())
  const wrapper = mount(ContratarExitoView)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers()
  push.mockReset()
  replace.mockReset()
  primerPago.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('el sondeo se detiene en un estado FINAL', () => {
  it('APPROVED en el primer intento: pinta el aviso y no vuelve a preguntar', async () => {
    primerPago.mockResolvedValue({
      status: 'APPROVED',
      amount: 224_910,
      currency: 'COP',
      gatewayReference: 'tr_1',
      attemptedAt: '2026-09-05T10:00:00Z',
    })

    const wrapper = await montar()

    expect(wrapper.text()).toContain('Pago aprobado: tu plan está activo.')
    expect(primerPago).toHaveBeenCalledTimes(1)

    // Nada más que preguntar: avanzar el reloj no dispara una segunda llamada.
    await vi.advanceTimersByTimeAsync(20_000)
    expect(primerPago).toHaveBeenCalledTimes(1)
  })

  it('DECLINED: pinta el aviso con el enlace a Medios de pago', async () => {
    primerPago.mockResolvedValue({
      status: 'DECLINED',
      amount: 224_910,
      currency: 'COP',
      gatewayReference: 'tr_2',
      attemptedAt: '2026-09-05T10:00:00Z',
    })

    const wrapper = await montar()

    expect(wrapper.text()).toContain('No pudimos cobrar tu tarjeta.')
    expect(wrapper.text()).toContain('Actualiza tu medio de pago')
  })

  it('guarda el estado del pago en el store, para quien recargue esta misma pestaña', async () => {
    primerPago.mockResolvedValue({
      status: 'APPROVED',
      amount: 224_910,
      currency: 'COP',
      gatewayReference: 'tr_3',
      attemptedAt: '2026-09-05T10:00:00Z',
    })

    await montar()

    expect(useResultadoContratacionStore().resultado?.pago).toEqual({
      status: 'APPROVED',
      amount: 224_910,
      currency: 'COP',
    })
  })
})

describe('mientras Wompi no responde algo final', () => {
  it('PENDING: sigue preguntando cada 2 s', async () => {
    primerPago.mockResolvedValue({
      status: 'PENDING',
      amount: null,
      currency: null,
      gatewayReference: 'tr_4',
      attemptedAt: null,
    })

    const wrapper = await montar()

    expect(wrapper.text()).toContain('Estamos confirmando el pago con tu banco; te avisaremos.')
    expect(primerPago).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2000)
    expect(primerPago).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(2000)
    expect(primerPago).toHaveBeenCalledTimes(3)
  })

  it('agota el plazo de 20 s y deja de preguntar, sin fingir un desenlace', async () => {
    primerPago.mockResolvedValue({
      status: 'PENDING',
      amount: null,
      currency: null,
      gatewayReference: 'tr_5',
      attemptedAt: null,
    })

    await montar()
    await vi.advanceTimersByTimeAsync(20_000)

    // 1 al montar + hasta 9 más cada 2 s dentro de los 20 s del plazo.
    const llamadas = primerPago.mock.calls.length
    expect(llamadas).toBeGreaterThan(1)
    expect(llamadas).toBeLessThanOrEqual(10)

    // Pasado el plazo, no se sigue preguntando.
    primerPago.mockClear()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(primerPago).not.toHaveBeenCalled()
  })

  it('se resuelve a APPROVED durante el sondeo: dos preguntas, no una', async () => {
    primerPago
      .mockResolvedValueOnce({
        status: 'PENDING',
        amount: null,
        currency: null,
        gatewayReference: 'tr_6',
        attemptedAt: null,
      })
      .mockResolvedValueOnce({
        status: 'APPROVED',
        amount: 224_910,
        currency: 'COP',
        gatewayReference: 'tr_6',
        attemptedAt: '2026-09-05T10:00:05Z',
      })

    const wrapper = await montar()
    expect(wrapper.text()).toContain('Estamos confirmando el pago con tu banco')

    await vi.advanceTimersByTimeAsync(2000)

    expect(primerPago).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Pago aprobado: tu plan está activo.')

    // Y deja de preguntar: ya llegó a un estado final.
    await vi.advanceTimersByTimeAsync(10_000)
    expect(primerPago).toHaveBeenCalledTimes(2)
  })
})

describe('sin resultado en el store', () => {
  it('manda al tablero en vez de sondear nada', async () => {
    primerPago.mockResolvedValue({
      status: 'APPROVED',
      amount: 1,
      currency: 'COP',
      gatewayReference: 'x',
      attemptedAt: null,
    })

    mount(ContratarExitoView)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({ name: 'home' })
    expect(primerPago).not.toHaveBeenCalled()
  })
})
