import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AccentButton from '@/features/tienda/components/AccentButton.vue'
import LinkButton from '@/features/tienda/components/LinkButton.vue'
import CategoryPill from '@/features/tienda/components/CategoryPill.vue'
import TonePill from '@/features/tienda/components/TonePill.vue'
import ExportBar from '@/features/tienda/components/ExportBar.vue'
import DiffCell from '@/features/tienda/components/DiffCell.vue'

/**
 * Las seis piezas pequeñas de la tienda. Son casi todo piel, así que aquí no se
 * comprueba el aspecto —eso lo cubre la galería visual— sino lo poco que sí
 * tienen de lógica y lo mucho que tienen de contrato con quien las usa: el
 * signo de la diferencia de un conteo, los tonos que se pasan en línea, los
 * `type="button"` que evitan enviar formularios y el formato del evento de
 * exportación.
 */

describe('DiffCell', () => {
  // La diferencia de un conteo físico: contado − sistema. El color es la señal
  // que el operador mira para decidir si vuelve a contar, así que los tres
  // estados tienen que ser excluyentes y el signo tiene que ser explícito.

  it('el cuadre exacto va en «zero», sin signo', () => {
    const wrapper = mount(DiffCell, { props: { value: 0 } })

    expect(wrapper.text()).toBe('0')
    expect(wrapper.find('.diff').classes()).toContain('zero')
  })

  it('el faltante va en «neg» y conserva el signo menos', () => {
    const wrapper = mount(DiffCell, { props: { value: -3 } })

    expect(wrapper.text()).toBe('-3')
    expect(wrapper.find('.diff').classes()).toContain('neg')
  })

  it('el sobrante va en «pos» y se le AÑADE el signo más', () => {
    // Sin el `+` explícito, «3» y «-3» se leen a distinta velocidad en una
    // columna de conteo y el sobrante pasa por un dato neutro.
    const wrapper = mount(DiffCell, { props: { value: 3 } })

    expect(wrapper.text()).toBe('+3')
    expect(wrapper.find('.diff').classes()).toContain('pos')
  })

  it('los tres estados son excluyentes', () => {
    // Van en el mismo objeto de clases y se calculan con tres comparaciones
    // independientes: es exactamente la forma en la que dos podrían encenderse
    // a la vez si alguien cambiara un `<` por un `<=`.
    for (const value of [-5, 0, 5]) {
      const clases = mount(DiffCell, { props: { value } }).find('.diff').classes()
      const encendidas = ['zero', 'neg', 'pos'].filter((c) => clases.includes(c))

      expect(encendidas).toHaveLength(1)
    }
  })

  it('no redondea ni recorta el valor', () => {
    // La hoja de conteo admite decimales en unidades fraccionables.
    expect(mount(DiffCell, { props: { value: -0.5 } }).text()).toBe('-0.5')
    expect(mount(DiffCell, { props: { value: 1.5 } }).text()).toBe('+1.5')
  })
})

describe('CategoryPill', () => {
  it('pinta la etiqueta y aplica el tono en línea', () => {
    // Los tonos son dinámicos (dependen de la categoría, que la crea el
    // tenant), por eso van en `style` y no en una clase: no se pueden conocer
    // en tiempo de compilación.
    const wrapper = mount(CategoryPill, {
      props: { label: 'Alimento', tone: { bg: 'rgb(240, 230, 200)', fg: 'rgb(80, 60, 20)' } },
    })

    expect(wrapper.text()).toBe('Alimento')
    const style = wrapper.find('.catpill').attributes('style') ?? ''
    expect(style).toContain('background: rgb(240, 230, 200)')
    expect(style).toContain('color: rgb(80, 60, 20)')
  })

  it('sin tono útil sigue siendo legible por el color de reserva de la clase', () => {
    // `.catpill` declara fondo y color propios; el `style` solo los pisa. Si la
    // clase perdiera ese respaldo, una categoría sin tono quedaría en blanco
    // sobre blanco.
    const wrapper = mount(CategoryPill, {
      props: { label: 'Sin categoría', tone: { bg: '', fg: '' } },
    })

    expect(wrapper.find('.catpill').exists()).toBe(true)
    expect(wrapper.text()).toBe('Sin categoría')
  })
})

describe('TonePill', () => {
  it('lleva el punto de color y el contenido del slot', () => {
    // Es la forma que compartían `StockStatePill` y `PromoStatusPill`; cada uno
    // conserva su mapa de tonos y su etiqueta, así que el texto viene por slot.
    const wrapper = mount(TonePill, {
      props: { tone: { bg: 'rgb(1, 2, 3)', fg: 'rgb(4, 5, 6)', dot: 'rgb(7, 8, 9)' } },
      slots: { default: 'Stock bajo' },
    })

    expect(wrapper.text()).toBe('Stock bajo')
    expect(wrapper.find('.pill').attributes('style')).toContain('background: rgb(1, 2, 3)')
    expect(wrapper.find('.dot').attributes('style')).toContain('background: rgb(7, 8, 9)')
  })

  it('el punto usa su propio color, no el del fondo de la píldora', () => {
    // Son tres colores distintos del mismo tono; si el punto heredara el fondo
    // desaparecería dentro de la píldora.
    const wrapper = mount(TonePill, {
      props: { tone: { bg: 'rgb(1, 2, 3)', fg: 'rgb(4, 5, 6)', dot: 'rgb(7, 8, 9)' } },
      slots: { default: 'Activa' },
    })

    expect(wrapper.find('.dot').attributes('style')).not.toContain('rgb(1, 2, 3)')
  })
})

describe('AccentButton', () => {
  it('renderiza el contenido del slot y no envía formularios', () => {
    const wrapper = mount(AccentButton, { slots: { default: 'Reactivar' } })

    expect(wrapper.text()).toBe('Reactivar')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('usa la métrica de acción de fila (sm) por defecto', () => {
    // Tres de las cuatro copias eran botones de fila; el «Nueva categoría» de
    // la cabecera es el caso raro y por eso es el que pide `md`.
    expect(mount(AccentButton).find('.acc-btn').classes()).toContain('acc-btn--sm')
    expect(
      mount(AccentButton, { props: { size: 'md' } })
        .find('.acc-btn')
        .classes(),
    ).toContain('acc-btn--md')
  })

  it('deja caer el clic al botón real', () => {
    // No declara emits: el `@click` del anfitrión cae por herencia de atributos.
    let pulsado = 0
    const wrapper = mount(AccentButton, {
      attrs: { onClick: () => (pulsado += 1) },
      slots: { default: 'Reactivar' },
    })

    wrapper.trigger('click')

    expect(pulsado).toBe(1)
  })
})

describe('LinkButton', () => {
  it('es un botón con aspecto de enlace, no un ancla', () => {
    // Importa para la accesibilidad y para el teclado: no navega a ninguna URL,
    // ejecuta una acción.
    const wrapper = mount(LinkButton, { slots: { default: 'Historial' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Historial')
  })
})

describe('ExportBar', () => {
  it('pinta la etiqueta del anfitrión junto a los dos formatos', () => {
    const wrapper = mount(ExportBar, { props: { label: 'Descargar kardex' } })

    expect(wrapper.find('.exp-lbl').text()).toBe('Descargar kardex')
    expect(wrapper.findAll('button.exp').map((b) => b.text())).toEqual(['CSV', 'PDF'])
  })

  it('emite «export» con el formato pulsado', () => {
    // Un solo evento con el formato como argumento, no dos eventos: así el
    // anfitrión escribe una sola función de descarga.
    const wrapper = mount(ExportBar, { props: { label: 'Descargar' } })
    const [csv, pdf] = wrapper.findAll('button.exp')

    csv!.trigger('click')
    pdf!.trigger('click')

    expect(wrapper.emitted('export')).toEqual([['csv'], ['pdf']])
  })

  it('deshabilitada no emite nada', () => {
    // Se deshabilita mientras el listado está vacío o cargando: dejar pasar el
    // clic generaría un CSV de cero filas o una segunda petición encima.
    const wrapper = mount(ExportBar, { props: { label: 'Descargar', disabled: true } })

    for (const boton of wrapper.findAll('button.exp')) {
      expect(boton.attributes('disabled')).toBeDefined()
      boton.trigger('click')
    }

    expect(wrapper.emitted('export')).toBeUndefined()
  })
})
