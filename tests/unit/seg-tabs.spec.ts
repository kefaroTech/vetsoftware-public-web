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

  it('se anuncia como GRUPO, no como lista de pestañas (issue #188)', () => {
    // Este caso sujetaba el defecto: afirmaba `role="tablist"`, que era
    // literalmente lo que había que quitar. Se revisó uso a uso y ninguno de los
    // seis anfitriones conmuta entre paneles hermanos —`ImpuestosView`,
    // `InventarioView`, `ServiciosView` y `MedicamentosView` filtran el listado
    // que ya se está mirando; `StockDetailModal` y `AdjustModal` conmutan una
    // región dentro del cuerpo del modal—, así que el `tablist` prometía un
    // `tabpanel` que no existe y además incumplía `aria-required-children` de
    // axe, porque los hijos son `<button>` sin `role="tab"`.
    //
    // El marcado correcto es el patrón *Button (Toggle)* del APG: un grupo con
    // nombre y `aria-pressed` por opción. Si alguien devuelve el `tablist`, esta
    // aserción es la que se lo dice.
    const wrapper = mount(SegTabs, {
      props: { modelValue: 'active', options: OPCIONES, ariaLabel: 'Estado de los impuestos' },
    })

    expect(wrapper.find('.seg').attributes('role')).toBe('group')
    // No basta con exigir `group`: se nombra el rol prohibido para que el motivo
    // del caso siga legible cuando alguien lo lea dentro de dos años.
    expect(
      wrapper.findAll('[role="tab"]'),
      'un juego de pestañas necesita hijos `role="tab"` y un panel; aquí no hay ninguno de los dos',
    ).toHaveLength(0)
    expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(0)
  })

  it('el grupo lleva nombre accesible cuando el anfitrión dice qué conmuta', () => {
    // Sin `aria-label`, un `role="group"` es válido pero mudo: el lector anuncia
    // los botones sueltos y no lo que tienen en común. La prop es opcional a
    // propósito (hay anfitriones ajenos que aún no la pasan), así que lo que se
    // fija es que cuando llega, llega al sitio.
    const conNombre = mount(SegTabs, {
      props: { modelValue: 'active', options: OPCIONES, ariaLabel: 'Estado de los impuestos' },
    })
    expect(conNombre.find('.seg').attributes('aria-label')).toBe('Estado de los impuestos')

    const sinNombre = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })
    expect(sinNombre.find('.seg').attributes('role')).toBe('group')
    expect(sinNombre.find('.seg').attributes('aria-label')).toBeUndefined()
  })

  it('expresa la posición puesta con aria-pressed en CADA opción', () => {
    // El estado tiene que estar en el árbol de accesibilidad, no solo en la
    // clase `on`: la clase la ve el ojo y `aria-pressed` es lo único que oye
    // quien usa lector de pantalla. Las dos opciones lo declaran —también la
    // apagada—, porque un `aria-pressed` que solo aparece en la activa convierte
    // a las demás en botones normales y el grupo deja de leerse como un
    // conmutador.
    const wrapper = mount(SegTabs, { props: { modelValue: 'paused', options: OPCIONES } })
    const botones = wrapper.findAll('button')

    expect(botones.map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true'])
    // Y nada de `aria-selected`, que es el atributo del patrón que se descartó.
    expect(botones.every((b) => b.attributes('aria-selected') === undefined)).toBe(true)
  })

  it('aria-pressed sigue al modelValue del padre, igual que la marca visual', async () => {
    // Mismo criterio que el caso de la clase `on`: el componente es controlado.
    // Si el estado accesible se desincronizara del visual, el lector anunciaría
    // una posición y la pantalla mostraría otra.
    const wrapper = mount(SegTabs, { props: { modelValue: 'active', options: OPCIONES } })

    expect(wrapper.findAll('button').map((b) => b.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
    ])

    await wrapper.setProps({ modelValue: 'paused' })

    expect(wrapper.findAll('button').map((b) => b.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
    ])
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
