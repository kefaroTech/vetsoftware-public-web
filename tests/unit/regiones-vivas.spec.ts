import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Clock } from 'lucide-vue-next'
import FeDianResultBanner from '@/features/facturacion/components/FeDianResultBanner.vue'
import FeThresholdBanner from '@/features/facturacion/components/FeThresholdBanner.vue'
import AppointmentNoticeBanner from '@/features/agenda/components/AppointmentNoticeBanner.vue'
import AuthBanner from '@/components/public/AuthBanner.vue'
import type { DianStatus } from '@/features/facturacion/types/facturacion'

/**
 * LAS CUATRO REGIONES VIVAS NUEVAS.
 *
 * Lo que se fija aquí es el `role`, NUNCA el color. El color es la mitad del
 * mensaje que solo llega a quien mira la pantalla; el `role` es la otra mitad, y
 * es la única que llega a quien usa lector. Los cuatro banners aparecen TRAS una
 * interacción —se emite el documento, el carrito cruza el umbral, se guarda una
 * cita, se envía el formulario de acceso—, así que sin región viva no se anuncia
 * ninguno: un solape de citas invisible es una consulta doble en la sala de
 * espera.
 *
 * El reparto es el de `docs/ux/patron-de-mensajes.md` §4.2b y no es
 * intercambiable:
 *
 *  - `alert` (assertive implícito) donde INTERRUMPE: corta la locución en curso
 *    y se reserva a lo que hace perder trabajo o invalida lo hecho.
 *  - `status` (polite) donde INFORMA: espera a que el lector termine la frase.
 *
 * Poner `alert` en todo es el mecanismo exacto por el que alguien aprende a
 * ignorar las alertas, y entonces también se pierde la que sí importaba. Por eso
 * cada caso afirma el rol que toca Y que el otro no está.
 *
 * `aria-live` explícito se comprueba solo donde el componente lo escribe: el de
 * `alert` es implícito y escribirlo es redundante.
 */

// `FeThresholdBanner` pide el UVT vigente al backend a través de
// `useSystemConfigStore`. Se corta el cliente HTTP y no el store: así se
// ejercita el store real (que mantiene su UVT por defecto cuando la lectura no
// trae nada) en vez de un doble que no se parece a producción.
vi.mock('@/features/facturacion/api/systemConfig.api', () => ({
  UVT_PROPERTY: 'uvt',
  systemConfigApi: { get: vi.fn(async () => []), set: vi.fn() },
}))

/** UVT por defecto del store (2025) × 5 = el umbral vigente mientras carga. */
const UVT_POR_DEFECTO = 49_799
const UMBRAL = UVT_POR_DEFECTO * 5

describe('FeDianResultBanner — el rechazo de la DIAN interrumpe; lo pendiente solo informa', () => {
  it('RECHAZADO se anuncia como alert: el documento no es válido y alguien tiene que actuar', () => {
    const wrapper = mount(FeDianResultBanner, { props: { status: 'RECHAZADO' } })

    const region = wrapper.find('[role]')
    expect(region.attributes('role')).toBe('alert')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(region.text()).toContain('La DIAN rechazó la factura')
    // El estado crudo va a la vista para que soporte pueda identificar el
    // documento: es contenido, no decoración.
    expect(region.text()).toContain('RECHAZADO')
  })

  it('PENDIENTE se anuncia como status: la venta quedó registrada, no hay nada que rehacer', () => {
    const wrapper = mount(FeDianResultBanner, { props: { status: 'PENDIENTE' } })

    expect(wrapper.find('[role]').attributes('role')).toBe('status')
    expect(
      wrapper.find('[role="alert"]').exists(),
      'un pendiente que corta la locución entrena al usuario a ignorar las alertas',
    ).toBe(false)
    expect(wrapper.text()).toContain('Emisión a la DIAN pendiente')
  })

  it('cualquier estado que no sea PENDIENTE ni VALIDADO cuenta como error', () => {
    // La rama es «todo lo demás», a propósito: si la DIAN estrena un estado, el
    // banner lo trata como error en vez de callarse.
    for (const status of ['CONTINGENCIA', 'NO_ELECTRONICO'] as DianStatus[]) {
      const wrapper = mount(FeDianResultBanner, { props: { status } })
      expect(wrapper.find('[role]').attributes('role'), `estado ${status}`).toBe('alert')
    }
  })

  it('VALIDADO y la ausencia de documento no pintan región viva alguna', () => {
    // El éxito ya lo dice el propio recibo: anunciarlo otra vez es ruido.
    for (const status of ['VALIDADO', null, undefined] as (DianStatus | null | undefined)[]) {
      const wrapper = mount(FeDianResultBanner, { props: { status } })
      expect(wrapper.find('[role="alert"]').exists(), `estado ${status}`).toBe(false)
      expect(wrapper.find('[role="status"]').exists(), `estado ${status}`).toBe(false)
    }
  })
})

describe('FeThresholdBanner — el umbral fiscal informa, no interrumpe', () => {
  it('la región viva existe ANTES de que haya nada que decir', () => {
    // Lo que hace que el aviso se anuncie de verdad: el contenedor con
    // `role="status"` se monta siempre y el mensaje entra después. Una región
    // viva que nace con su texto ya dentro no la anuncia casi ningún lector
    // (`docs/ux/patron-de-mensajes.md` §4.2c). Si alguien mueve el `role` al
    // banner interior, o le pone un `v-if` al contenedor, esto falla.
    const wrapper = mount(FeThresholdBanner, { props: { total: 1000 } })

    const region = wrapper.find('[role="status"]')
    expect(region.exists(), 'la región debe vivir más que el mensaje').toBe(true)
    expect(region.text()).toBe('')
  })

  it('al cruzar el umbral el mensaje entra en la región que ya estaba', async () => {
    const wrapper = mount(FeThresholdBanner, { props: { total: UMBRAL - 1 } })
    expect(wrapper.find('[role="status"]').text()).toBe('')

    await wrapper.setProps({ total: UMBRAL + 1 })

    const region = wrapper.find('[role="status"]')
    expect(region.text()).toContain('5 UVT')
    expect(region.text()).toContain('Factura electrónica')
  })

  it('es status y no alert: es una obligación fiscal, no un fallo', () => {
    const wrapper = mount(FeThresholdBanner, { props: { total: UMBRAL + 1 } })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(
      wrapper.find('[role="alert"]').exists(),
      'interrumpir la locución está reservado a lo que hace perder trabajo',
    ).toBe(false)
  })

  it('justo en el umbral todavía no avisa: la regla DIAN es «por encima de 5 UVT»', () => {
    const wrapper = mount(FeThresholdBanner, { props: { total: UMBRAL } })

    expect(wrapper.find('[role="status"]').text()).toBe('')
  })
})

describe('AppointmentNoticeBanner — el aviso de la agenda reparte por tono', () => {
  function montar(tone: 'warn' | 'err' | 'neutral') {
    return mount(AppointmentNoticeBanner, {
      props: { tone, icon: Clock },
      slots: { default: 'Ya hay una cita en ese horario.' },
    })
  }

  it('el error es alert, y no escribe aria-live porque el de alert es implícito', () => {
    const region = montar('err').find('div')

    expect(region.attributes('role')).toBe('alert')
    expect(
      region.attributes('aria-live'),
      'el aria-live de alert es implícito; escribirlo es redundante',
    ).toBeUndefined()
  })

  it('el aviso y el neutro son status polite', () => {
    for (const tone of ['warn', 'neutral'] as const) {
      const region = montar(tone).find('div')
      expect(region.attributes('role'), `tono ${tone}`).toBe('status')
      expect(region.attributes('aria-live'), `tono ${tone}`).toBe('polite')
    }
  })

  it('el contenido del aviso llega a la región, no fuera de ella', () => {
    // Si el slot quedara fuera del elemento que lleva el `role`, la región se
    // anunciaría vacía: existiría el rol y no se oiría el choque de horarios.
    const region = montar('err').find('[role="alert"]')

    expect(region.text()).toContain('Ya hay una cita en ese horario.')
  })
})

describe('AuthBanner — el banner de autenticación reparte por tono', () => {
  function montar(tone: 'error' | 'warning') {
    return mount(AuthBanner, {
      props: { tone },
      slots: { default: 'Revisa tu correo para confirmar la cuenta.' },
      // Vuetify no se instala en los unitarios: el icono es decoración y lo que
      // se mide aquí es el rol de la caja que lo contiene.
      global: { stubs: { 'v-icon': true } },
    })
  }

  it('el error es alert', () => {
    const region = montar('error').find('.pub-banner')

    expect(region.attributes('role')).toBe('alert')
    expect(region.attributes('aria-live')).toBeUndefined()
  })

  it('el aviso es status polite, no alert', () => {
    // El defecto que esto cierra: el rol estaba fijo en `alert` para los dos
    // tonos, y en las 16 pantallas públicas un «Revisa tu correo» cortaba la
    // locución igual que un fallo de contraseña.
    const region = montar('warning').find('.pub-banner')

    expect(region.attributes('role')).toBe('status')
    expect(region.attributes('aria-live')).toBe('polite')
  })

  it('sin tono explícito se comporta como error', () => {
    // El defecto por defecto: la inmensa mayoría de los usos son fallos de
    // acceso, y un fallo que no interrumpe deja al usuario mirando un formulario
    // que no avanza sin saber por qué.
    const wrapper = mount(AuthBanner, {
      slots: { default: 'Usuario o contraseña incorrectos.' },
      global: { stubs: { 'v-icon': true } },
    })

    expect(wrapper.find('.pub-banner').attributes('role')).toBe('alert')
  })
})
