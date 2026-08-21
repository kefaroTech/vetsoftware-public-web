import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LabResultsModal from '@/features/laboratorio/modals/LabResultsModal.vue'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import { adjuntarArchivos, fakeFile } from '../helpers/pick-files'

/**
 * GUARDA DE VUE-08 — la lista de adjuntos se identifica por clave estable, no por índice.
 *
 * `removeAt` hace `splice`, así que la lista se muta POR EL MEDIO. Con el índice
 * como `:key`, Vue reutiliza el nodo de la posición: al quitar el segundo de tres
 * adjuntos, el nodo del segundo se queda en pie con el contenido del tercero y lo
 * que desaparece de la pantalla es el ÚLTIMO. El usuario cree haber borrado el
 * archivo equivocado y acaba enviando a validación el que no era — sobre un
 * resultado de laboratorio, eso es un informe clínico mal atribuido.
 *
 * Por eso la prueba compara NOMBRES RENDERIZADOS y no `files.length`: la longitud
 * baja de 3 a 2 igual con el defecto puesto, así que un `toHaveLength(2)` deja
 * pasar exactamente el bug que esto vigila.
 *
 * El identificador no puede salir del propio `File` —dos adjuntos pueden llamarse
 * igual y pesar lo mismo, y siguen siendo dos adjuntos—, de ahí el envoltorio
 * `PickedFile { uid, file }` (LabResultsModal.vue:26).
 */

const TEST: LaboratoryTestResponse = {
  id: 77,
  date: '2026-08-20',
  testType: { id: 3, name: 'Hemograma completo' },
  quantity: 1,
  diagnosis: 'Control',
  status: 'PENDING',
  prioridad: 'NORMAL',
  animal: { id: 9, name: 'Nube' },
  consultation: null,
  company: { id: 1, name: 'Clínica de prueba' },
  processedBy: null,
  processedDate: null,
  createdDate: '2026-08-20T09:00:00',
} as unknown as LaboratoryTestResponse

const PRIMERO = 'hemograma-1-primero.pdf'
const SEGUNDO = 'hemograma-2-segundo.pdf'
const TERCERO = 'hemograma-3-tercero.pdf'

/**
 * `teleport: true` porque `ModalShell` teletransporta a `body`: sin stub, el
 * contenido del modal sale del árbol del wrapper y ninguna aserción lo alcanza.
 */
function montar() {
  return mount(LabResultsModal, {
    props: { open: true, test: TEST },
    global: { stubs: { teleport: true } },
  })
}

/** Los nombres de archivo tal y como el usuario los ve, en orden de pantalla. */
function nombresEnPantalla(wrapper: ReturnType<typeof montar>): string[] {
  return wrapper.findAll('li.file').map((li) => {
    const texto = li.text()
    return [PRIMERO, SEGUNDO, TERCERO].find((n) => texto.includes(n)) ?? texto
  })
}

describe('LabResultsModal — adjuntos con clave estable (VUE-08)', () => {
  it('borrar el segundo de tres deja el primero y el TERCERO, no el primero y el segundo', async () => {
    const wrapper = montar()
    await flushPromises()

    await adjuntarArchivos(wrapper.find('input[type="file"]'), [
      fakeFile(PRIMERO),
      fakeFile(SEGUNDO),
      fakeFile(TERCERO),
    ])
    await flushPromises()

    expect(nombresEnPantalla(wrapper)).toEqual([PRIMERO, SEGUNDO, TERCERO])

    // Se borra por el nombre accesible del botón de esa fila: es el gesto real.
    const quitarSegundo = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === `Quitar el adjunto ${SEGUNDO}`)
    expect(quitarSegundo, `no hay botón para quitar ${SEGUNDO}`).toBeDefined()
    await quitarSegundo!.trigger('click')
    await flushPromises()

    expect(
      nombresEnPantalla(wrapper),
      'con el índice como :key el nodo del segundo sobrevive con el contenido del tercero ' +
        'y lo que desaparece es el tercero: el usuario borra el archivo que no era',
    ).toEqual([PRIMERO, TERCERO])
  })

  it('el contador del pie acompaña a lo que se ve, no lo sustituye', async () => {
    const wrapper = montar()
    await flushPromises()

    await adjuntarArchivos(wrapper.find('input[type="file"]'), [
      fakeFile(PRIMERO),
      fakeFile(SEGUNDO),
      fakeFile(TERCERO),
    ])
    await flushPromises()
    expect(wrapper.text()).toContain('3 archivo(s) adjunto(s)')

    await wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === `Quitar el adjunto ${SEGUNDO}`)!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('2 archivo(s) adjunto(s)')
    expect(nombresEnPantalla(wrapper)).toEqual([PRIMERO, TERCERO])
  })

  it('dos adjuntos con el MISMO nombre siguen siendo dos filas distintas', async () => {
    // El caso que impide derivar la clave del contenido del `File`: mismo nombre,
    // mismo tamaño, mismo tipo. Con una clave derivada colisionarían y Vue pintaría
    // una sola fila.
    const wrapper = montar()
    await flushPromises()

    await adjuntarArchivos(wrapper.find('input[type="file"]'), [
      fakeFile(PRIMERO),
      fakeFile(PRIMERO),
    ])
    await flushPromises()

    expect(wrapper.findAll('li.file')).toHaveLength(2)
  })

  it('reabrir el modal vacía la lista: no arrastra los adjuntos del examen anterior', async () => {
    const wrapper = montar()
    await flushPromises()

    await adjuntarArchivos(wrapper.find('input[type="file"]'), [fakeFile(PRIMERO)])
    await flushPromises()
    expect(wrapper.findAll('li.file')).toHaveLength(1)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(wrapper.findAll('li.file')).toHaveLength(0)
  })
})
