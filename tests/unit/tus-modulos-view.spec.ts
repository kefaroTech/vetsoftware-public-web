import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TusModulosView from '@/features/suscripcion/views/TusModulosView.vue'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'
import type { SubscriptionPaymentMethodResponse } from '@/features/suscripcion/types/medios-pago.types'
import type * as PiniaModule from 'pinia'

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

/**
 * `storeToRefs` de Pinia exige una instancia de store de verdad (mira su ámbito interno de
 * efectos), así que un mock plano de `useModulosStore` la revienta. Aquí se sustituye por una
 * identidad: el mock ya construye sus campos con `ref()`, así que no hace falta envolver nada.
 */
vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof PiniaModule>()
  return { ...actual, storeToRefs: (store: object) => store }
})

const { hoisted } = vi.hoisted(() => ({
  hoisted: {
    modulosStore: null as unknown as ReturnType<typeof createModulosStore>,
    compra: null as unknown as ReturnType<typeof createCompra>,
  },
}))
vi.mock('@/features/entitlements/stores/modulos.store', () => ({
  useModulosStore: () => hoisted.modulosStore,
}))
vi.mock('@/features/suscripcion/composables/useModulosCompra', () => ({
  useModulosCompra: () => hoisted.compra,
}))
vi.mock('@/features/suscripcion/api/pago.api', () => ({
  wompiApi: { checkoutConfig: vi.fn(() => new Promise(() => {})) },
  tokenizarTarjeta: vi.fn(),
}))

function createModulosStore() {
  return {
    modulos: ref<ModuleShowcaseResponse[]>([]),
    cargando: ref(false),
    error: ref<string | null>(null),
    cargar: vi.fn(),
  }
}

function createCompra() {
  return {
    seleccion: ref(new Set<string>()),
    haySeleccion: ref(false),
    alternar: vi.fn(),
    ciclo: ref<'MENSUAL' | 'ANUAL'>('MENSUAL'),
    cicloBloqueado: ref(false),
    cargandoMedios: ref(false),
    cargarMedios: vi.fn(),
    medioPorDefecto: ref<SubscriptionPaymentMethodResponse | null>(null),
    medioNuevo: ref<{ paymentMethodId: number; lastFour: string } | null>(null),
    registrarMedioNuevo: vi.fn(),
    paymentSourceId: ref<number | null>(null),
    comprando: ref(false),
    confirmacion: ref<{ nombre: string; linea: { catalogItemCode?: string } }[] | null>(null),
    confirmarCompra: vi.fn(),
    textoLinea: (item: { nombre: string }) => `${item.nombre}: confirmado.`,
  }
}

function modulo(over: Partial<ModuleShowcaseResponse> = {}): ModuleShowcaseResponse {
  return {
    code: 'SCHEDULING',
    name: 'Agenda de citas',
    state: 'TRIAL',
    purchasable: true,
    canPurchase: true,
    ...over,
  }
}

beforeEach(() => {
  hoisted.modulosStore = createModulosStore()
  hoisted.compra = createCompra()
})

describe('TusModulosView · recarga siempre al abrir', () => {
  it('fuerza la recarga del escaparate en el montaje', () => {
    mount(TusModulosView)

    expect(hoisted.modulosStore.cargar).toHaveBeenCalledWith(true)
  })
})

describe('TusModulosView · estados de carga y error', () => {
  it('mientras carga sin datos previos, muestra el hueco de carga', () => {
    hoisted.modulosStore.cargando.value = true
    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).toContain('Cargando tus módulos…')
  })

  it('con error, se pinta el hueco honesto y no la rejilla', () => {
    hoisted.modulosStore.error.value = 'No pudimos leer tus módulos'
    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).toContain('No pudimos leer tus módulos')
    expect(wrapper.text()).not.toContain('Comprar módulos')
  })
})

describe('TusModulosView · una tarjeta por módulo del catálogo', () => {
  it('lista todos los módulos, los tenga la empresa o no', () => {
    hoisted.modulosStore.modulos.value = [
      modulo({ code: 'CORE', state: 'PAID' }),
      modulo({ code: 'SCHEDULING' }),
    ]
    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).toContain('Activo')
    expect(wrapper.text()).toContain('En prueba')
  })
})

describe('TusModulosView · el bloque de compra aparece solo con selección', () => {
  it('sin selección, no se pinta «Comprar módulos»', () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).not.toContain('Comprar módulos')
  })

  it('con selección, aparece con el ciclo, el total y el medio de pago', () => {
    hoisted.modulosStore.modulos.value = [modulo({ monthlyPrice: 35_000 })]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true
    hoisted.compra.medioPorDefecto.value = {
      id: 7,
      companyId: 1,
      methodKind: 'CARD',
      gateway: 'WOMPI',
      lastFour: '4242',
      mandateStatus: 'ACTIVE',
      mandateEvidence: '',
      authorizedAt: '2026-01-01',
      defaultMethod: true,
      createdDate: '2026-01-01',
    }
    hoisted.compra.paymentSourceId.value = 7

    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).toContain('Comprar módulos')
    expect(wrapper.text()).toContain('$')
    expect(wrapper.text()).toContain('4242')
  })

  it('si la empresa ya tiene ciclo contratado, no deja elegir otro', () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true
    hoisted.compra.cicloBloqueado.value = true

    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).toContain('Ciclo de tu plan')
    expect(wrapper.find('fieldset').exists()).toBe(false)
  })
})

describe('TusModulosView · confirmar compra', () => {
  it('el botón está deshabilitado sin medio de pago', () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true

    const wrapper = mount(TusModulosView)
    const boton = wrapper.findAll('button').find((b) => b.text().includes('Confirmar compra'))

    expect(boton?.attributes('disabled')).toBeDefined()
  })

  it('al confirmar, recarga el escaparate si la compra tuvo éxito', async () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true
    hoisted.compra.paymentSourceId.value = 7
    hoisted.compra.confirmarCompra.mockResolvedValue(true)

    const wrapper = mount(TusModulosView)
    const boton = wrapper.findAll('button').find((b) => b.text().includes('Confirmar compra'))
    await boton?.trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    expect(hoisted.compra.confirmarCompra).toHaveBeenCalledWith(hoisted.modulosStore.modulos.value)
    expect(hoisted.modulosStore.cargar).toHaveBeenLastCalledWith(true)
  })

  it('tras confirmar con éxito, el foco vuelve al `<h1>` de la pantalla (§2.4.3)', async () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true
    hoisted.compra.paymentSourceId.value = 7
    hoisted.compra.confirmarCompra.mockResolvedValue(true)

    const wrapper = mount(TusModulosView, { attachTo: document.body })
    const boton = wrapper.findAll('button').find((b) => b.text().includes('Confirmar compra'))
    await boton?.trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    const h1 = wrapper.find('h1').element
    expect(document.activeElement).toBe(h1)
    wrapper.unmount()
  })

  it('un fallo de la compra no mueve el foco', async () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true
    hoisted.compra.paymentSourceId.value = 7
    hoisted.compra.confirmarCompra.mockResolvedValue(false)

    const wrapper = mount(TusModulosView, { attachTo: document.body })
    const boton = wrapper.findAll('button').find((b) => b.text().includes('Confirmar compra'))
    await boton?.trigger('click')
    await Promise.resolve()

    expect(hoisted.modulosStore.cargar).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('muestra la confirmación línea a línea tras comprar', () => {
    hoisted.modulosStore.modulos.value = [modulo()]
    hoisted.compra.seleccion.value = new Set(['SCHEDULING'])
    hoisted.compra.haySeleccion.value = true
    hoisted.compra.paymentSourceId.value = 7
    hoisted.compra.confirmacion.value = [
      { nombre: 'Agenda de citas', linea: { catalogItemCode: 'SCHEDULING' } },
    ]

    const wrapper = mount(TusModulosView)

    expect(wrapper.text()).toContain('Agenda de citas: confirmado.')
  })
})
