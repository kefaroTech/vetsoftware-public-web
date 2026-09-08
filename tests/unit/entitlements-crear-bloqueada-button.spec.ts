import { describe, it, expect, vi } from 'vitest'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import CrearBloqueadaButton from '@/features/entitlements/components/CrearBloqueadaButton.vue'

/**
 * El reemplazo del botón de crear en un módulo `READ_ONLY`. El botón nunca es
 * `disabled`: activarlo abre la explicación en vez del formulario de creación.
 */

vi.mock('vue-router', () => ({
  useRouter: () => undefined,
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

/** `teleport: true` porque `ModalShell` (dentro de este componente) teletransporta a `body`. */
function montar(props: ComponentMountingOptions<typeof CrearBloqueadaButton>['props']) {
  return mount(CrearBloqueadaButton, { props, global: { stubs: { teleport: true } } })
}

describe('CrearBloqueadaButton', () => {
  it('el botón dice «Comprar {módulo}», habilitado y enfocable', () => {
    const wrapper = montar({ nombreModulo: 'Laboratorio e imagen' })

    const boton = wrapper.find('button')
    expect(boton.text()).toContain('Comprar Laboratorio e imagen')
    expect(boton.attributes('disabled')).toBeUndefined()
  })

  it('al activarlo, explica desde cuándo en vez de abrir el formulario de creación', async () => {
    const wrapper = montar({ nombreModulo: 'Cirugía', desde: '2026-08-01' })

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Cirugía está en modo solo consulta desde el')
    expect(wrapper.text()).toContain('Cómpralo para volver a crear')
  })

  it('sin fecha declarada, no inventa un «desde el»', async () => {
    const wrapper = montar({ nombreModulo: 'Caja' })

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).not.toContain('desde el')
  })

  it('el disparador acepta una clase distinta para contextos secundarios (paneles, no CTA de página)', () => {
    const wrapper = montar({
      nombreModulo: 'Clientes y mascotas',
      triggerClass: 'ds-btn ds-btn--ghost ds-btn--snug',
    })

    expect(wrapper.find('button').classes()).toContain('ds-btn--ghost')
    expect(wrapper.find('button').classes()).not.toContain('ds-btn--primary')
  })
})
