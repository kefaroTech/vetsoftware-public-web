import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ConsultaGuardada from '@/features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue'

/**
 * EL NÚMERO DE COMPROBANTE ES EL DE LA CONSULTA CREADA, NO UNO SORTEADO.
 *
 * <p>La pantalla de éxito pintaba `#C-{año}-{Math.floor(Math.random() * 9000) +
 * 1000}`. Con eso, quien apunta el número en la ficha de papel —o se lo dicta al
 * propietario por teléfono— se lleva una cadena que no existe en ninguna base de
 * datos, y que además cambia sola en cada repintado. Es la única pantalla del
 * flujo que promete un identificador con el que volver.
 *
 * <p>El aserto que caza exactamente ese defecto es el de la ESTABILIDAD: un
 * número aleatorio pasa igual de bien la comprobación de «aparece un número»
 * —siempre aparece uno—, y solo se delata al volver a pintar la misma pantalla
 * con el mismo estado y obtener otro.
 */

const replace = vi.fn()
const push = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'consulta-nueva-exito', fullPath: '/dashboard/consulta/nueva/exito' }),
  useRouter: () => ({ push, replace }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/features/dashboard/views/consulta/nueva/composables/usePrescriptionExport', () => ({
  usePrescriptionExport: () => ({ exporting: { value: false }, exportPdf: vi.fn() }),
}))

/** Lo que `POST /consultations` devolvió: el id es la respuesta del servidor. */
const ID_DEL_SERVIDOR = 4821

function estadoDelGuardado(over: Record<string, unknown> = {}) {
  return {
    consultationId: ID_DEL_SERVIDOR,
    ownerId: 31,
    petId: 77,
    ownerName: 'Propietario E2E de prueba',
    petName: 'Mascota E2E de prueba',
    consultationType: 'Consulta general',
    date: '2026-09-04',
    prescriptions: [],
    ...over,
  }
}

function llegarGuardando(estado: Record<string, unknown> | null): void {
  // La pantalla lee `history.state`, que es como el guardado le pasa el id sin
  // publicarlo en la URL. Se reproduce esa llegada en vez de simular el módulo.
  history.replaceState(estado, '')
}

async function montar(): Promise<VueWrapper> {
  const wrapper = mount(ConsultaGuardada) as VueWrapper
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  replace.mockClear()
  push.mockClear()
  llegarGuardando(estadoDelGuardado())
})

describe('ConsultaGuardada — el comprobante es el id que devolvió el servidor', () => {
  it('pinta el id de la consulta creada, con ese número y no otro', async () => {
    const texto = (await montar()).text()

    expect(texto).toContain(`Consulta #${ID_DEL_SERVIDOR}`)
  })

  it('volver a pintar la pantalla con el mismo guardado da el MISMO número', async () => {
    const primera = (await montar()).text()
    const segunda = (await montar()).text()

    const numero = /Consulta #(\d+)/
    const uno = primera.match(numero)?.[1]
    const dos = segunda.match(numero)?.[1]

    expect(uno, 'sin número que comparar, el resto de la prueba no mide nada').toBeTruthy()
    expect(dos, 'el comprobante cambiaba en cada repintado porque salía de Math.random()').toBe(uno)
    expect(uno).toBe(String(ID_DEL_SERVIDOR))
  })

  it('un id distinto del servidor produce un comprobante distinto', async () => {
    llegarGuardando(estadoDelGuardado({ consultationId: 9002 }))

    // La contrapartida del caso anterior: un literal clavado también sería
    // estable, y también sería mentira.
    expect((await montar()).text()).toContain('Consulta #9002')
  })

  it('llegar por URL directa, sin guardado detrás, no confirma nada: devuelve a la historia', async () => {
    llegarGuardando({})

    const wrapper = await montar()

    expect(replace).toHaveBeenCalledWith({ name: 'consulta-historial' })
    // Y mientras redirige no enseña un comprobante inventado ni un «—».
    expect(wrapper.text()).not.toContain('Consulta #')
  })
})
