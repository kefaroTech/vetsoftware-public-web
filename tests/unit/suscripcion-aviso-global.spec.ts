import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SuscripcionAvisoGlobal from '@/features/suscripcion/components/SuscripcionAvisoGlobal.vue'
import type { EstadoPlan } from '@/features/suscripcion/composables/estadoSuscripcion'

const routeName = { value: 'home' as string }
vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return routeName.value
    },
  }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

const estado = ref<EstadoPlan | null>(null)
const load = vi.fn()
vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ estado, load }),
}))

function estadoDe(tono: EstadoPlan['tono'], fuerte = 'Sigues trabajando con normalidad.') {
  return { rotulo: 'x', fuerte, frase: 'y', tono, accion: null }
}

beforeEach(() => {
  routeName.value = 'home'
  estado.value = null
  load.mockReset()
})

describe('SuscripcionAvisoGlobal', () => {
  it('sin plan que contar, el nodo `role="status"` existe pero sin contenido', () => {
    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('.aviso').exists()).toBe(false)
  })

  it('tono "none" (plan al día) mantiene el nodo `role="status"` sin pintar el aviso', () => {
    estado.value = estadoDe('none', 'Todo en orden.')

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('.aviso').exists()).toBe(false)
  })

  it('tono "warning" u "error" se pinta con el mismo `fuerte` de estadoPlan() y un enlace a Ver mi plan', () => {
    estado.value = estadoDe('warning')

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sigues trabajando con normalidad.')
    expect(wrapper.text()).toContain('Ver mi plan')
  })

  it('en la propia pantalla de "Mi plan" no repite el enlace a sí misma', () => {
    estado.value = estadoDe('error')
    routeName.value = 'suscripcion-plan'

    const wrapper = mount(SuscripcionAvisoGlobal)

    expect(wrapper.text()).not.toContain('Ver mi plan')
  })

  it('carga el plan al montarse, sin forzar recarga', () => {
    mount(SuscripcionAvisoGlobal)

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith()
  })
})
