import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

/**
 * `SearchableSelect` activaba sus opciones con `@mousedown.prevent`, y eso lo
 * dejaba fuera del alcance de cualquiera que no use un ratón: `mousedown` no lo
 * emite ni el teclado (Enter/Espacio sobre un `<button>` sintetizan `click`,
 * nunca `mousedown`) ni la mayoría de lectores de pantalla al «pulsar» un
 * elemento. Con 22 consumidores —recetas, vacunas, cirugías, imágenes— eso era
 * el catálogo clínico entero.
 *
 * La corrección tiene dos mitades y aquí se prueban las dos:
 *
 *  1. Activar con `@click`. El aserto que detecta la regresión exacta es el
 *     INVERTIDO: `mousedown` por sí solo no debe emitir nada. Si alguien
 *     revierte a `@mousedown.prevent`, la prueba del `click` seguiría en verde
 *     —el navegador dispara `mousedown` antes que `click` en un ratón real, y
 *     `trigger('click')` de VTU no— pero esta caería.
 *  2. Devolver el foco al disparador. El panel se desmonta al elegir; sin esto
 *     el foco cae a `<body>` y quien navega con teclado vuelve al principio del
 *     documento.
 */

const OPCIONES = [
  { value: 'amoxicilina', label: 'Amoxicilina', hint: '500 mg' },
  { value: 'meloxicam', label: 'Meloxicam', hint: '2 mg' },
]

let wrapper: VueWrapper | null = null

/**
 * Montado en el documento real: el panel viaja a `<body>` con `Teleport` (se
 * stubbea para poder consultarlo desde el wrapper) y el componente escucha
 * `mousedown` en `document` para cerrarse al pulsar fuera. Sin `attachTo` los
 * eventos no llegarían a ese listener y el aserto invertido pasaría por no
 * tocar nada, que es justo lo que no queremos.
 */
function montar(props: Record<string, unknown> = {}) {
  wrapper = mount(SearchableSelect, {
    attachTo: document.body,
    props: { options: OPCIONES, modelValue: null, ...props },
    global: { stubs: { teleport: true } },
  })
  return wrapper
}

async function abrir(w: VueWrapper) {
  await w.find('button.trigger').trigger('click')
  await nextTick()
}

const opcion = (w: VueWrapper, etiqueta: string) =>
  w.findAll('button.item').find((b) => b.text().includes(etiqueta))!

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('SearchableSelect — activación por click', () => {
  it('el disparador abre el panel con click', async () => {
    const w = montar()

    await abrir(w)

    expect(w.findAll('button.item')).toHaveLength(2)
    expect(w.find('button.trigger').attributes('aria-expanded')).toBe('true')
  })

  it('elegir una opción con click emite update:modelValue con su value', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Meloxicam').trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([['meloxicam']])
  })

  it('un mousedown sobre la opción NO emite nada por sí solo', async () => {
    // Éste es el aserto que detecta la regresión: con `@mousedown.prevent` de
    // vuelta, aquí saldría ['meloxicam'] y quien no use ratón se quedaría sin
    // poder elegir.
    const w = montar()
    await abrir(w)

    await opcion(w, 'Meloxicam').trigger('mousedown')

    expect(w.emitted('update:modelValue')).toBeUndefined()
    // Y el panel sigue abierto: el mousedown tampoco puede cerrarlo de paso.
    expect(w.findAll('button.item')).toHaveLength(2)
  })

  it('elegir cierra el panel', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Amoxicilina').trigger('click')
    await nextTick()

    expect(w.findAll('button.item')).toHaveLength(0)
    expect(w.find('button.trigger').attributes('aria-expanded')).toBe('false')
  })
})

describe('SearchableSelect — el foco vuelve al disparador', () => {
  it('tras elegir una opción, el foco está en el disparador y no en <body>', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Amoxicilina').trigger('click')
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(w.find('button.trigger').element)
  })

  it('Escape también devuelve el foco al disparador, no solo cierra', async () => {
    const w = montar()
    await abrir(w)

    await w.find('input.search-input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    await nextTick()

    expect(w.findAll('button.item')).toHaveLength(0)
    expect(document.activeElement).toBe(w.find('button.trigger').element)
  })
})
