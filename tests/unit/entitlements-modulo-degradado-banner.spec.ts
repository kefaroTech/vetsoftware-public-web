import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModuloDegradadoBanner from '@/features/entitlements/components/ModuloDegradadoBanner.vue'

/**
 * Mismo criterio de prueba que `SuscripcionAvisoGlobal`: el contenedor `role="status"` siempre
 * existe, y lo único que cambia con `banner` es lo que hay dentro. Se mockea `vue-router` porque
 * el CTA enlaza por nombre de ruta (`suscripcion-modulos`), que en un test unitario no existe.
 */

const routeName = { value: 'agenda' as string }
vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return routeName.value
    },
  }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

beforeEach(() => {
  routeName.value = 'agenda'
})

describe('ModuloDegradadoBanner', () => {
  it('sin banner, el nodo `role="status"` existe pero no pinta nada', () => {
    const wrapper = mount(ModuloDegradadoBanner, { props: { banner: null } })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('.ds-banner').exists()).toBe(false)
  })

  it('tono error se pinta con la clase de error y el CTA a "Ver tus módulos"', () => {
    const wrapper = mount(ModuloDegradadoBanner, {
      props: { banner: { tono: 'error', texto: 'Puedes consultar e imprimir lo que ya tienes.' } },
    })

    expect(wrapper.find('.ds-banner--error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Puedes consultar e imprimir lo que ya tienes.')
    expect(wrapper.text()).toContain('Ver tus módulos')
  })

  it('tono warning se pinta con la clase de aviso', () => {
    const wrapper = mount(ModuloDegradadoBanner, {
      props: { banner: { tono: 'warning', texto: 'Vas por el 80 % de tu cupo.' } },
    })

    expect(wrapper.find('.ds-banner--warning').exists()).toBe(true)
  })

  it('en la propia pantalla de "Tus módulos" no repite el enlace a sí misma', () => {
    routeName.value = 'suscripcion-modulos'
    const wrapper = mount(ModuloDegradadoBanner, {
      props: { banner: { tono: 'error', texto: 'Solo consulta.' } },
    })

    expect(wrapper.text()).not.toContain('Ver tus módulos')
  })
})
