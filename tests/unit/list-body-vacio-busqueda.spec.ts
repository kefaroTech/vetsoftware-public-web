import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ListBody from '@/features/acciones/components/ListBody.vue'

/**
 * VACÍO DE BÚSQUEDA ≠ VACÍO DE VERDAD.
 *
 * Hermano exacto del defecto que cerró EST-01, y en el mismo `v-if`: la rama de
 * cero filas decía «No hay registros aún» hubiera o no término escrito. En las
 * siete pantallas clínicas que montan `ListBody` —vacunas, cirugías,
 * hospitalización, laboratorio, imágenes, desparasitaciones, spa— eso le dice al
 * veterinario que el paciente no tiene vacunas, cuando lo cierto es que ninguna
 * coincide con lo que buscó. No es cosmético: decide si se vuelve a vacunar.
 *
 * `list-body-error.spec.ts` cubre la otra rama del mismo `v-if` (un 500 no es
 * una lista vacía). Este cubre la de la búsqueda, y las dos juntas son lo que
 * impide que la tabla vuelva a contar una sola historia para tres situaciones
 * distintas.
 *
 * Se usa el modo CLIENTE a propósito: no hace falta servidor para ejercitar la
 * rama, y así la prueba no depende de `useServerPaged` ni de su debounce.
 */

interface Vacuna {
  id: number
  nombre: string
}

const VACUNAS: Vacuna[] = [
  { id: 1, nombre: 'Antirrábica' },
  { id: 2, nombre: 'Polivalente' },
  { id: 3, nombre: 'Tos de las perreras' },
]

/** El literal por defecto: el que se colaba donde no tocaba. */
const VACIO_DE_VERDAD = 'No hay registros aún'

/**
 * `ListBody` es genérico, pero al montarlo desde una prueba su `T` colapsa a
 * `unknown`, así que el `searchFn` que recibe se le pasa como `unknown`. Esta
 * versión lo dice —y lo comprueba— en vez de declarar un `Vacuna` que el
 * componente no promete: un filtro que se creyera el tipo y recibiera otra cosa
 * reventaría dentro del componente, no aquí.
 */
function esVacuna(item: unknown): item is Vacuna {
  return typeof item === 'object' && item !== null && 'nombre' in item
}

const buscar = (item: unknown, q: string) => esVacuna(item) && item.nombre.toLowerCase().includes(q)

/** Una fila por vacuna, como la pinta cada pantalla clínica desde su slot. */
const FILA = '<tr><td>{{ params.item.nombre }}</td></tr>'

function montar(items: Vacuna[] = VACUNAS) {
  return mount(ListBody, { props: { items, searchFn: buscar }, slots: { row: FILA } })
}

/** El campo de búsqueda, por su etiqueta invisible y no por su clase. */
async function escribir(wrapper: ReturnType<typeof montar>, termino: string) {
  await wrapper.find('input').setValue(termino)
}

describe('ListBody — una búsqueda sin resultados NO dice «no hay registros»', () => {
  it('cita el término buscado y no el texto de lista vacía', async () => {
    const wrapper = montar()

    await escribir(wrapper, 'leptospirosis')

    expect(wrapper.text()).toContain('Sin resultados para')
    expect(wrapper.text()).toContain('leptospirosis')
    expect(
      wrapper.text(),
      'con un término escrito, «No hay registros aún» le dice al veterinario que el ' +
        'paciente no tiene vacunas cuando lo cierto es que ninguna coincide con lo que buscó',
    ).not.toContain(VACIO_DE_VERDAD)
  })

  it('el término se cita tal cual lo escribió el usuario, sin normalizar', async () => {
    // Ahí se descubren el espacio de más y el pegado con salto de línea: si la
    // pantalla mostrara un término «arreglado», el usuario no vería qué buscó de
    // verdad y seguiría sin entender por qué no sale nada.
    const wrapper = montar()

    await escribir(wrapper, 'AntiRrábica X')

    expect(wrapper.text()).toContain('AntiRrábica X')
  })

  it('ofrece salir del vacío: «Limpiar búsqueda» devuelve la lista completa', async () => {
    // Un vacío sin salida es un callejón: el usuario tiene que poder deshacer su
    // término sin borrarlo a mano carácter a carácter.
    const wrapper = montar()
    await escribir(wrapper, 'leptospirosis')

    const limpiar = wrapper.findAll('button').find((b) => b.text().trim() === 'Limpiar búsqueda')
    if (!limpiar) throw new Error('el vacío de búsqueda debe ofrecer una salida')
    await limpiar.trigger('click')

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).not.toContain('Sin resultados para')
    expect(wrapper.text()).toContain('Antirrábica')
  })

  it('sin término escrito, la lista vacía SÍ dice el texto de vacío', async () => {
    // La otra mitad de la propiedad: corregir el vacío de búsqueda no puede
    // llevarse por delante el vacío de verdad, que es un mensaje legítimo.
    const wrapper = montar([])

    expect(wrapper.text()).toContain(VACIO_DE_VERDAD)
    expect(wrapper.text()).not.toContain('Sin resultados para')
  })

  it('el texto de vacío que pasa el anfitrión también se respeta', async () => {
    // Las siete pantallas clínicas lo personalizan («Este paciente no tiene
    // vacunas registradas»), y esa frase es la que no puede aparecer tras una
    // búsqueda fallida.
    const propio = 'Este paciente no tiene vacunas registradas'
    const wrapper = mount(ListBody, {
      props: { items: VACUNAS, searchFn: buscar, emptyText: propio },
      slots: { row: FILA },
    })

    await wrapper.find('input').setValue('leptospirosis')

    expect(wrapper.text()).toContain('Sin resultados para')
    expect(wrapper.text()).not.toContain(propio)
  })

  it('un término que sí casa devuelve filas y ningún estado vacío', async () => {
    // Control negativo: sin él, un componente que pintara «Sin resultados» pase
    // lo que pase aprobaría todos los casos de arriba.
    const wrapper = montar()

    await escribir(wrapper, 'poli')

    expect(wrapper.text()).toContain('Polivalente')
    expect(wrapper.text()).not.toContain('Sin resultados para')
    expect(wrapper.text()).not.toContain(VACIO_DE_VERDAD)
  })
})
