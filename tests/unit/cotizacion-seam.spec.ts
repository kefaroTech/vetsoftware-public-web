import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  componerCotizacion,
  esLimiteDeCotizaciones,
  previsualizarCotizacion,
  segundosDeEspera,
} from '@/features/landing/api/cotizacion.source'
import type { QuotePreviewResponse } from '@/features/landing/types/cotizacion.types'
import { http } from '@/services/http/http.client'
import { elemento } from '../helpers/exigir'

/**
 * El seam de la calculadora pública: qué sale por el cable y qué se hace con lo
 * que entra.
 *
 * <p>Lo que se fija aquí es lo que ningún componente puede volver a decidir: el
 * vocabulario del contrato no sale de este fichero, el velo global no se levanta
 * sobre la portada, y un hueco de la respuesta se propaga en vez de aplanarse a
 * cero.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const post = vi.mocked(http.post)

function respuesta(over: Partial<QuotePreviewResponse> = {}): QuotePreviewResponse {
  return {
    currency: 'COP',
    billingCycle: 'MONTHLY',
    lines: [
      {
        code: 'CORE',
        name: 'Núcleo: clientes y mascotas',
        contractedQuantity: 1,
        includedQuantity: 0,
        quantity: 1,
        unitAmount: 69_000,
        grossAmount: 69_000,
        taxRate: 19,
        taxTreatment: 'TAXED',
        taxAmount: 13_110,
        lineTotal: 82_110,
      },
    ],
    subtotalAmount: 69_000,
    discountAmount: 0,
    taxAmount: 13_110,
    totalAmount: 82_110,
    ...over,
  }
}

beforeEach(() => {
  post.mockReset()
})

describe('lo que sale por el cable', () => {
  it('traduce el ciclo al vocabulario del contrato y manda las líneas tal cual', async () => {
    post.mockResolvedValue({ data: respuesta() })

    await previsualizarCotizacion({ ciclo: 'MENSUAL', lineas: [{ code: 'CORE', quantity: 1 }] })

    expect(post).toHaveBeenCalledWith(
      '/quotes/preview',
      { billingCycle: 'MONTHLY', lines: [{ code: 'CORE', quantity: 1 }] },
      expect.objectContaining({ skipGlobalLoader: true }),
    )
  })

  it('el ciclo anual viaja como ANNUAL', async () => {
    post.mockResolvedValue({ data: respuesta({ billingCycle: 'ANNUAL' }) })

    await previsualizarCotizacion({ ciclo: 'ANUAL', lineas: [{ code: 'CORE', quantity: 1 }] })

    expect(post.mock.calls[0]?.[1]).toMatchObject({ billingCycle: 'ANNUAL' })
  })

  /** Sin `signal` no se puede cancelar la anterior, y cada viaje cuenta contra el límite por IP. */
  it('pasa el AbortSignal que le den', async () => {
    post.mockResolvedValue({ data: respuesta() })
    const ctrl = new AbortController()

    await previsualizarCotizacion(
      { ciclo: 'MENSUAL', lineas: [{ code: 'CORE', quantity: 1 }] },
      ctrl.signal,
    )

    expect(post.mock.calls[0]?.[2]).toMatchObject({ signal: ctrl.signal })
  })
})

describe('lo que entra', () => {
  it('devuelve la cotización con el vocabulario de la pantalla', () => {
    const cotizacion = componerCotizacion(respuesta({ billingCycle: 'ANNUAL' }))

    expect(cotizacion.ciclo).toBe('ANUAL')
    expect(cotizacion.moneda).toBe('COP')
    expect(cotizacion.subtotal).toBe(69_000)
    expect(elemento(cotizacion.lineas, 0).nombre).toBe('Núcleo: clientes y mascotas')
  })

  /**
   * Un renglón por tramo, no por artículo: trece usuarios adicionales salen como
   * dos renglones con el mismo `code`. Indexar por código perdería el segundo.
   */
  it('conserva los renglones repetidos de un mismo artículo', () => {
    const cotizacion = componerCotizacion(
      respuesta({
        lines: [
          { ...elemento(respuesta().lines, 0), code: 'EXTRA_USER', quantity: 8 },
          { ...elemento(respuesta().lines, 0), code: 'EXTRA_USER', quantity: 5 },
        ],
      }),
    )

    expect(cotizacion.lineas.map((l) => l.cobradas)).toEqual([8, 5])
  })

  it('un importe que el servidor no dijo se queda en null, no en cero', () => {
    const cotizacion = componerCotizacion(
      respuesta({
        lines: [{ ...elemento(respuesta().lines, 0), unitAmount: null, taxRate: null }],
      }),
    )

    expect(elemento(cotizacion.lineas, 0).importeUnitario).toBeNull()
    expect(elemento(cotizacion.lineas, 0).taxRate).toBeNull()
  })
})

describe('el límite por IP se distingue de cualquier otro fallo', () => {
  const limite = {
    response: {
      status: 429,
      data: { code: 'QUOTE_PREVIEW_RATE_LIMITED' },
      headers: { 'retry-after': '60' },
    },
  }

  it('reconoce el 429 con su código de negocio', () => {
    expect(esLimiteDeCotizaciones(limite)).toBe(true)
  })

  it('no confunde otro 429 ni otro código con el cupo de cotizaciones', () => {
    expect(esLimiteDeCotizaciones({ response: { status: 429, data: {} } })).toBe(false)
    expect(
      esLimiteDeCotizaciones({ response: { status: 400, data: { code: 'INVALID_INPUT' } } }),
    ).toBe(false)
    expect(esLimiteDeCotizaciones(new Error('Network Error'))).toBe(false)
  })

  it('lee los segundos de Retry-After', () => {
    expect(segundosDeEspera(limite)).toBe(60)
  })

  /** Sin cabecera legible el llamador espera su ventana entera: adivinar a la baja es reintentar en falso. */
  it('devuelve null cuando la cabecera no llega o no es un plazo', () => {
    expect(segundosDeEspera({ response: { status: 429, headers: {} } })).toBeNull()
    expect(
      segundosDeEspera({ response: { headers: { 'retry-after': 'Wed, 21 Oct 2026' } } }),
    ).toBeNull()
    expect(segundosDeEspera({ response: { headers: { 'retry-after': '0' } } })).toBeNull()
  })
})
