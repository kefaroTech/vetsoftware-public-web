import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PosCashGate from '@/features/tienda/components/PosCashGate.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'

/**
 * La pantalla de bloqueo del POS pintaba su propio aro giratorio (`.spin` +
 * `@keyframes cash-spin`, 0,9 s linear infinite) mientras comprobaba la caja.
 * Era el único sitio del producto con un spinner clásico y llevaba ahí desde
 * que la pantalla existe, porque la regla «PawLoader es el único loader» era un
 * acuerdo escrito y no una puerta (ahora sí lo es: `loader-guard.spec.ts`).
 *
 * Además de la inconsistencia había un problema real: `cash-spin` no tenía
 * guarda de `prefers-reduced-motion` —`main.css` no declara ninguna global— y
 * `PawLoader` sí la trae. Quien pide reducir movimiento veía girar la única
 * cosa que hay en pantalla mientras espera.
 */

const BASE = {
  checking: false,
  loadFailed: false,
  noSession: false,
  branchMismatch: false,
  cashBranchLabel: 'Sede Norte',
  terminal: 'CAJA-01',
}

const montar = (props: Partial<typeof BASE> = {}) =>
  mount(PosCashGate, { props: { ...BASE, ...props } })

describe('PosCashGate — estado «comprobando»', () => {
  it('monta PawLoader', () => {
    const wrapper = montar({ checking: true })

    expect(wrapper.findComponent(PawLoader).exists()).toBe(true)
  })

  it('NO existe ningún .spin: el aro giratorio propio se retiró', () => {
    const wrapper = montar({ checking: true })

    expect(wrapper.find('.spin').exists()).toBe(false)
  })

  it('el loader va sin brillo y etiquetado con lo que se está esperando', () => {
    // `label` es lo que anuncia el lector de pantalla en el `role="status"`.
    // Un loader sin etiqueta deja al usuario ciego esperando en silencio.
    const loader = montar({ checking: true }).findComponent(PawLoader)

    expect(loader.props('glow')).toBe(false)
    expect(loader.props('label')).toBe('Validando caja')
  })

  it('el estado se anuncia como región viva', () => {
    const wrapper = montar({ checking: true })

    expect(wrapper.find('section').attributes('aria-live')).toBe('polite')
  })
})

describe('PosCashGate — los otros tres estados no llevan loader', () => {
  for (const estado of ['loadFailed', 'noSession', 'branchMismatch'] as const) {
    it(`«${estado}» no monta PawLoader ni pinta un .spin`, () => {
      // Los cuatro estados son excluyentes. Un loader colgando en el estado de
      // error diría al usuario que aún se está intentando algo.
      const wrapper = montar({ [estado]: true })

      expect(wrapper.findComponent(PawLoader).exists()).toBe(false)
      expect(wrapper.find('.spin').exists()).toBe(false)
    })
  }
})
