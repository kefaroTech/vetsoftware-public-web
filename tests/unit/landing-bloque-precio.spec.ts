import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BloquePrecioVivo from '@/features/landing/components/BloquePrecioVivo.vue'
import type { EstadoImporte, SaltoDePaquete } from '@/features/landing/composables/useCotizador'
import { PACK_BARRIO, catalogoEmbudo } from '../helpers/catalogo-embudo'
import { elemento } from '../helpers/exigir'

/**
 * EL BLOQUE DE PRECIO EN VIVO.
 *
 * <p>El riesgo real de esta caja no es que falle: es que **acierte tarde**. Una
 * cifra que se queda en pantalla mientras el servidor calcula otra se lee como
 * la respuesta a una pregunta que todavía no se ha contestado, y para quien
 * explora con lector no hay ninguna pista de que ya no vale. Por eso las
 * pruebas de abajo miran el `aria-hidden` de la cifra y el rótulo, no el
 * aspecto.
 */
const BASE = {
  catalogo: catalogoEmbudo(),
  modulos: [] as string[],
  sedes: 1,
  usuarios: 2,
  ciclo: 'MENSUAL' as const,
  estado: 'LISTO' as EstadoImporte,
  lento: false,
  importe: '$ 187.000',
  mensajeDeFallo: null as string | null,
  regionViva: '',
  saltoDePaquete: null as SaltoDePaquete | null,
}

function montar(over: Partial<typeof BASE> = {}) {
  return mount(BloquePrecioVivo, { props: { ...BASE, ...over } })
}

describe('BloquePrecioVivo — la cifra vieja nunca se hace pasar por la nueva', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('firme: la cifra se expone, el rótulo dice «desde» y no hay nota de recálculo', () => {
    const wrapper = montar({ importe: '$ 187.000' })
    const cifra = wrapper.find('.lpr-cifra')

    expect(wrapper.attributes('data-estado')).toBe('firme')
    expect(cifra.text()).toBe('$ 187.000')
    expect(cifra.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('.lpr-desde').text()).toBe('desde')
    expect(wrapper.find('.lpr-nota').exists()).toBe(false)
  })

  it('recalculando: la cifra anterior sigue en pantalla pero queda fuera del árbol accesible', () => {
    const wrapper = montar({ estado: 'CALCULANDO' })
    const cifra = wrapper.find('.lpr-cifra')

    expect(wrapper.attributes('data-estado')).toBe('recalculando')
    expect(cifra.text()).toBe('$ 187.000')
    expect(cifra.attributes('aria-hidden')).toBe('true')
    // Tres canales, ninguno solo de color: el rótulo y la nota son los otros dos.
    expect(wrapper.find('.lpr-desde').text()).toBe('calculando')
    expect(wrapper.find('.lpr-nota').text()).toBe('Actualizando con los precios de hoy…')
  })

  it('lento: el mismo dibujo, distinta marca, y ninguna región viva propia', () => {
    const wrapper = montar({
      estado: 'CALCULANDO',
      lento: true,
      regionViva: 'Calculando el precio.',
    })

    expect(wrapper.attributes('data-estado')).toBe('lento')
    expect(wrapper.find('.lpr-cifra').attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('[aria-live]')).toHaveLength(1)
  })

  it('fallo: la cifra llega ya destruida y el motivo se lee, sin cerrar el camino', () => {
    const wrapper = montar({
      estado: 'ERROR',
      importe: '—',
      mensajeDeFallo: 'No pudimos calcular el precio ahora mismo.',
    })

    expect(wrapper.attributes('data-estado')).toBe('fallido')
    expect(wrapper.find('.lpr-cifra').text()).toBe('—')
    expect(wrapper.find('.lpr-cifra').attributes('aria-hidden')).toBe('true')

    const aviso = wrapper.find('.lpr-fallo')
    // `status` y no `alert`: no se ha roto el camino, solo falta el número.
    expect(aviso.attributes('role')).toBe('status')
    expect(aviso.text()).toBe('No pudimos calcular el precio ahora mismo.')
    // La línea de extras no convive con el fallo: afirmaría un desglose sin total.
    expect(wrapper.find('.lpr-l3').exists()).toBe(false)
    expect(wrapper.findAll('[disabled]')).toHaveLength(0)
  })

  it('sin tarifa publicada lo dice, en vez de dejar el guion sin explicación', () => {
    const wrapper = montar({ estado: 'SIN_CATALOGO', importe: '—' })

    expect(wrapper.attributes('data-estado')).toBe('sin-catalogo')
    expect(wrapper.find('.lpr-fallo').text()).toContain('Todavía no hay precios publicados')
  })

  it('una sola región viva en toda la pantalla, atómica, y solo con lo que le pasan', () => {
    const wrapper = montar({ regionViva: 'Núcleo y 2 módulos. Desde $ 187.000 más IVA al mes.' })
    const vivas = wrapper.findAll('[aria-live]')

    expect(vivas).toHaveLength(1)
    const viva = elemento(vivas, 0, 'las regiones vivas')
    expect(viva.attributes('aria-live')).toBe('polite')
    expect(viva.attributes('aria-atomic')).toBe('true')
    expect(viva.classes()).toContain('ds-sr-only')
    expect(viva.text()).toBe('Núcleo y 2 módulos. Desde $ 187.000 más IVA al mes.')
  })

  it('selección vacía: «Solo el núcleo», y nada bloqueado', () => {
    const wrapper = montar({ modulos: [] })

    expect(wrapper.find('.lpr-l1').text()).toBe('Estás pagando Solo el núcleo y nada más')
    expect(wrapper.findAll('[disabled]')).toHaveLength(0)
    expect(wrapper.findAll('[aria-disabled]')).toHaveLength(0)
  })

  it('el conteo del titular resuelve el singular, que es el caso más común', () => {
    expect(
      montar({ modulos: ['SCHEDULING'] })
        .find('.lpr-l1')
        .text(),
    ).toBe('Estás pagando Núcleo + 1 módulo y nada más')
    expect(
      montar({ modulos: ['SCHEDULING', 'CASH_REGISTER'] })
        .find('.lpr-l1')
        .text(),
    ).toBe('Estás pagando Núcleo + 2 módulos y nada más')
  })

  it('la línea de extras sale del catálogo: incluidas, cobradas y las que no se pagan', () => {
    const wrapper = montar({ modulos: ['SCHEDULING'], sedes: 1, usuarios: 3 })

    expect(wrapper.find('.lpr-l3').text()).toBe(
      'Núcleo, 1 sede y 2 personas incluidos, más 1 persona adicional. No pagas los otros 3 módulos.',
    )
  })

  it('sin unidades de más, la frase no inventa extras', () => {
    const wrapper = montar({ modulos: ['SCHEDULING'], sedes: 1, usuarios: 2 })

    expect(wrapper.find('.lpr-l3').text()).toBe(
      'Núcleo, 1 sede y 2 personas incluidos. No pagas los otros 3 módulos.',
    )
  })

  it('con todo marcado no afirma que quedan cero módulos por pagar', () => {
    const wrapper = montar({
      modulos: ['SCHEDULING', 'CLINICAL_HISTORY', 'CASH_REGISTER', 'INVOICING'],
    })

    expect(wrapper.find('.lpr-l3').text()).toBe('Núcleo, 1 sede y 2 personas incluidos.')
  })

  it('el salto de paquete explica y ofrece deshacer, sin región viva propia', async () => {
    const wrapper = montar({
      modulos: ['SCHEDULING'],
      saltoDePaquete: { paquete: PACK_BARRIO, texto: 'Los 2 módulos de Consulta de barrio…' },
    })
    const salto = wrapper.find('.lpr-salto')

    expect(salto.attributes('role')).toBe('status')
    expect(salto.find('.lpr-salto-t').text()).toBe('Subió el precio porque se perdió el descuento')
    expect(salto.find('.lpr-salto-c').text()).toBe('Los 2 módulos de Consulta de barrio…')
    expect(wrapper.findAll('[aria-live]')).toHaveLength(1)

    const volver = salto.find('button')
    expect(volver.text()).toBe('Volver a Consulta de barrio')
    await volver.trigger('click')
    expect(wrapper.emitted('volver-al-paquete')).toHaveLength(1)
  })

  it('sin salto no hay caja que explicar', () => {
    expect(montar().find('.lpr-salto').exists()).toBe(false)
  })
})
