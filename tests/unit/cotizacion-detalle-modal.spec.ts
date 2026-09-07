import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CotizacionDetalleView from '@/features/suscripcion/views/CotizacionDetalleView.vue'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'

/**
 * Un 409 al aceptar una propuesta no puede cerrar el modal como si hubiera tenido éxito
 * — el toast de error es la única pista que le queda al usuario si el formulario desaparece.
 */

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
  // `ModalShell` (vía `useModalHistory`) llama a `useRouter()` con o sin router instalado: sin
  // este stub, sustituir el módulo entero deja el import sin resolver.
  useRouter: () => undefined,
}))

const OFERTA: QuoteResponse = {
  id: 42,
  quoteNumber: 'COT-2026-0042',
  totalAmount: 300_000,
  status: 'SENT',
  validUntil: '2030-01-01',
}

const aceptar = vi.fn()
const loadDetalle = vi.fn()
vi.mock('@/features/suscripcion/composables/useCotizaciones', () => ({
  useCotizaciones: () => ({
    quote: ref(OFERTA),
    lineas: ref([]),
    loading: ref(false),
    error: ref(null),
    errorTraceId: ref(null),
    forbidden: ref(false),
    totalMostrado: ref(300_000),
    avisoImporte: ref(null),
    vigenciaActual: ref({ texto: 'Vigente hasta el 1 ene 2030', vigente: true }),
    puedeAceptar: ref(true),
    puedeRechazar: ref(false),
    loadDetalle,
    aceptar: (email: string) => aceptar(email),
    rechazar: vi.fn(),
  }),
}))

vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ estadoPlanActual: ref('SIN_PLAN'), load: vi.fn() }),
}))

async function montar() {
  const wrapper = mount(CotizacionDetalleView, {
    props: { id: '42' },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

function botonesAceptar(wrapper: Awaited<ReturnType<typeof montar>>) {
  return wrapper.findAll('button').filter((b) => b.text().includes('Aceptar propuesta'))
}

async function abrirModalYAceptar(wrapper: Awaited<ReturnType<typeof montar>>) {
  await botonesAceptar(wrapper)[0]?.trigger('click')
  await wrapper.find('input[type="email"]').setValue('ana@clinica.com')
  const botones = botonesAceptar(wrapper)
  await botones[botones.length - 1]?.trigger('click')
  await flushPromises()
}

beforeEach(() => {
  aceptar.mockReset()
  loadDetalle.mockReset()
})

describe('aceptar propuesta · el modal ante un 409', () => {
  it('se cierra cuando aceptar() tiene éxito', async () => {
    aceptar.mockResolvedValueOnce(true)
    const wrapper = await montar()

    await abrirModalYAceptar(wrapper)

    expect(wrapper.find('.overlay').exists()).toBe(false)
  })

  it('permanece abierto cuando aceptar() devuelve false', async () => {
    aceptar.mockResolvedValueOnce(false)
    const wrapper = await montar()

    await abrirModalYAceptar(wrapper)

    expect(wrapper.find('.overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Aceptar propuesta')
  })
})
