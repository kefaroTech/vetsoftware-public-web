import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LandingSelectorModulos from '@/features/landing/components/LandingSelectorModulos.vue'
import { importeEstimado } from '@/features/landing/composables/planPricing'
import { articulo, catalogoEmbudo } from '../helpers/catalogo-embudo'
import { elemento } from '../helpers/exigir'

/**
 * EL SELECTOR DE MÓDULOS DE LA PORTADA.
 *
 * <p>Lo que se protege aquí son las cuatro decisiones que cuestan dinero o
 * accesibilidad si alguien las deshace: que la casilla es **nativa** —un
 * `aria-pressed` se anuncia como acción inmediata y esto es un valor de
 * formulario con consecuencia económica—, que el `<label>` envuelve la fila
 * entera —sin él el objetivo táctil son 20px y §2.5.8 falla—, que el núcleo NO
 * es un control, y que plegar un área no toca la selección.
 */
function montar(modulos: string[] = []) {
  return mount(LandingSelectorModulos, {
    attachTo: document.body,
    props: { catalogo: catalogoEmbudo(), modulos },
  })
}

describe('LandingSelectorModulos — casillas nativas, núcleo fijo y plegado inocuo', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('el núcleo se muestra, no se marca: ninguna casilla lo representa', () => {
    const wrapper = montar()
    const nucleo = wrapper.find('.lsm-nucleo')

    expect(nucleo.element.tagName).toBe('P')
    expect(nucleo.text()).toContain('Núcleo: clientes y mascotas — incluido siempre')
    expect(nucleo.text()).toContain(importeEstimado(59_000))
    expect(nucleo.find('input').exists()).toBe(false)
    // Nunca una casilla `disabled checked`: eso es §3.3.2 sin etiqueta de restricción.
    expect(wrapper.findAll('input[disabled]')).toHaveLength(0)
  })

  it('solo la primera área arranca desplegada, en el orden que publica el servidor', () => {
    const wrapper = montar()
    const cabeceras = wrapper.findAll('h3 button')

    expect(cabeceras.map((b) => b.attributes('aria-expanded'))).toEqual(['true', 'false'])
    expect(elemento(cabeceras, 0, 'las cabeceras').text()).toContain('Atención a los pacientes')
    expect(elemento(cabeceras, 1, 'las cabeceras').text()).toContain('Mostrador y dinero')
  })

  it('cada fila es un <label> con la casilla, el nombre y el precio dentro', () => {
    const wrapper = montar(['SCHEDULING'])
    const fila = elemento(wrapper.findAll('.lsm-fila'), 0, 'las filas de módulo')

    expect(fila.element.tagName).toBe('LABEL')
    const casilla = fila.find('input[type="checkbox"]')
    expect((casilla.element as HTMLInputElement).checked).toBe(true)
    // El nombre accesible que se oye al llegar: «Agenda de citas $ 35.000».
    expect(fila.text()).toContain('Agenda de citas')
    expect(fila.text()).toContain(importeEstimado(35_000))
    expect(fila.classes()).toContain('is-on')
  })

  it('las filas solo listan lo vendible del área, con el nombre completo del catálogo', () => {
    const wrapper = montar()
    // El área abierta es la primera; la segunda trae un artículo no vendible.
    expect(wrapper.findAll('.lsm-fila').map((f) => f.find('.lsm-nombre').text())).toEqual([
      'Agenda de citas',
      'Historia clínica y consultas',
    ])
  })

  it('marcar y desmarcar piden el cambio con el estado que quedó en la casilla', async () => {
    const wrapper = montar([])
    await elemento(wrapper.findAll('.lsm-fila input'), 0, 'las casillas').setValue(true)

    expect(wrapper.emitted('alternar')).toEqual([['SCHEDULING', true]])

    const marcado = montar(['SCHEDULING'])
    await elemento(marcado.findAll('.lsm-fila input'), 0, 'las casillas').setValue(false)

    expect(marcado.emitted('alternar')).toEqual([['SCHEDULING', false]])
  })

  it('plegar un área NO desmarca nada, y su insignia sigue contando lo que hay dentro', async () => {
    const wrapper = montar(['SCHEDULING', 'CLINICAL_HISTORY'])
    const cabecera = elemento(wrapper.findAll('h3 button'), 0, 'las cabeceras')

    expect(wrapper.findAll('.lsm-fila')).toHaveLength(2)
    expect(cabecera.find('.lsm-badge').text()).toBe('2 de 2 módulos marcados')

    await cabecera.trigger('click')

    expect(cabecera.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.lsm-fila')).toHaveLength(0)
    // La selección es del padre: el componente no la ha tocado ni ha pedido tocarla.
    expect(wrapper.emitted('alternar')).toBeUndefined()
    expect(cabecera.find('.lsm-badge').text()).toBe('2 de 2 módulos marcados')
  })

  it('una selección vacía no bloquea nada: las áreas se abren igual', async () => {
    const wrapper = montar([])
    const segunda = elemento(wrapper.findAll('h3 button'), 1, 'las cabeceras')

    expect(segunda.find('.lsm-badge').text()).toBe('ninguno de 2 módulos marcados')
    await segunda.trigger('click')

    expect(segunda.attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('.lsm-fila')).toHaveLength(4)
  })

  it('trece casillas son trece paradas de tabulación: cero roving tabindex', async () => {
    const wrapper = montar()
    await elemento(wrapper.findAll('h3 button'), 1, 'las cabeceras').trigger('click')

    expect(wrapper.findAll('[tabindex]')).toHaveLength(0)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(4)
  })

  it('sin áreas publicadas lo dice, en vez de dejar una tarjeta muda', () => {
    const wrapper = mount(LandingSelectorModulos, {
      props: { catalogo: catalogoEmbudo({ areas: [] }), modulos: [] },
    })
    const aviso = wrapper.find('[role="status"]')

    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain('Todavía no hay módulos publicados')
  })

  it('sin catálogo todavía no afirma nada: ni áreas, ni vacío, ni núcleo', () => {
    const wrapper = mount(LandingSelectorModulos, { props: { catalogo: null, modulos: [] } })

    expect(wrapper.findAll('h3')).toHaveLength(0)
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
    expect(wrapper.findAll('.lsm-nucleo')).toHaveLength(0)
  })

  it('sin precio no se pinta ninguna cifra, y el núcleo cuenta lo que incluye', () => {
    const wrapper = mount(LandingSelectorModulos, {
      attachTo: document.body,
      props: { catalogo: catalogoEmbudo(), modulos: [], conPrecio: false },
    })

    expect(wrapper.findAll('.lsm-precio')).toHaveLength(0)
    expect(wrapper.findAll('.lsm-nucleo-pre')).toHaveLength(0)
    // El nombre queda solo: «incluido siempre» pasa a la descripción, que la
    // publica el catálogo.
    expect(wrapper.get('.lsm-nucleo-nom').text()).toBe('Núcleo: clientes y mascotas')
  })

  /**
   * En la portada es la primera vez que alguien lee estos nombres, y «Agenda de
   * citas» no dice qué se lleva. La descripción la publica el catálogo: la fila
   * la pinta, no la escribe.
   */
  it('sin precio la fila del módulo lleva su descripción, dentro del <label>', () => {
    const wrapper = mount(LandingSelectorModulos, {
      attachTo: document.body,
      props: {
        catalogo: catalogoEmbudo({
          articulos: [
            articulo({
              code: 'SCHEDULING',
              descripcion: 'Reserva, recordatorios y sala de espera',
            }),
          ],
        }),
        modulos: [],
        conPrecio: false,
      },
    })
    const fila = elemento(wrapper.findAll('.lsm-fila'), 0, 'las filas de módulo')

    expect(fila.element.tagName).toBe('LABEL')
    expect(fila.get('.lsm-desc').text()).toBe('Reserva, recordatorios y sala de espera')
    // Sigue siendo el objetivo táctil entero: la casilla no se sale del rótulo.
    expect(fila.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('con precio la fila NO añade descripción: ahí la cifra es lo que se decide', () => {
    const wrapper = mount(LandingSelectorModulos, {
      attachTo: document.body,
      props: {
        catalogo: catalogoEmbudo({
          articulos: [articulo({ code: 'SCHEDULING', descripcion: 'Reserva y recordatorios' })],
        }),
        modulos: [],
      },
    })

    expect(wrapper.findAll('.lsm-desc')).toHaveLength(0)
    expect(wrapper.findAll('.lsm-precio')).toHaveLength(1)
  })

  it('la nota explica la marca, y solo donde de verdad hay una que explicar', () => {
    const wrapper = mount(LandingSelectorModulos, {
      attachTo: document.body,
      props: {
        catalogo: catalogoEmbudo(),
        modulos: ['SCHEDULING'],
        conPrecio: false,
        // `CLINICAL_HISTORY` se detectó pero el visitante lo quitó: sin marca no
        // hay nada que justificar.
        detectados: ['SCHEDULING', 'CLINICAL_HISTORY'],
      },
    })
    const filas = wrapper.findAll('.lsm-fila')

    expect(elemento(filas, 0, 'las filas').text()).toContain('Porque lo mencionaste')
    expect(elemento(filas, 1, 'las filas').text()).not.toContain('Porque lo mencionaste')
  })

  /**
   * Misma regla que la detección, y por el mismo motivo: un módulo que la
   * pantalla marcó sola dentro de un área plegada se cobra sin que nadie lo
   * haya visto, y eso deja el premarcado sin divulgación proactiva.
   */
  it('con premarcado se abren las áreas que lo tienen, como con la detección', () => {
    const wrapper = mount(LandingSelectorModulos, {
      attachTo: document.body,
      props: {
        catalogo: catalogoEmbudo(),
        modulos: ['CASH_REGISTER'],
        premarcados: ['CASH_REGISTER'],
      },
    })

    expect(wrapper.findAll('h3 button').map((b) => b.attributes('aria-expanded'))).toEqual([
      'false',
      'true',
    ])
    // Y la casilla está en el documento: plegada no se puede leer ni desmarcar.
    expect(wrapper.find('input[type="checkbox"][value="CASH_REGISTER"]').exists()).toBe(true)
  })

  it('con detección se abren las áreas que la tienen, y solo esas', () => {
    const wrapper = mount(LandingSelectorModulos, {
      attachTo: document.body,
      props: { catalogo: catalogoEmbudo(), modulos: [], detectados: ['CASH_REGISTER'] },
    })

    // Sin detección se abriría la primera; con ella se abre la que la tiene.
    expect(wrapper.findAll('h3 button').map((b) => b.attributes('aria-expanded'))).toEqual([
      'false',
      'true',
    ])
  })
})
