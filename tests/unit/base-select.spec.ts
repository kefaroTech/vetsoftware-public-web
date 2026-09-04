import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { exigir } from '../helpers/exigir'

/**
 * `BaseSelect` activaba sus opciones con `@mousedown.prevent`, y §2.5.2
 * Cancelación del puntero (A) exige que la función NO se complete en el
 * down-event: quien apretaba sobre la opción equivocada ya no podía arrastrar
 * fuera para cancelar, porque el valor estaba elegido. Con 50 consumidores eso
 * era medio catálogo de formularios.
 *
 * La corrección tiene dos mitades y aquí se prueban las dos:
 *
 *  1. Activar con `@click`. El aserto que detecta la regresión exacta es el
 *     INVERTIDO: `mousedown` por sí solo no debe emitir nada. Si alguien
 *     revierte a `@mousedown.prevent`, la prueba del `click` seguiría en verde
 *     —el navegador dispara `mousedown` antes que `click` en un ratón real, y
 *     `trigger('click')` de VTU no— pero esta caería.
 *  2. Devolver el foco al disparador. El `.prevent` era lo que impedía que el
 *     foco saliera de él; sin `close(true)` el foco acabaría en `<body>` y se
 *     cambiaría el incumplimiento de §2.5.2 por uno de orden de foco.
 */

const OPCIONES = [
  { value: 'canino', label: 'Canino' },
  { value: 'felino', label: 'Felino' },
]

let wrapper: VueWrapper | null = null

// El DOM de las pruebas no implementa `scrollIntoView`, y abrir el panel lo
// llama para traer a la vista la opción resaltada. Mismo apaño que
// `ancla-con-foco.spec.ts`.
const scrollIntoViewOriginal = Element.prototype.scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterAll(() => {
  Element.prototype.scrollIntoView = scrollIntoViewOriginal
})

/**
 * Montado en el documento real: el panel viaja a `<body>` con `Teleport` (se
 * stubbea para poder consultarlo desde el wrapper) y el componente escucha
 * `mousedown` en `document` para cerrarse al pulsar fuera. Sin `attachTo` los
 * eventos no llegarían a ese listener y el aserto invertido pasaría por no
 * tocar nada, que es justo lo que no queremos.
 */
function montar(props: Record<string, unknown> = {}) {
  wrapper = mount(BaseSelect, {
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
  exigir(
    w.findAll('li.item').find((li) => li.text().includes(etiqueta)),
    "w.findAll('li.item').find((li) => li.text().includes(…",
  )

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('BaseSelect — activación por click', () => {
  it('elegir una opción con click emite update:modelValue con su value', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Felino').trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([['felino']])
  })

  it('un mousedown sobre la opción NO emite nada por sí solo', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Felino').trigger('mousedown')

    expect(w.emitted('update:modelValue')).toBeUndefined()
    // Y el panel sigue abierto: el mousedown tampoco puede cerrarlo de paso.
    expect(w.findAll('li.item')).toHaveLength(2)
  })
})

describe('BaseSelect — el foco vuelve al disparador', () => {
  it('tras elegir con el ratón, el foco está en el disparador y no en <body>', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Canino').trigger('click')
    await nextTick()

    expect(w.find('button.trigger').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(w.find('button.trigger').element)
  })
})
