import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchField from '@/features/tienda/components/SearchField.vue'
import FilterSelect from '@/features/tienda/components/FilterSelect.vue'
import PagerBar from '@/features/tienda/components/PagerBar.vue'

/**
 * Los controles de la barra de filtros de la tienda: búsqueda, desplegable y
 * paginador. Entre los tres sustituyeron doce copias del mismo marcado.
 *
 * Dos de ellos llevan `v-model`, que es donde una extracción se puede torcer
 * sin que nada falle: basta con que el `defineModel` deje de propagar para que
 * el usuario escriba y la lista no filtre. Y los tres tienen un `size` que NO
 * es decorativo — es la diferencia de métrica entre la barra de una pantalla y
 * la de un modal, y era lo único que distinguía a las copias originales, así
 * que un defecto mal puesto reescribe el diseño en varios sitios a la vez.
 */

describe('SearchField', () => {
  it('propaga lo que el usuario escribe al v-model', () => {
    const wrapper = mount(SearchField, { props: { modelValue: '' } })

    const input = wrapper.find('input')
    input.setValue('amoxi')

    expect(wrapper.emitted('update:modelValue')).toEqual([['amoxi']])
  })

  it('refleja el valor que le llega desde fuera', () => {
    // El buscador se limpia desde el padre («borrar filtros»). Si el input
    // guardara su propio estado, el texto seguiría en pantalla con la lista ya
    // sin filtrar.
    const wrapper = mount(SearchField, { props: { modelValue: 'amoxi' } })

    expect(wrapper.find('input').element.value).toBe('amoxi')
  })

  it('es un input de búsqueda y lleva el placeholder que le pasan', () => {
    const wrapper = mount(SearchField, {
      props: { modelValue: '', placeholder: 'Buscar producto…' },
    })

    expect(wrapper.find('input').attributes('type')).toBe('search')
    expect(wrapper.find('input').attributes('placeholder')).toBe('Buscar producto…')
  })

  it('usa la métrica de pantalla (md) por defecto y la de modal (sm) a petición', () => {
    const enPantalla = mount(SearchField, { props: { modelValue: '' } })
    expect(enPantalla.find('.search').classes()).toContain('search--md')

    const enModal = mount(SearchField, { props: { modelValue: '', size: 'sm' } })
    expect(enModal.find('.search').classes()).toContain('search--sm')
    expect(enModal.find('.search').classes()).not.toContain('search--md')
  })

  it('solo crece dentro de la barra de filtros cuando se le pide', () => {
    // `fill` es lo que le da el `flex: 1` con tope. Aplicado por defecto, el
    // buscador de los modales se estiraría hasta empujar al desplegable.
    const suelto = mount(SearchField, { props: { modelValue: '' } })
    expect(suelto.find('.search').classes()).not.toContain('search--fill')

    const enBarra = mount(SearchField, { props: { modelValue: '', fill: true } })
    expect(enBarra.find('.search').classes()).toContain('search--fill')
  })

  it('lleva la lupa atenuada con la primitiva compartida', () => {
    // `.ds-icon-muted` es la primitiva; si volviera a ser una regla local, el
    // icono se saldría del tono común sin que nadie lo notara.
    const wrapper = mount(SearchField, { props: { modelValue: '' } })

    expect(wrapper.find('.search svg').classes()).toContain('ds-icon-muted')
  })
})

describe('FilterSelect', () => {
  it('propaga la opción elegida al v-model', () => {
    const wrapper = mount(FilterSelect, {
      props: { modelValue: '' },
      slots: {
        default: '<option value="">Todas</option><option value="alimento">Alimento</option>',
      },
    })

    wrapper.find('select').setValue('alimento')

    expect(wrapper.emitted('update:modelValue')).toEqual([['alimento']])
  })

  it('selecciona la opción que le llega desde fuera', () => {
    const wrapper = mount(FilterSelect, {
      props: { modelValue: 'alimento' },
      slots: {
        default: '<option value="">Todas</option><option value="alimento">Alimento</option>',
      },
    })

    expect(wrapper.find('select').element.value).toBe('alimento')
  })

  it('las opciones son del consumidor: se renderizan tal cual', () => {
    // Lo que se repetía cuatro veces era el control, no la lista. Si el
    // componente impusiera opciones, dejaría de servir a los cuatro sitios.
    const wrapper = mount(FilterSelect, {
      props: { modelValue: '' },
      slots: { default: '<option value="a">A</option><option value="b">B</option>' },
    })

    expect(wrapper.findAll('option')).toHaveLength(2)
  })

  it('usa la métrica de pantalla (md) por defecto y la de modal (sm) a petición', () => {
    const enPantalla = mount(FilterSelect, { props: { modelValue: '' } })
    expect(enPantalla.find('select').classes()).toContain('fsel--md')

    const enModal = mount(FilterSelect, { props: { modelValue: '', size: 'sm' } })
    expect(enModal.find('select').classes()).toContain('fsel--sm')
  })
})

describe('PagerBar', () => {
  const BASE = { label: '1–20 de 134', prevDisabled: false, nextDisabled: false }

  it('pinta el texto que le da el anfitrión', () => {
    // El texto llega resuelto porque unos anfitriones cuentan en base 0 y otro
    // en base 1. El paginador no cuenta nada: si lo hiciera, se equivocaría en
    // la mitad de los sitios.
    const wrapper = mount(PagerBar, { props: BASE })

    expect(wrapper.find('.pag > span').text()).toBe('1–20 de 134')
  })

  it('emite prev y next por separado', () => {
    const wrapper = mount(PagerBar, { props: BASE })
    const [anterior, siguiente] = wrapper.findAll('.pag-ctrl button')

    anterior!.trigger('click')
    siguiente!.trigger('click')

    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('deshabilita cada flecha por su cuenta', () => {
    // En la primera página solo se apaga la izquierda. Un único `disabled`
    // compartido dejaría al usuario encerrado en la página uno.
    const primeraPagina = mount(PagerBar, {
      props: { ...BASE, prevDisabled: true, nextDisabled: false },
    })
    const [anterior, siguiente] = primeraPagina.findAll('.pag-ctrl button')

    expect(anterior!.attributes('disabled')).toBeDefined()
    expect(siguiente!.attributes('disabled')).toBeUndefined()
  })

  it('una flecha deshabilitada no emite nada', () => {
    const wrapper = mount(PagerBar, { props: { ...BASE, prevDisabled: true } })

    wrapper.findAll('.pag-ctrl button')[0]!.trigger('click')

    expect(wrapper.emitted('prev')).toBeUndefined()
  })

  it('usa la métrica de modal (sm) por defecto y la de pantalla (md) a petición', () => {
    // Aquí el defecto va al revés que en los otros dos controles, y no es un
    // descuido: tres de los cuatro paginadores originales eran de modal.
    const porDefecto = mount(PagerBar, { props: BASE })
    expect(porDefecto.find('.pag').classes()).toContain('pag--sm')

    const enPantalla = mount(PagerBar, { props: { ...BASE, size: 'md' } })
    expect(enPantalla.find('.pag').classes()).toContain('pag--md')
  })

  it('sus botones no envían formularios', () => {
    const wrapper = mount(PagerBar, { props: BASE })

    for (const boton of wrapper.findAll('.pag-ctrl button')) {
      expect(boton.attributes('type')).toBe('button')
    }
  })

  /**
   * Las dos flechas son el mismo `<button>` con el mismo tamaño y un chevron
   * dentro: sin etiqueta accesible, un lector de pantalla anuncia «botón,
   * botón» al final de cinco tablas distintas y no hay forma de saber cuál
   * avanza.
   *
   * Los asertos van POR la etiqueta y comprueban el efecto, no el texto. Un
   * `aria-label` correcto en el botón equivocado —el error que de verdad se
   * comete al copiar el marcado— pasaría una comprobación de texto y falla
   * aquí, porque «Página siguiente» emitiría `prev`.
   */
  it('la flecha etiquetada «Página anterior» es la que retrocede', async () => {
    const wrapper = mount(PagerBar, { props: BASE })

    await wrapper.find('[aria-label="Página anterior"]').trigger('click')

    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('la flecha etiquetada «Página siguiente» es la que avanza', async () => {
    const wrapper = mount(PagerBar, { props: BASE })

    await wrapper.find('[aria-label="Página siguiente"]').trigger('click')

    expect(wrapper.emitted('next')).toHaveLength(1)
    expect(wrapper.emitted('prev')).toBeUndefined()
  })

  it('la etiqueta acompaña al estado: en la primera página, «Página anterior» está apagada', () => {
    // El apagado y la etiqueta tienen que describir al MISMO botón. Si se
    // separaran, el lector anunciaría «Página anterior, no disponible» sobre la
    // flecha que sí funciona.
    const primeraPagina = mount(PagerBar, { props: { ...BASE, prevDisabled: true } })

    expect(
      primeraPagina.find('[aria-label="Página anterior"]').attributes('disabled'),
    ).toBeDefined()
    expect(
      primeraPagina.find('[aria-label="Página siguiente"]').attributes('disabled'),
    ).toBeUndefined()
  })
})
