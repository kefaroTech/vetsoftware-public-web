import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PropuestaCapacidades from '@/features/asistente/components/PropuestaCapacidades.vue'
import type { CapacidadPropuesta } from '@/features/asistente/types/asistente.types'
import { elemento, exigir } from '../helpers/exigir'

/**
 * EL CONTROL QUE NO REPRECIA, Y QUE TIENE QUE DECIRLO.
 *
 * ── Qué se está fijando aquí, y por qué con pruebas y no con un comentario ──
 * `fijarCapacidades` guarda sedes y personas **solo en el cliente**: no hay
 * campo de capacidad en ninguna petición del asistente, y la oferta del paso 6
 * de una propuesta son sus líneas del servidor (`lineasDePropuesta`), que no
 * miran estos dos números. El bloque decía «Se ajusta al contratar», que es la
 * promesa exacta que el código no cumple —y que además contradice la línea de
 * capacidad que el servidor sí cotiza, `EXTRA_USER × 3`, cuando el prospecto
 * escribe 8 aquí—.
 *
 * <p>Un comentario no impide que alguien vuelva a escribir la frase. Estas
 * pruebas sí: afirman que en el texto que ve el usuario **no aparece ninguna
 * promesa de ajuste** y que sí aparece la advertencia, enlazada a los dos campos
 * para quien no la ve.
 */

function montar(capacidades: CapacidadPropuesta[] = [], sedes = 1, usuarios = 1) {
  return mount(PropuestaCapacidades, { props: { capacidades, sedes, usuarios } })
}

/** Lo que el servidor mandaría el día que el contrato publique el bloque. */
const CON_DATO: CapacidadPropuesta[] = [
  { unit: 'BRANCH', solicitado: 3, incluido: 1 },
  { unit: 'USER', solicitado: 8, incluido: 2 },
]

describe('PropuestaCapacidades · el control dice lo que hace y lo que no', () => {
  it('no promete ningún ajuste al contratar, ni con capacidades ni sin ellas', () => {
    const sinDato = montar().text()
    const conDato = montar(CON_DATO, 3, 8).text()

    // La frase literal que había, y cualquier variante de la misma promesa: lo
    // que se prohíbe es afirmar que esto se resuelve en el paso vinculante,
    // porque el paso vinculante no lo mira.
    for (const texto of [sinDato, conDato]) {
      expect(texto).not.toMatch(/se ajusta al contratar/i)
      expect(texto).not.toMatch(/el resto se ajusta/i)
    }
  })

  it('dice que no cambia el precio, y lo dice antes de los campos', () => {
    const wrapper = montar()

    expect(wrapper.get('[data-testid="pcap-nota"]').text()).toContain(
      'No cambia el precio de esta propuesta',
    )

    // Y va ANTES en el marcado: el aviso que llega después de teclear no evita
    // el malentendido, y el orden visual y el de lectura tienen que coincidir.
    const html = wrapper.html()
    const posicionNota = html.indexOf('pcap-nota')
    const posicionCampo = html.indexOf('¿Cuántas sedes tienes?')
    expect(posicionNota).toBeGreaterThanOrEqual(0)
    expect(posicionCampo).toBeGreaterThanOrEqual(0)
    expect(posicionNota).toBeLessThan(posicionCampo)
  })

  it('la advertencia está enlazada a los dos campos, no solo puesta encima', () => {
    const wrapper = montar()
    const idNota = exigir(
      wrapper.get('[data-testid="pcap-nota"]').attributes('id'),
      'un id en la nota para poder describirla',
    )

    const inputs = wrapper.findAll('input[type="number"]')
    expect(inputs).toHaveLength(2)
    for (const indice of [0, 1]) {
      expect(elemento(inputs, indice, 'los campos numéricos').attributes('aria-describedby')).toBe(
        idNota,
      )
    }
  })

  it('sin bloque de capacidades no afirma nada sobre lo incluido', () => {
    // Es el caso de HOY: `AssistantProposalResponse` no trae capacidades, así
    // que la lista llega vacía. Decir «0 incluidas» o «se ajusta» sería inventar.
    const texto = montar([], 3, 8).text()

    expect(texto).not.toMatch(/van incluidas/i)
    expect(texto).toContain('¿De qué tamaño es tu equipo?')
  })

  it('con dato del servidor sí dice cuántas van incluidas, y se para ahí', () => {
    const texto = montar(CON_DATO, 3, 8).text()

    expect(texto).toContain('8 personas: 2 van incluidas.')
    // Y concuerda con lo INCLUIDO, no con lo pedido: «3 sedes: 1 va incluida».
    expect(texto).toContain('3 sedes: 1 va incluida.')
    expect(texto).not.toMatch(/se ajusta/i)
  })

  it('emite el cambio con el valor normalizado: cero sedes no es una clínica', async () => {
    const wrapper = montar([], 1, 4)
    const sedes = elemento(wrapper.findAll('input[type="number"]'), 0, 'los campos numéricos')

    // `setValue` ya dispara el `change` del campo numérico: añadir un
    // `trigger('change')` encima emitía el par dos veces y la prueba medía el
    // doble disparo, no el redondeo.
    await sedes.setValue('0')

    // El segundo número viaja intacto: el control emite el par entero.
    expect(wrapper.emitted('cambiar')).toEqual([[1, 4]])
  })
})
