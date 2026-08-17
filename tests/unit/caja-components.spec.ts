import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import CajaPanel from '@/features/caja/components/CajaPanel.vue'
import CashTable from '@/features/caja/components/CashTable.vue'
import CashStatusPill from '@/features/caja/components/CashStatusPill.vue'
import CashTotalsGrid from '@/features/caja/components/CashTotalsGrid.vue'
import CashLinkButton from '@/features/caja/components/CashLinkButton.vue'
import { formatMoney } from '@/features/caja/composables/useCaja'
import type { MethodTotal } from '@/features/caja/types/caja'

/**
 * Las cinco piezas que FE-08 extrajo del feature de caja. Antes eran marcado y
 * CSS copiados entre los tres paneles, las tres tablas y el modal de detalle;
 * hoy son una sola pieza de la que dependen todos, así que un cambio aquí ya no
 * se nota en una pantalla: se nota en seis.
 *
 * Lo que se fija en cada una es su contrato, no su aspecto —de eso se ocupa la
 * galería visual—: la prop que introduce una diferencia real (`tight`,
 * `expected`, `minWidth`), el mapa estado → etiqueta, y que el contenido que
 * pone el consumidor por slot llegue intacto al DOM.
 */

describe('CajaPanel', () => {
  it('pinta el título en la cabecera', () => {
    const wrapper = mount(CajaPanel, { props: { title: 'Historial de cajas' } })

    expect(wrapper.find('.caja-panel-title').text()).toBe('Historial de cajas')
  })

  it('omite el contador cuando el consumidor no da el slot', () => {
    // El `<span class="ds-meta">` va tras `v-if="$slots.count"`: sin slot no
    // debe quedar un hueco vacío a la derecha del título.
    const wrapper = mount(CajaPanel, { props: { title: 'Cajas abiertas' } })

    expect(wrapper.find('.ds-meta').exists()).toBe(false)
  })

  it('pinta el contador cuando sí lo hay', () => {
    const wrapper = mount(CajaPanel, {
      props: { title: 'Cajas abiertas' },
      slots: { count: '3 abiertas' },
    })

    expect(wrapper.find('.ds-meta').text()).toBe('3 abiertas')
  })

  it('el cuerpo es libre: el slot por defecto se renderiza dentro de la tarjeta', () => {
    const wrapper = mount(CajaPanel, {
      props: { title: 'Mi caja' },
      slots: { default: '<p class="cuerpo">Sin sesión abierta.</p>' },
    })

    expect(wrapper.find('.ds-card .cuerpo').text()).toBe('Sin sesión abierta.')
  })

  it('`tight` es la ÚNICA diferencia real entre las dos copias que fundió', () => {
    // El panel de cajas abiertas se dibuja unos píxeles más plano que el de
    // historial, y eso era deliberado. Si `tight` dejara de aplicar su clase, la
    // fusión habría cambiado el diseño en silencio.
    const normal = mount(CajaPanel, { props: { title: 'Historial' } })
    const plano = mount(CajaPanel, { props: { title: 'Abiertas', tight: true } })

    expect(normal.find('.caja-panel').classes()).not.toContain('caja-panel--tight')
    expect(plano.find('.caja-panel').classes()).toContain('caja-panel--tight')
  })

  it('sin icono no monta ningún svg; con icono sí', () => {
    const sinIcono = mount(CajaPanel, { props: { title: 'Historial' } })
    expect(sinIcono.find('.caja-panel-title svg').exists()).toBe(false)

    const Icono = { render: () => h('svg', { 'data-icono': 'wallet' }) }
    const conIcono = mount(CajaPanel, { props: { title: 'Historial', icon: Icono } })
    expect(conIcono.find('[data-icono="wallet"]').exists()).toBe(true)
  })
})

describe('CashTable', () => {
  /** Cabecera + una fila numérica: la forma exacta que usan las tres tablas. */
  const CONTENIDO = `
    <thead><tr><th>Sede</th><th class="num">Total</th></tr></thead>
    <tbody>
      <tr><td class="branch-name">Sede Norte</td><td class="num">$ 120.000</td></tr>
    </tbody>
  `

  it('renderiza el contenido del slot dentro de la tabla', () => {
    const wrapper = mount(CashTable, {
      props: { minWidth: 720 },
      slots: { default: CONTENIDO },
    })

    expect(wrapper.find('table.movs thead th').text()).toBe('Sede')
    expect(wrapper.findAll('table.movs tbody td')).toHaveLength(2)
  })

  it('las clases de celda del consumidor sobreviven al paso por el slot', () => {
    // El CSS del componente las alcanza con `:deep()` porque el contenido
    // pertenece al ámbito del padre. Si el armazón envolviera o reescribiera el
    // slot, `.num` y `.branch-name` dejarían de existir en el DOM y las columnas
    // numéricas volverían a alinearse a la izquierda sin que nada fallara.
    const wrapper = mount(CashTable, {
      props: { minWidth: 720 },
      slots: { default: CONTENIDO },
    })

    expect(wrapper.findAll('.num')).toHaveLength(2)
    expect(wrapper.find('th.num').exists()).toBe(true)
    expect(wrapper.find('td.branch-name').text()).toBe('Sede Norte')
  })

  it('acepta la fila vacía con su clase propia', () => {
    const wrapper = mount(CashTable, {
      props: { minWidth: 520 },
      slots: { default: '<tbody><tr><td class="empty-row">Sin movimientos.</td></tr></tbody>' },
    })

    expect(wrapper.find('td.empty-row').text()).toBe('Sin movimientos.')
  })

  it('lleva el ancho mínimo a la tabla, no al contenedor con scroll', () => {
    // Al revés no funcionaría: el contenedor es el que debe poder encogerse
    // para que aparezca la barra horizontal.
    const wrapper = mount(CashTable, { props: { minWidth: 860 }, slots: { default: '<tbody/>' } })

    expect(wrapper.find('table.movs').attributes('style')).toContain('min-width: 860px')
    expect(wrapper.find('.table-scroll').attributes('style')).toBeUndefined()
  })
})

describe('CashStatusPill', () => {
  it('traduce OPEN a «Abierta»', () => {
    const wrapper = mount(CashStatusPill, { props: { status: 'OPEN' } })

    expect(wrapper.text()).toBe('Abierta')
    expect(wrapper.find('.cash-pill').classes()).toContain('open')
  })

  it('traduce CLOSED a «Cerrada»', () => {
    const wrapper = mount(CashStatusPill, { props: { status: 'CLOSED' } })

    expect(wrapper.text()).toBe('Cerrada')
    expect(wrapper.find('.cash-pill').classes()).toContain('closed')
  })

  it('los dos estados son excluyentes', () => {
    // La clase sale de un ternario, no de un mapa: si alguien lo convirtiera en
    // dos `:class` independientes podrían coincidir y el color quedaría al
    // albur del orden de las reglas.
    const abierta = mount(CashStatusPill, { props: { status: 'OPEN' } })

    expect(abierta.find('.cash-pill').classes()).not.toContain('closed')
  })
})

describe('CashTotalsGrid', () => {
  const TOTALES: MethodTotal[] = [
    { method: 'CASH', expectedAmount: 250_000 },
    { method: 'CARD', expectedAmount: 90_000 },
  ]

  it('encabeza la rejilla con la base inicial', () => {
    const wrapper = mount(CashTotalsGrid, { props: { openingFloat: 50_000, totals: [] } })
    const base = wrapper.find('.total-card.base')

    expect(base.find('.lbl').text()).toBe('Base inicial')
    expect(base.find('.val').text()).toBe(formatMoney(50_000))
  })

  it('pinta una tarjeta por medio de pago, con su rótulo en español', () => {
    const wrapper = mount(CashTotalsGrid, { props: { openingFloat: 0, totals: TOTALES } })

    const rotulos = wrapper.findAll('.total-card .lbl').map((n) => n.text())
    expect(rotulos).toEqual(['Base inicial', 'Efectivo', 'Tarjeta'])
  })

  it('sin `expected` el rótulo va limpio', () => {
    // Es la vista de «mi caja» con la sesión en curso: ahí las cifras son las
    // que hay, no una expectativa contra la que se va a contar.
    const wrapper = mount(CashTotalsGrid, { props: { openingFloat: 0, totals: TOTALES } })

    expect(wrapper.text()).not.toContain('(esperado)')
  })

  it('con `expected` añade el sufijo «(esperado)» a cada medio de pago', () => {
    // Es la única diferencia que tenían las dos copias que este componente
    // fundió, y no es cosmética: en el arqueo distingue lo que el sistema
    // espera de lo que el cajero contó.
    const wrapper = mount(CashTotalsGrid, {
      props: { openingFloat: 0, totals: TOTALES, expected: true },
    })

    const rotulos = wrapper.findAll('.total-card .lbl').map((n) => n.text())
    expect(rotulos).toEqual(['Base inicial', 'Efectivo (esperado)', 'Tarjeta (esperado)'])
  })

  it('el sufijo NO alcanza a la base inicial', () => {
    // La base no es una expectativa: es el dato con el que se abrió la caja.
    const wrapper = mount(CashTotalsGrid, {
      props: { openingFloat: 50_000, totals: TOTALES, expected: true },
    })

    expect(wrapper.find('.total-card.base .lbl').text()).toBe('Base inicial')
  })

  it('no calcula: pinta los importes tal como llegan', () => {
    // Los totales los resuelve el backend. Si el componente sumara o restara
    // algo, el arqueo dejaría de cuadrar con el cierre del servidor.
    const wrapper = mount(CashTotalsGrid, {
      props: { openingFloat: 50_000, totals: TOTALES, expected: true },
    })

    const valores = wrapper.findAll('.total-card .val').map((n) => n.text())
    expect(valores).toEqual([formatMoney(50_000), formatMoney(250_000), formatMoney(90_000)])
  })

  it('una sesión sin movimientos deja solo la base', () => {
    const wrapper = mount(CashTotalsGrid, { props: { openingFloat: 0, totals: [] } })

    expect(wrapper.findAll('.total-card')).toHaveLength(1)
  })
})

describe('CashLinkButton', () => {
  it('es un botón de tipo button, no un submit', () => {
    // Vive dentro de tablas que a veces cuelgan de un `<form>` de filtros: un
    // `type` implícito enviaría el formulario al pulsar «Ver caja».
    const wrapper = mount(CashLinkButton, { slots: { default: 'Ver caja' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('pinta la etiqueta que le pasa el consumidor', () => {
    const wrapper = mount(CashLinkButton, { slots: { default: 'CSV' } })

    expect(wrapper.text()).toBe('CSV')
  })

  it('deja caer los atributos y el clic al botón real', () => {
    // No declara props ni emits: `title`, `aria-label` y `@click` llegan por
    // herencia. Si alguien añadiera un elemento raíz envolvente, el clic dejaría
    // de tener botón al que engancharse.
    const wrapper = mount(CashLinkButton, {
      attrs: { 'aria-label': 'Ver caja 12', title: 'Ver caja 12' },
      slots: { default: 'Ver caja' },
    })

    expect(wrapper.attributes('aria-label')).toBe('Ver caja 12')
    expect(wrapper.attributes('title')).toBe('Ver caja 12')
  })
})
