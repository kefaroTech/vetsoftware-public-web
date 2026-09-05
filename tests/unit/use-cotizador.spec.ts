import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { fetchCatalogo } from '@/features/asistente/api/catalogo.source'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import type * as cotizacionSource from '@/features/landing/api/cotizacion.source'
import { previsualizarCotizacion } from '@/features/landing/api/cotizacion.source'
import type { CotizacionPreview } from '@/features/landing/types/cotizacion.types'
import { useCotizador } from '@/features/landing/composables/useCotizador'
import { elemento } from '../helpers/exigir'

/**
 * La coreografía del importe: cuándo se pide, cuándo se anuncia y qué se enseña
 * mientras tanto.
 *
 * <p>Las cuatro cosas que se fijan aquí son las que no se ven en una captura y
 * cuestan dinero o confianza: que una ráfaga de clics produzca UNA petición
 * —el cupo por IP es de sesenta al minuto—, que la respuesta que llega tarde no
 * pise a la que vale, que una cifra caducada nunca se presente como la nueva, y
 * que agotar el cupo no se cuente como una avería.
 */

vi.mock('@/features/asistente/api/catalogo.source', () => ({ fetchCatalogo: vi.fn() }))

vi.mock('@/features/landing/api/cotizacion.source', async (original) => ({
  ...(await original<typeof cotizacionSource>()),
  previsualizarCotizacion: vi.fn(),
}))

const traerCatalogo = vi.mocked(fetchCatalogo)
const pedirCotizacion = vi.mocked(previsualizarCotizacion)

const CATALOGO: CatalogoComercial = {
  currency: 'COP',
  priceValidFrom: '2026-08-27',
  articulos: [
    {
      code: 'CORE',
      nombre: 'Núcleo: clientes y mascotas',
      descripcion: '',
      grupo: null,
      importe: 69_000,
      taxRate: 19,
      taxTreatment: 'TAXED',
      trialDays: 30,
      obligatorio: true,
      vendible: true,
      areaCode: null,
      shortLabel: 'Núcleo',
    },
    {
      code: 'SCHEDULING',
      nombre: 'Agenda de citas',
      descripcion: '',
      grupo: null,
      importe: 35_000,
      taxRate: 19,
      taxTreatment: 'TAXED',
      trialDays: 30,
      obligatorio: false,
      vendible: true,
      areaCode: 'PATIENT_CARE',
      shortLabel: 'Agenda de citas',
    },
    {
      code: 'CLINICAL_HISTORY',
      nombre: 'Historia clínica y consultas',
      descripcion: '',
      grupo: null,
      importe: 49_000,
      taxRate: 19,
      taxTreatment: 'TAXED',
      trialDays: 30,
      obligatorio: false,
      vendible: true,
      areaCode: 'PATIENT_CARE',
      shortLabel: 'Historia clínica',
    },
  ],
  capacidades: [],
  paquetes: [],
  arcos: [],
  areas: [{ code: 'PATIENT_CARE', nombre: 'Atención a los pacientes' }],
}

function cotizacion(subtotal = 104_000): CotizacionPreview {
  return {
    moneda: 'COP',
    ciclo: 'MENSUAL',
    lineas: [],
    subtotal,
    descuento: 0,
    impuesto: Math.round(subtotal * 0.19),
    total: Math.round(subtotal * 1.19),
  }
}

function montar() {
  let cotizador!: ReturnType<typeof useCotizador>
  const wrapper = mount(
    defineComponent({
      setup() {
        cotizador = useCotizador()
        return () => h('div')
      },
    }),
  )
  return { cotizador, wrapper }
}

/** Monta y deja el catálogo cargado, que es de donde arranca toda la coreografía. */
async function conCatalogo() {
  const montado = montar()
  await flushPromises()
  return montado
}

beforeEach(() => {
  vi.useFakeTimers()
  traerCatalogo.mockReset().mockResolvedValue(CATALOGO)
  pedirCotizacion.mockReset().mockResolvedValue(cotizacion())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('el debounce y la cancelación', () => {
  it('no pide nada antes de los 500 ms de silencio', async () => {
    const { cotizador } = await conCatalogo()
    cotizador.modulos.value = ['SCHEDULING']

    await vi.advanceTimersByTimeAsync(499)

    expect(pedirCotizacion).not.toHaveBeenCalled()
  })

  it('tres cambios seguidos producen UNA sola petición', async () => {
    const { cotizador } = await conCatalogo()

    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(100)
    cotizador.modulos.value = ['SCHEDULING', 'CLINICAL_HISTORY']
    await vi.advanceTimersByTimeAsync(100)
    cotizador.modulos.value = ['CLINICAL_HISTORY']
    await vi.advanceTimersByTimeAsync(600)

    expect(pedirCotizacion).toHaveBeenCalledTimes(1)
    expect(elemento(pedirCotizacion.mock.calls, 0)[0].lineas.map((l) => l.code)).toEqual([
      'CORE',
      'CLINICAL_HISTORY',
    ])
  })

  /**
   * Sin abortar, la respuesta de la selección anterior puede llegar después y
   * escribir su importe encima del que el usuario está mirando.
   */
  it('aborta la petición en vuelo cuando la selección vuelve a cambiar', async () => {
    const { cotizador } = await conCatalogo()
    const senales: (AbortSignal | undefined)[] = []
    pedirCotizacion.mockImplementation(async (_args, signal) => {
      senales.push(signal)
      return cotizacion()
    })

    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(600)
    cotizador.modulos.value = ['CLINICAL_HISTORY']
    await vi.advanceTimersByTimeAsync(600)

    expect(senales).toHaveLength(2)
    expect(elemento(senales, 0)?.aborted).toBe(true)
    expect(elemento(senales, 1)?.aborted).toBe(false)
  })

  it('corta lo que haya en vuelo al desmontar', async () => {
    const { cotizador, wrapper } = await conCatalogo()
    const senales: (AbortSignal | undefined)[] = []
    pedirCotizacion.mockImplementation(async (_args, signal) => {
      senales.push(signal)
      return cotizacion()
    })

    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(600)
    wrapper.unmount()

    expect(elemento(senales, 0)?.aborted).toBe(true)
  })
})

describe('los cuatro estados del importe', () => {
  it('arranca calculando y no afirma ninguna cifra', () => {
    const { cotizador } = montar()

    expect(cotizador.estado.value).toBe('CALCULANDO')
    expect(cotizador.importe.value).toBe('—')
  })

  it('queda listo con el importe del servidor', async () => {
    const { cotizador } = await conCatalogo()

    await vi.advanceTimersByTimeAsync(600)

    expect(cotizador.estado.value).toBe('LISTO')
    // El TOTAL del servidor, no el subtotal: la cifra que se pinta lleva el IVA
    // dentro y no se calcula en el navegador.
    expect(cotizador.importe.value).toContain('123.760')
    expect(cotizador.regionViva.value).toContain('Solo clientes y mascotas')
    expect(cotizador.regionViva.value).toContain('IVA incluido')
  })

  /** La cifra anterior se destruye: enseñarla junto a un aviso la presenta como la nueva. */
  it('el fallo borra la cifra y deja el camino abierto', async () => {
    const { cotizador } = await conCatalogo()
    await vi.advanceTimersByTimeAsync(600)
    pedirCotizacion.mockRejectedValue(new Error('Network Error'))

    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(600)

    expect(cotizador.estado.value).toBe('ERROR')
    expect(cotizador.importe.value).toBe('—')
    expect(cotizador.mensajeDeFallo.value).toContain('Puedes seguir')
  })

  it('sin tarifa publicada no hay cifra que calcular', async () => {
    traerCatalogo.mockResolvedValue({ ...CATALOGO, articulos: [], currency: null })

    const { cotizador } = await conCatalogo()

    expect(cotizador.estado.value).toBe('SIN_CATALOGO')
    expect(pedirCotizacion).not.toHaveBeenCalled()
  })

  it('solo admite decir «calculando» pasado el segundo', async () => {
    const { cotizador } = await conCatalogo()
    pedirCotizacion.mockImplementation(() => new Promise(() => {}))

    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(600)
    expect(cotizador.lento.value).toBe(false)

    await vi.advanceTimersByTimeAsync(500)
    expect(cotizador.lento.value).toBe(true)
    expect(cotizador.regionViva.value).toBe('Calculando el precio.')
  })
})

describe('el cupo por IP no es una avería', () => {
  const LIMITE = {
    response: {
      status: 429,
      data: { code: 'QUOTE_PREVIEW_RATE_LIMITED' },
      headers: { 'retry-after': '60' },
    },
  }

  it('lo dice con su propio texto y deja de pedir mientras dura', async () => {
    const { cotizador } = await conCatalogo()
    pedirCotizacion.mockRejectedValue(LIMITE)

    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(600)

    expect(cotizador.limitado.value).toBe(true)
    expect(cotizador.mensajeDeFallo.value).toContain('muchas consultas')

    cotizador.modulos.value = ['CLINICAL_HISTORY']
    await vi.advanceTimersByTimeAsync(600)
    expect(pedirCotizacion).toHaveBeenCalledTimes(1)
  })

  it('vuelve a calcular cuando pasa el plazo que pidió el servidor', async () => {
    const { cotizador } = await conCatalogo()
    pedirCotizacion.mockRejectedValue(LIMITE)
    cotizador.modulos.value = ['SCHEDULING']
    await vi.advanceTimersByTimeAsync(600)

    pedirCotizacion.mockResolvedValue(cotizacion(139_000))
    await vi.advanceTimersByTimeAsync(60_000)
    await vi.advanceTimersByTimeAsync(600)

    expect(cotizador.limitado.value).toBe(false)
    expect(cotizador.estado.value).toBe('LISTO')
    expect(cotizador.importe.value).toContain('165.410')
  })
})
