import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SegTabs from '@/features/tienda/components/SegTabs.vue'

/**
 * El conmutador segmentado sustituyó cinco copias del mismo marcado. Al
 * unificarlas, lo que estaba en juego no era el CSS sino el tipo: cada
 * anfitrión conmuta entre una unión distinta (`'active' | 'paused'`,
 * `'lotes' | 'movs'`, `'in' | 'out'`) y el componente debe devolverle SU unión,
 * no `string`. Eso lo sostiene el `NoInfer<T>` de `options`, que ata el
 * genérico al `modelValue` y no a la lista de opciones.
 *
 * En tiempo de ejecución lo que hay que fijar es más simple y más frágil: que
 * el valor emitido sea el de la opción pulsada —no su índice ni su etiqueta— y
 * que la marca `on` siga al `modelValue` del padre y no a un estado interno,
 * porque el componente es controlado y no guarda nada.
 */

const OPCIONES = [
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
] as const

describe('SegTabs', () => {
  it('pinta un botón por opción, con su etiqueta', () => {
    const wrapper = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })
    const botones = wrapper.findAll('button')

    expect(botones).toHaveLength(2)
    expect(botones.map((b) => b.text())).toEqual(['Activos', 'Pausados'])
  })

  it('marca como activa la opción que coincide con el modelValue', () => {
    const wrapper = mount(SegTabs, { props: { modelValue: 'paused', options: OPCIONES } })
    const botones = wrapper.findAll('button')

    expect(botones[0]!.classes()).not.toContain('on')
    expect(botones[1]!.classes()).toContain('on')
  })

  it('emite update:modelValue con el VALOR de la opción pulsada', async () => {
    // No con su índice ni con su etiqueta: la etiqueta es texto de pantalla y
    // el índice se rompe en cuanto alguien reordena las opciones.
    const wrapper = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['paused']])
  })

  it('emite también al pulsar la opción que ya estaba activa', async () => {
    // Es un componente controlado: no filtra el evento. Si lo filtrara, un
    // padre que use el mismo conmutador para re-lanzar una búsqueda dejaría de
    // enterarse del segundo clic.
    const wrapper = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })

    await wrapper.findAll('button')[0]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['active']])
  })

  it('no cambia de posición por su cuenta: la marca la decide el padre', async () => {
    // Sin estado interno. Tras el clic, mientras el padre no actualice el
    // v-model, el botón activo sigue siendo el anterior.
    const wrapper = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.findAll('button')[0]!.classes()).toContain('on')
    expect(wrapper.findAll('button')[1]!.classes()).not.toContain('on')

    await wrapper.setProps({ modelValue: 'paused' })

    expect(wrapper.findAll('button')[1]!.classes()).toContain('on')
  })

  it('usa la métrica de cabecera (sm) por defecto y admite la de modal (md)', () => {
    // Las cinco copias solo se diferenciaban en el padding horizontal del
    // botón; esa diferencia es hoy la prop y por eso el defecto importa: un
    // cambio de defecto ensancharía en silencio los conmutadores de vista.
    const porDefecto = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })
    expect(porDefecto.find('.seg').classes()).toContain('seg--sm')

    const enModal = mount(SegTabs, {
      props: { modelValue: 'active', options: OPCIONES, size: 'md' },
    })
    expect(enModal.find('.seg').classes()).toContain('seg--md')
  })

  it('se anuncia como lista de pestañas', () => {
    const wrapper = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })

    expect(wrapper.find('.seg').attributes('role')).toBe('tablist')
  })

  it('soporta más de dos posiciones sin duplicar claves', () => {
    // El `:key` es `o.value`; con etiquetas repetidas y valores distintos Vue
    // debe seguir pintando un botón por opción.
    const tres = [
      { value: 'in', label: 'Movimiento' },
      { value: 'out', label: 'Movimiento' },
      { value: 'all', label: 'Todos' },
    ] as const

    const wrapper = mount(SegTabs, { props: { modelValue: 'all', options: tres } })

    expect(wrapper.findAll('button')).toHaveLength(3)
    expect(wrapper.findAll('button.on')).toHaveLength(1)
  })
})
