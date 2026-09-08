import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModuloCard from '@/features/suscripcion/components/ModuloCard.vue'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'

function modulo(over: Partial<ModuleShowcaseResponse> = {}): ModuleShowcaseResponse {
  return {
    code: 'SCHEDULING',
    name: 'Agenda de citas',
    shortDescription: 'Programa y confirma citas.',
    state: 'TRIAL',
    purchasable: true,
    canPurchase: true,
    ...over,
  }
}

describe('ModuloCard · las cinco píldoras llevan texto, no solo color', () => {
  it('EN_PRUEBA', () => {
    const wrapper = mount(ModuloCard, { props: { modulo: modulo(), seleccionado: false } })
    expect(wrapper.text()).toContain('En prueba')
  })

  it('GRATIS_CON_TECHO muestra el medidor y no lleva casilla de compra', () => {
    const wrapper = mount(ModuloCard, {
      props: {
        modulo: modulo({
          state: 'FREE_LIMITED',
          purchasable: true,
          ceilings: [
            {
              dimensionCode: 'APPOINTMENT',
              measureKind: 'FLOW',
              used: 30,
              limit: 40,
              enforcement: 'BLOCK',
            },
          ],
        }),
        seleccionado: false,
      },
    })
    expect(wrapper.text()).toContain('Gratis con techo')
    expect(wrapper.text()).toContain('este mes')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('SOLO_LECTURA', () => {
    const wrapper = mount(ModuloCard, {
      props: { modulo: modulo({ state: 'EXPIRED_READ_ONLY' }), seleccionado: false },
    })
    expect(wrapper.text()).toContain('Solo lectura')
    expect(wrapper.text()).toContain('Para volver a crear, cómpralo.')
  })

  it('DE_PAGO_ACTIVO no lleva CTA', () => {
    const wrapper = mount(ModuloCard, {
      props: { modulo: modulo({ state: 'PAID', purchasable: false }), seleccionado: false },
    })
    expect(wrapper.text()).toContain('Activo')
    expect(wrapper.text()).toContain('Incluido en tu plan.')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('NUNCA_GRATIS', () => {
    const wrapper = mount(ModuloCard, {
      props: {
        modulo: modulo({ code: 'ELECTRONIC_INVOICING', state: 'NEVER_FREE' }),
        seleccionado: false,
      },
    })
    expect(wrapper.text()).toContain('Nunca gratis')
    expect(wrapper.text()).toContain('Facturación electrónica no tiene prueba.')
  })
})

describe('ModuloCard · selección y permiso de compra', () => {
  it('emite `alternar` con el código y el estado del checkbox', async () => {
    const wrapper = mount(ModuloCard, { props: { modulo: modulo(), seleccionado: false } })

    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(wrapper.emitted('alternar')).toEqual([['SCHEDULING', true]])
  })

  it('sin `canPurchase`, no hay checkbox: se ve el hueco honesto en su lugar', () => {
    const wrapper = mount(ModuloCard, {
      props: { modulo: modulo({ canPurchase: false }), seleccionado: false },
    })

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Pídeselo a tu administrador.')
  })
})
