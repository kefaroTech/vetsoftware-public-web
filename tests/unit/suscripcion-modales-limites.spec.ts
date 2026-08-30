import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { MAX_CANTIDAD_LINEA, MAX_CANTIDAD_LINEA_TXT } from '@/constants/cantidades'
import AceptarCotizacionModal from '@/features/suscripcion/components/AceptarCotizacionModal.vue'
import CambiarCantidadModal from '@/features/suscripcion/components/CambiarCantidadModal.vue'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'
import type { SubscriptionItemResponse } from '@/features/suscripcion/types/suscripcion.types'

/**
 * LOS DOS TOPES QUE EL SERVIDOR IMPONE Y QUE ESTOS FORMULARIOS NO DECÍAN.
 *
 * ── Por qué un fichero para esto ───────────────────────────────────────────
 * Los dos modales no los montaba **ninguna** prueba unitaria, y los dos habían
 * perdido el mismo tipo de regla: el límite de arriba. Cada uno comprueba con
 * cuidado que el campo no se quede corto —vacío, cero, formato— y ninguno
 * comprobaba que no se pase.
 *
 * ── Qué se rompe, en concreto ──────────────────────────────────────────────
 *  · `CambiarCantidadModal` manda `quantity`, un `int` con `@Positive`. Por
 *    encima de `Integer.MAX_VALUE` el fallo es de DESERIALIZACIÓN, no de
 *    validación: Jackson no construye el objeto, así que no hay `ProblemDetail`
 *    con el nombre del campo — hay un 400 pelado. La clínica lee «no se pudo»
 *    sobre un formulario que no le señala nada.
 *  · `AceptarCotizacionModal` manda `acceptedByEmail`, que el servidor corta en
 *    120. La consola SÍ lo comprobaba (`quoteFormValidators.validateEmail`
 *    termina en `tooLong(value, 'El correo', 120)`); esta copia se había quedado
 *    sin. Un alias corporativo largo volvía como un 400 genérico que la pantalla
 *    cuenta como «no se pudo aceptar la propuesta» — y lo que el usuario tiene
 *    que corregir es la longitud de su correo, cosa que nadie le dice.
 *
 * ── Cada caso afirma DOS cosas ─────────────────────────────────────────────
 * Que el mensaje sale **y** que no sale la emisión. Solo lo primero dejaría
 * pasar un formulario que avisa y envía igual; solo lo segundo, uno que bloquea
 * en silencio, que es la versión educada de no funcionar. Y cada tope lleva su
 * caso de control con un valor legítimo: sin él, un validador que rechazara
 * TODO pasaría los casos del límite en verde.
 */

const LINEA: SubscriptionItemResponse = {
  id: 12,
  itemName: 'Personas',
  quantity: 3,
} as unknown as SubscriptionItemResponse

const OFERTA: QuoteResponse = {
  id: 88,
  quoteNumber: 'COT-2026-0088',
  subtotalAmount: 500_000,
  taxAmount: 95_000,
  totalAmount: 595_000,
  validUntil: '2026-09-30',
  status: 'SENT',
} as unknown as QuoteResponse

/** `teleport: true` porque `ModalShell` teletransporta a `body`. */
function montarCantidad() {
  return mount(CambiarCantidadModal, {
    props: { open: true, item: LINEA, usado: 2, dimensionCode: 'USER' },
    global: { stubs: { teleport: true } },
  })
}

function montarAceptar() {
  return mount(AceptarCotizacionModal, {
    props: { open: true, quote: OFERTA, totalMostrado: 595_000 },
    global: { stubs: { teleport: true } },
  })
}

/** Pulsa el botón de confirmar del modal, buscado por su rótulo. */
async function pulsar(wrapper: ReturnType<typeof montarCantidad>, rotulo: string) {
  const boton = wrapper.findAll('button').find((b) => b.text().includes(rotulo))!
  await boton.trigger('click')
}

describe('cambiar cantidad · el techo de `quantity`', () => {
  it('una cantidad imposible no sale, y el mensaje NOMBRA el límite', async () => {
    const wrapper = montarCantidad()
    await wrapper.find('input').setValue('99999999999')
    await pulsar(wrapper, 'Cambiar cantidad')

    expect(
      wrapper.emitted('guardar'),
      'no se manda lo que el servidor no puede leer',
    ).toBeUndefined()
    // «Demasiado grande» no le sirve a nadie: hay que decir cuánto es el máximo.
    expect(wrapper.text()).toContain(MAX_CANTIDAD_LINEA_TXT)
  })

  it('el techo exacto SÍ se manda: es un valor permitido, no un error', async () => {
    // El borde por dentro. Un `>` escrito como `>=` pone esto en rojo.
    const wrapper = montarCantidad()
    await wrapper.find('input').setValue(String(MAX_CANTIDAD_LINEA))
    await pulsar(wrapper, 'Cambiar cantidad')

    expect(wrapper.emitted('guardar')?.[0]).toEqual([MAX_CANTIDAD_LINEA])
  })

  it('una cantidad normal pasa sin comentarios', async () => {
    // El control: sin esto, un validador que rechazara todo pasaría el primer
    // caso en verde y nadie podría volver a cambiar una cantidad nunca.
    const wrapper = montarCantidad()
    await wrapper.find('input').setValue('7')
    await pulsar(wrapper, 'Cambiar cantidad')

    expect(wrapper.emitted('guardar')?.[0]).toEqual([7])
    expect(wrapper.text()).not.toContain(MAX_CANTIDAD_LINEA_TXT)
  })
})

/** Un correo válido de la longitud pedida: relleno + `@clinica.com` (12 caracteres). */
function correoDe(largo: number): string {
  return 'a'.repeat(largo - '@clinica.com'.length) + '@clinica.com'
}

describe('aceptar propuesta · el tope de 120 del correo', () => {
  it('un correo de 121 no se manda, y se dice que el problema es la longitud', async () => {
    const largo = correoDe(121)
    expect(largo, 'el caso tiene que ser un correo VÁLIDO y largo').toHaveLength(121)

    const wrapper = montarAceptar()
    await wrapper.find('input').setValue(largo)
    await pulsar(wrapper, 'Aceptar propuesta')

    expect(wrapper.emitted('aceptar')).toBeUndefined()
    // El texto de la consola, literal: es la misma regla y no debe sonar distinta.
    expect(wrapper.text()).toContain('El correo no puede pasar de 120 caracteres.')
  })

  it('120 justos SÍ se aceptan: el tope es inclusivo, igual que en el servidor', async () => {
    const wrapper = montarAceptar()
    await wrapper.find('input').setValue(correoDe(120))
    await pulsar(wrapper, 'Aceptar propuesta')

    expect(wrapper.emitted('aceptar')?.[0]).toEqual([correoDe(120)])
  })

  it('un correo corriente sigue pasando', async () => {
    // El control del caso de arriba, y además la prueba de que el tope no se
    // comió la comprobación de formato que ya existía.
    const wrapper = montarAceptar()
    await wrapper.find('input').setValue('ana@clinicanorte.com.co')
    await pulsar(wrapper, 'Aceptar propuesta')

    expect(wrapper.emitted('aceptar')?.[0]).toEqual(['ana@clinicanorte.com.co'])
    expect(wrapper.text()).not.toContain('no puede pasar de 120')
  })
})
