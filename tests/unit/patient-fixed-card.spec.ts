import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PatientFixedCard from '@/features/acciones/components/PatientFixedCard.vue'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'

/**
 * La ficha del paciente fijado sustituye a una cadena de `v-if / v-else-if`
 * que estaba copiada en los siete modales de acciones. Al extraerla, la regla
 * de negocio quedó viviendo únicamente en el ORDEN de dos condiciones dentro de
 * una plantilla: nada impide que un futuro reordenado la invierta sin que se
 * caiga ni el compilador ni el linter.
 *
 * Lo que estas pruebas fijan es esa regla, no el marcado:
 *
 *   1. `summary` (el animal del registro que se edita) gana sobre `animal` (el
 *      preseleccionado por la vista). Al editar desde una lista con paciente
 *      seleccionado llegan LOS DOS, y el que vale es el del registro: si
 *      ganara la preselección, el modal mostraría un paciente distinto al que
 *      la fila que se está editando tiene guardado.
 *   2. Sin ninguno de los dos no se pinta nada. La ficha no puede degradarse a
 *      un recuadro vacío con la pata dibujada y ningún nombre al lado.
 *   3. El pie de la rama de preselección concatena `especie · raza` y añade
 *      `· propietario` SOLO si viene. Sin la guarda quedaba un `·` colgando.
 */

/**
 * Animal completo. Se llamaba «mínimo» y llevaba un `as AnimalResponse & typeof
 * overrides` que ocultaba DOS cosas: que faltaba `enabled` —campo obligatorio— y,
 * peor, que `overrides` no se aplicaba nunca. La firma prometía un fixture
 * parametrizable y devolvía siempre el mismo animal; cualquier caso futuro que
 * pasara un `override` habría afirmado sobre un valor que jamás se puso.
 */
function animalDe(overrides: Partial<AnimalResponse> = {}): AnimalResponse {
  return {
    id: 7,
    name: 'Kira',
    code: 'A-0007',
    specie: { id: 1, name: 'Canino' },
    breed: { id: 3, name: 'Beagle' },
    owner: { id: 11, name: 'Ana Restrepo', document: '1017254398' },
    gender: 'FEMALE',
    // Los tres valían 'KG' / 'PET' / 'INTACT', que NO están en los enums del dominio
    // (`KILOGRAMS`, `SERVICE|SUPPORT|NONE`, `STERILIZED|NO_STERILIZED|UNKNOWN`). El `as`
    // que se quitó los tapaba; `format.ts` los habría pintado como «—».
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'NO_STERILIZED',
    color: { id: 2, name: 'Tricolor' },
    bod: '2022-04-18',
    weight: 12.4,
    weightMeasuredAt: '2026-08-01',
    size: null,
    deceased: false,
    deceasedDate: null,
    company: { id: 1, name: 'Veterinaria Kefaro', identifier: '900123456' },
    createdDate: '2026-01-10',
    enabled: true,
    ...overrides,
  }
}

describe('PatientFixedCard', () => {
  it('no renderiza nada si no llega ni summary ni animal', () => {
    // El caso que la cadena original resolvía con el `v-else` ausente. Si algún
    // día se convirtiera en un `<div>` siempre presente, los siete modales
    // pintarían un recuadro vacío sobre el formulario.
    const wrapper = mount(PatientFixedCard, { props: { summary: null, animal: null } })

    expect(wrapper.find('.patient-fixed').exists()).toBe(false)
    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it('no renderiza nada cuando ninguna de las dos props se pasa', () => {
    // Ambas son opcionales: `undefined` debe comportarse igual que `null`.
    const wrapper = mount(PatientFixedCard)

    expect(wrapper.find('.patient-fixed').exists()).toBe(false)
  })

  it('con summary pinta el nombre y, debajo, el código', () => {
    const wrapper = mount(PatientFixedCard, {
      props: { summary: { name: 'Kira', code: 'A-0007' } },
    })

    expect(wrapper.find('.ds-item-label').text()).toBe('Kira')
    expect(wrapper.find('.ds-hint').text()).toBe('A-0007')
  })

  it('con animal pinta el nombre y, debajo, especie · raza · propietario', () => {
    const wrapper = mount(PatientFixedCard, { props: { animal: animalDe() } })

    expect(wrapper.find('.ds-item-label').text()).toBe('Kira')
    expect(wrapper.find('.ds-hint').text().replace(/\s+/g, ' ').trim()).toBe(
      'Canino · Beagle · Ana Restrepo',
    )
  })

  it('omite el propietario —y su separador— cuando el animal no lo trae', () => {
    // El backend devuelve `owner` en el listado, pero no en todas las
    // proyecciones que alimentan la preselección. Sin la guarda quedaba
    // «Canino · Beagle ·» con el punto medio colgando al final.
    const sinDueno = animalDe()
    // @ts-expect-error el tipo lo declara obligatorio; en tiempo de ejecución
    // hay proyecciones que no lo traen, y es justo el caso que la guarda cubre.
    sinDueno.owner = null

    const wrapper = mount(PatientFixedCard, { props: { animal: sinDueno } })
    const meta = wrapper.find('.ds-hint').text().replace(/\s+/g, ' ').trim()

    expect(meta).toBe('Canino · Beagle')
    expect(meta.endsWith('·')).toBe(false)
  })

  it('summary gana sobre animal cuando llegan los dos', () => {
    // La precedencia. Es el caso real de «editar una fila estando el paciente
    // preseleccionado en la vista»: el modal debe mostrar el animal GUARDADO en
    // el registro, no el que la vista tenía filtrado.
    const wrapper = mount(PatientFixedCard, {
      props: {
        summary: { name: 'Maple', code: 'A-0099' },
        animal: animalDe(),
      },
    })

    expect(wrapper.find('.ds-item-label').text()).toBe('Maple')
    expect(wrapper.find('.ds-hint').text()).toBe('A-0099')
    // Y nada de la rama de preselección se cuela por debajo.
    expect(wrapper.text()).not.toContain('Kira')
    expect(wrapper.text()).not.toContain('Beagle')
    expect(wrapper.findAll('.ds-hint')).toHaveLength(1)
  })

  it('un summary sin código sigue mandando sobre el animal', () => {
    // Un `code` vacío es un dato pobre, no una ausencia de summary: si la
    // condición se escribiera sobre `summary?.code` en vez de sobre `summary`,
    // este caso caería a la rama del animal y cambiaría de paciente.
    const wrapper = mount(PatientFixedCard, {
      props: { summary: { name: 'Maple', code: '' }, animal: animalDe() },
    })

    expect(wrapper.find('.ds-item-label').text()).toBe('Maple')
    expect(wrapper.text()).not.toContain('Beagle')
  })
})
