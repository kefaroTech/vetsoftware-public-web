import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import type { OrderVM } from '@/features/hospitalizacion/types/hospital'
import type { CascadeOutcome } from '@/features/hospitalizacion/composables/useHospitalizacion'

/**
 * El 409 de concurrencia en la sala de hospitalización.
 *
 * Desde que el backend versiona también los UPDATE en bloque de
 * `medication_schedules` y `procedure_schedules`, cualquier operación de esta
 * pantalla puede volver con `CONCURRENT_MODIFICATION` porque otra persona —o la
 * otra pestaña del mismo usuario— tocó la fila mientras esta la tenía abierta.
 * Tratarlo como error fatal dejaba al usuario con el estado viejo en pantalla:
 * al reintentar mandaba otra vez la misma versión caducada y el 409 se repetía
 * en bucle, sin salida salvo recargar a mano.
 *
 * Lo que fijan estas pruebas es exactamente eso, que es invisible al compilador
 * y al linter:
 *
 *   1. El conflicto RECARGA y avisa con `warn`; NO cae en `errorFrom`.
 *   2. Lo que no es conflicto sigue cayendo en `errorFrom` —el único camino que
 *      rescata el `X-Trace-Id`— y NO recarga ni avisa.
 *   3. El alta usa una recarga distinta: el paciente no salió del tablero, así
 *      que hay que refrescar el TABLERO y reabrir el detalle con la fila fresca,
 *      porque el payload del alta se arma desde `patient` y es justo esa copia
 *      la que quedó desfasada.
 *   4. El aviso sale DESPUÉS de que la recarga haya terminado. El `await` antes
 *      del `toast.warn` es deliberado: avisar «se recargó la información» con la
 *      recarga aún en vuelo es mentir al usuario, y `void reload()` compila
 *      igual de bien.
 *
 * Los eventos se disparan desde los STUBS de los hijos —`HospBoard`,
 * `HospDetail`, `TreatmentScreen`— y no invocando funciones sobre `wrapper.vm`.
 * Es el camino que menos acopla: recorre el cableado real de la plantilla (qué
 * evento va a qué manejador, y que `@discharge` sea el único que pasa la recarga
 * especial), de modo que un recableado mal hecho también se cae aquí. Un test
 * que llamara a `onApply` directamente pasaría en verde con el `@apply`
 * desconectado.
 */

// ── Dobles: una sola instancia por test ────────────────────────────────────────
// `useHospitalizacion` NO es un store de Pinia, es un composable con refs
// locales: cada llamada crea estado nuevo. Si el doble fabricara un objeto por
// invocación, la vista escribiría en unos refs y el test leería otros.
const hoisted = vi.hoisted(() => ({
  hosp: null as unknown as ReturnType<typeof createHosp>,
  toast: null as unknown as ReturnType<typeof createToast>,
}))

vi.mock('@/features/hospitalizacion/composables/useHospitalizacion', () => ({
  useHospitalizacion: () => hoisted.hosp,
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => hoisted.toast,
}))

// El import va DESPUÉS de los `vi.mock` por legibilidad; vitest los iza igual.
import HospitalizacionView from '@/features/hospitalizacion/views/HospitalizacionView.vue'

function createHosp() {
  const board = ref<HospitalizationResponse[]>([])
  const patient = ref<HospitalizationResponse | null>(null)
  const hosp = {
    board,
    boardLoading: ref(false),
    boardError: ref<string | null>(null),
    loadBoard: vi.fn(async () => {}),
    patient,
    meds: ref([]),
    procs: ref([]),
    observations: ref([]),
    notes: ref([]),
    /** Igual que el real: fija `patient` con la fila que le pasan. */
    loadDetail: vi.fn(async (h: HospitalizationResponse) => {
      patient.value = h
    }),
    closeDetail: vi.fn(() => {
      patient.value = null
    }),
    addMedication: vi.fn(async () => {}),
    updateMedication: vi.fn(async () => {}),
    suspendMedication: vi.fn(async () => {}),
    addProcedure: vi.fn(async () => {}),
    updateProcedure: vi.fn(async () => {}),
    suspendProcedure: vi.fn(async () => {}),
    addObservation: vi.fn(async () => {}),
    addProgressNote: vi.fn(async () => {}),
    discharge: vi.fn(async () => {}),
    applyDose: vi.fn(async () => {}),
    /**
     * El doble declaraba `async () => {}`, es decir, «no devuelve nada». El real
     * devuelve `CascadeOutcome`, que es JUSTO lo que los tres casos de #134 leen para
     * distinguir «se aplicó», «no se aplicó» y «no lo sé». Con el doble mintiendo
     * sobre su propio retorno, un cambio de forma en `CascadeOutcome` no habría roto
     * nada aquí. `null` por defecto = el caso del endpoint que no informa.
     */
    moveDose: vi.fn(async (): Promise<CascadeOutcome> => null),
  }
  return hosp
}

function createToast() {
  return {
    toasts: [],
    dismiss: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom: vi.fn(),
  }
}

// ── Errores con la forma que el cliente HTTP reconoce ─────────────────────────
// `isConcurrencyConflict` NO se dobla: es la función real de `http.client`, y
// mira `response.data.code`, no el status. Por eso el error se fabrica con la
// misma forma que usa `http-client.spec.ts`, no con un `Error` cualquiera.
function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    config,
    null,
    response,
  )
}

/** El 409 de bloqueo optimista. */
const conflict = () => httpError(409, { code: 'CONCURRENT_MODIFICATION' })

/** Cualquier otro fallo: el camino que debe seguir siendo `errorFrom`. */
const boom = () => httpError(500, { detail: 'Fallo interno' })

// ── Stubs de los hijos ────────────────────────────────────────────────────────
// Sin `template:` a propósito: `vue` resuelve al runtime sin compilador, así que
// una plantilla en cadena reventaría en tiempo de montaje.
function stub(name: string, emits: string[]) {
  return defineComponent({
    name,
    inheritAttrs: false,
    emits,
    setup: () => () => h('div', { 'data-stub': name }),
  })
}

const BoardStub = stub('HospBoardStub', ['open'])
const DetailStub = stub('HospDetailStub', [
  'back',
  'administer',
  'discharge',
  'add-observation',
  'add-note',
])
const TreatmentStub = stub('TreatmentScreenStub', [
  'back',
  'add',
  'edit',
  'suspend',
  'apply',
  'move',
])

// ── Datos ─────────────────────────────────────────────────────────────────────
function hospitalizacion(
  overrides: Partial<HospitalizationResponse> = {},
): HospitalizationResponse {
  return {
    id: 42,
    date: '2026-08-19',
    startDate: '2026-08-18',
    endDate: null,
    type: 'HOSPITALIZATION',
    reasonLeaving: null,
    reason: 'Gastroenteritis',
    observations: 'Estable',
    enabled: true,
    animal: { id: 7, name: 'Kira' },
    consultation: null,
    company: { id: 1, name: 'Veterinaria Kefaro' },
    ...overrides,
  } as unknown as HospitalizationResponse
}

const orden = { id: 10, kind: 'med', name: 'Amoxicilina', schedule: [] } as unknown as OrderVM

// ── Navegación hasta cada pantalla, por el cableado real ──────────────────────
function montar() {
  return mount(HospitalizacionView, {
    global: {
      stubs: {
        HospBoard: BoardStub,
        HospDetail: DetailStub,
        TreatmentScreen: TreatmentStub,
        PageHeader: true,
      },
    },
  })
}

type Wrapper = ReturnType<typeof montar>

/** Tablero → detalle: `@open` sobre `HospBoard`. */
async function abrirDetalle(wrapper: Wrapper, p = hospitalizacion()) {
  wrapper.findComponent(BoardStub).vm.$emit('open', p)
  await flushPromises()
  hoisted.hosp.loadDetail.mockClear() // la apertura no cuenta como recarga
  return p
}

/** Detalle → hoja de medicación: `@administer` sobre `HospDetail`. */
async function abrirTratamiento(wrapper: Wrapper) {
  const p = await abrirDetalle(wrapper)
  wrapper.findComponent(DetailStub).vm.$emit('administer')
  await flushPromises()
  return p
}

beforeEach(() => {
  hoisted.hosp = createHosp()
  hoisted.toast = createToast()
})

describe('HospitalizacionView — 409 de concurrencia', () => {
  describe('onApply (marcar toma aplicada)', () => {
    it('ante un conflicto recarga el detalle y avisa con warn, sin error', async () => {
      // El caso central: dos auxiliares con la misma hoja abierta y la misma
      // toma delante. El segundo en pulsar recibe el 409 y necesita ver el
      // estado nuevo, no un «no se pudo registrar» sobre datos caducados.
      hoisted.hosp.applyDose.mockRejectedValueOnce(conflict())

      const wrapper = montar()
      const p = await abrirTratamiento(wrapper)

      wrapper.findComponent(TreatmentStub).vm.$emit('apply', orden, '77')
      await flushPromises()

      expect(hoisted.hosp.loadDetail).toHaveBeenCalledTimes(1)
      expect(hoisted.hosp.loadDetail).toHaveBeenCalledWith(p)
      expect(hoisted.toast.warn).toHaveBeenCalledWith(
        'Conflicto de concurrencia',
        'El registro fue modificado por otra operación; se recargó la información. Revisa y reintenta.',
      )
      // Lo que separa «recarga y reintenta» de «algo se rompió».
      expect(hoisted.toast.errorFrom).not.toHaveBeenCalled()
      expect(hoisted.toast.success).not.toHaveBeenCalled()
    })

    it('ante un error que no es de concurrencia mantiene errorFrom y no recarga', async () => {
      // El contrapeso: la rama nueva no puede tragarse el resto de fallos.
      // `errorFrom` es el único camino que rescata el `X-Trace-Id`.
      const e = boom()
      hoisted.hosp.applyDose.mockRejectedValueOnce(e)

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      wrapper.findComponent(TreatmentStub).vm.$emit('apply', orden, '77')
      await flushPromises()

      expect(hoisted.toast.errorFrom).toHaveBeenCalledWith(
        'No se pudo registrar',
        e,
        'Intenta de nuevo.',
      )
      expect(hoisted.toast.warn).not.toHaveBeenCalled()
      expect(hoisted.hosp.loadDetail).not.toHaveBeenCalled()
    })

    it('un 409 que no es de versión tampoco se trata como conflicto', async () => {
      // `isConcurrencyConflict` mira el código del cuerpo, NO el status: un 409
      // de otra causa debe seguir siendo un error normal.
      hoisted.hosp.applyDose.mockRejectedValueOnce(httpError(409, { code: 'DUPLICATED_CODE' }))

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      wrapper.findComponent(TreatmentStub).vm.$emit('apply', orden, '77')
      await flushPromises()

      expect(hoisted.toast.warn).not.toHaveBeenCalled()
      expect(hoisted.toast.errorFrom).toHaveBeenCalled()
      expect(hoisted.hosp.loadDetail).not.toHaveBeenCalled()
    })
  })

  describe('onMove (reprogramar toma)', () => {
    it('ante un conflicto recarga el detalle y avisa con warn', async () => {
      // La otra operación de la hoja de medicación que escribe en bloque sobre
      // `medication_schedules`, y por tanto la otra que puede volver con 409.
      hoisted.hosp.moveDose.mockRejectedValueOnce(conflict())

      const wrapper = montar()
      const p = await abrirTratamiento(wrapper)

      const treatment = wrapper.findComponent(TreatmentStub)
      treatment.vm.$emit('move', orden, '77', '2026-08-20', '14:00', 'cascade')
      await flushPromises()

      expect(hoisted.hosp.loadDetail).toHaveBeenCalledWith(p)
      expect(hoisted.toast.warn).toHaveBeenCalledWith(
        'Conflicto de concurrencia',
        expect.stringContaining('se recargó la información'),
      )
      expect(hoisted.toast.errorFrom).not.toHaveBeenCalled()
    })

    it('un error normal al reprogramar conserva su propio título', async () => {
      hoisted.hosp.moveDose.mockRejectedValueOnce(boom())

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      const treatment = wrapper.findComponent(TreatmentStub)
      treatment.vm.$emit('move', orden, '77', '2026-08-20', '14:00', 'one')
      await flushPromises()

      expect(hoisted.toast.errorFrom).toHaveBeenCalledWith(
        'No se pudo reprogramar',
        expect.anything(),
        'Intenta de nuevo.',
      )
      expect(hoisted.hosp.loadDetail).not.toHaveBeenCalled()
    })

    // #134: pedir la cascada no es aplicarla. Mientras el endpoint devolvió un array pelado la
    // pantalla no tenía con qué distinguirlo y afirmaba el recálculo siempre. El contrato trae
    // ahora `cascadeApplied` y `cascadeSkippedReason` (esquema
    // `RescheduleMedicationScheduleResponse`) justo para que estos tres casos se cuenten distinto.
    it('si la cascada se pidió y el servidor la aplicó, lo afirma', async () => {
      hoisted.hosp.moveDose.mockResolvedValueOnce({ applied: true })

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      const treatment = wrapper.findComponent(TreatmentStub)
      treatment.vm.$emit('move', orden, '77', '2026-08-20', '14:00', 'cascade')
      await flushPromises()

      expect(hoisted.toast.success).toHaveBeenCalledWith(
        'Toma reprogramada',
        'Se recalcularon las tomas siguientes.',
      )
      expect(hoisted.toast.warn).not.toHaveBeenCalled()
    })

    it('si la cascada se pidió y NO se aplicó, lo dice en vez de dar el movimiento por bueno', async () => {
      hoisted.hosp.moveDose.mockResolvedValueOnce({
        applied: false,
        skippedReason: 'GUIDELINE_NOT_INTERVAL',
      })

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      const treatment = wrapper.findComponent(TreatmentStub)
      treatment.vm.$emit('move', orden, '77', '2026-08-20', '14:00', 'cascade')
      await flushPromises()

      // Lo que se afirma no es el texto exacto, sino que NO se anuncia un recálculo que no ocurrió.
      expect(hoisted.toast.success).not.toHaveBeenCalled()
      expect(hoisted.toast.warn).toHaveBeenCalledWith(
        'Se movió solo esta toma',
        expect.stringContaining('pauta por intervalo'),
      )
    })

    // El endpoint de procedimientos sigue devolviendo el array pelado y no informa del desenlace,
    // así que su `null` se lee como «no lo sé», no como «no se aplicó»: tratarlo igual que
    // `{ applied: false }` pondría un aviso de cascada fallida en cada arrastre de procedimiento.
    it('un endpoint que no informa del desenlace conserva el mensaje de siempre', async () => {
      hoisted.hosp.moveDose.mockResolvedValueOnce(null)

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      const treatment = wrapper.findComponent(TreatmentStub)
      treatment.vm.$emit('move', orden, '77', '2026-08-20', '14:00', 'cascade')
      await flushPromises()

      expect(hoisted.toast.warn).not.toHaveBeenCalled()
      expect(hoisted.toast.success).toHaveBeenCalledWith(
        'Toma reprogramada',
        'Se recalcularon las tomas siguientes.',
      )
    })
  })

  describe('onDischarge (alta) — recarga especial', () => {
    it('recarga el TABLERO y reabre el detalle con la fila fresca, no con la caducada', async () => {
      // Recargar solo el detalle no serviría: el payload del alta se arma a
      // partir de `patient` y es esa copia la que quedó desfasada. `loadDetail`
      // la reutiliza tal cual, así que el reintento volvería a chocar.
      const vieja = hospitalizacion({ observations: 'Estable' })
      const fresca = hospitalizacion({ observations: 'Empeoró de madrugada' })
      hoisted.hosp.discharge.mockRejectedValueOnce(conflict())
      hoisted.hosp.loadBoard.mockImplementation(async () => {
        hoisted.hosp.board.value = [fresca]
      })

      const wrapper = montar()
      await abrirDetalle(wrapper, vieja)
      hoisted.hosp.loadBoard.mockClear() // el `onMounted` no cuenta

      wrapper.findComponent(DetailStub).vm.$emit('discharge', 'RECOVERED')
      await flushPromises()

      expect(hoisted.hosp.loadBoard).toHaveBeenCalledTimes(1)
      expect(hoisted.hosp.loadDetail).toHaveBeenCalledTimes(1)
      // La identidad importa: tiene que ser la fila que acaba de traer el
      // tablero, no la que la vista ya tenía en la mano. Se compara contra
      // `board.value[0]` y no contra `fresca` porque `board` es un `ref`, y un
      // `ref` envuelve los objetos del array en su proxy reactivo: lo que sale
      // del `find` es el proxy, no la referencia cruda del fixture.
      const [recargada] = hoisted.hosp.loadDetail.mock.calls[0] ?? []
      expect(recargada).toBe(hoisted.hosp.board.value[0])
      // Y trae el contenido nuevo, que es lo que hace útil la recarga: si
      // reabriera con la copia caducada, el reintento del alta volvería a chocar.
      expect(recargada?.observations).toBe('Empeoró de madrugada')
      expect(vieja.observations).toBe('Estable')
      // Sigue en el detalle: no se le arrancó la pantalla de debajo.
      expect(hoisted.hosp.closeDetail).not.toHaveBeenCalled()
      expect(wrapper.findComponent(DetailStub).exists()).toBe(true)
      expect(hoisted.toast.warn).toHaveBeenCalledWith(
        'Conflicto de concurrencia',
        expect.stringContaining('se recargó la información'),
      )
      expect(hoisted.toast.errorFrom).not.toHaveBeenCalled()
      // No se dio de alta: el «salió del tablero» sería falso.
      expect(hoisted.toast.success).not.toHaveBeenCalled()
    })

    it('si la fila ya no está en el tablero vuelve al listado en vez de reabrir el detalle', async () => {
      // Otro la dio de alta mientras tanto: el detalle ya no tiene sentido.
      hoisted.hosp.discharge.mockRejectedValueOnce(conflict())
      hoisted.hosp.loadBoard.mockImplementation(async () => {
        hoisted.hosp.board.value = [hospitalizacion({ id: 99 })]
      })

      const wrapper = montar()
      await abrirDetalle(wrapper)

      wrapper.findComponent(DetailStub).vm.$emit('discharge', 'RECOVERED')
      await flushPromises()

      expect(hoisted.hosp.loadDetail).not.toHaveBeenCalled()
      expect(hoisted.hosp.closeDetail).toHaveBeenCalledTimes(1)
      expect(wrapper.findComponent(BoardStub).exists()).toBe(true)
      expect(wrapper.findComponent(DetailStub).exists()).toBe(false)
      expect(hoisted.toast.warn).toHaveBeenCalledWith(
        'Conflicto de concurrencia',
        expect.stringContaining('se recargó la información'),
      )
    })

    it('un error normal al dar de alta no dispara la recarga del tablero', async () => {
      hoisted.hosp.discharge.mockRejectedValueOnce(boom())

      const wrapper = montar()
      await abrirDetalle(wrapper)
      hoisted.hosp.loadBoard.mockClear()

      wrapper.findComponent(DetailStub).vm.$emit('discharge', 'RECOVERED')
      await flushPromises()

      expect(hoisted.toast.errorFrom).toHaveBeenCalledWith(
        'No se pudo dar de alta',
        expect.anything(),
        'Intenta de nuevo.',
      )
      expect(hoisted.hosp.loadBoard).not.toHaveBeenCalled()
      expect(hoisted.hosp.loadDetail).not.toHaveBeenCalled()
    })
  })

  describe('orden entre recarga y aviso', () => {
    it('el aviso sale DESPUÉS de que la recarga haya terminado', async () => {
      // El `await reload()` antes del `toast.warn` es deliberado. Convertirlo en
      // `void reload()` compila, pasa el linter, y deja al usuario leyendo «se
      // recargó la información» mientras la pantalla todavía muestra lo viejo.
      const seq: string[] = []
      hoisted.hosp.applyDose.mockRejectedValueOnce(conflict())

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      hoisted.hosp.loadDetail.mockImplementation(async (h: HospitalizationResponse) => {
        hoisted.hosp.patient.value = h
        // Varios microtasks: la recarga real encadena seis peticiones.
        await Promise.resolve()
        await Promise.resolve()
        seq.push('recarga terminada')
      })
      hoisted.toast.warn.mockImplementation(() => {
        seq.push('aviso mostrado')
      })

      wrapper.findComponent(TreatmentStub).vm.$emit('apply', orden, '77')
      await flushPromises()

      expect(seq).toEqual(['recarga terminada', 'aviso mostrado'])
    })

    it('en el alta el aviso también espera a que el tablero y el detalle estén frescos', async () => {
      const seq: string[] = []
      const fresca = hospitalizacion()
      hoisted.hosp.discharge.mockRejectedValueOnce(conflict())

      const wrapper = montar()
      await abrirDetalle(wrapper)

      hoisted.hosp.loadBoard.mockImplementation(async () => {
        await Promise.resolve()
        hoisted.hosp.board.value = [fresca]
        seq.push('tablero recargado')
      })
      hoisted.hosp.loadDetail.mockImplementation(async () => {
        await Promise.resolve()
        seq.push('detalle recargado')
      })
      hoisted.toast.warn.mockImplementation(() => {
        seq.push('aviso mostrado')
      })

      wrapper.findComponent(DetailStub).vm.$emit('discharge', 'RECOVERED')
      await flushPromises()

      expect(seq).toEqual(['tablero recargado', 'detalle recargado', 'aviso mostrado'])
    })
  })

  describe('conflicto con el detalle ya cerrado', () => {
    it('no explota ni recarga cuando patient es null; el aviso basta', async () => {
      // `patient` puede haberse vaciado entre la petición y su rechazo. Sin la
      // guarda, `loadDetail(null)` reventaría dentro del propio `catch` y el
      // usuario se quedaría sin aviso y con un error no capturado en consola.
      hoisted.hosp.applyDose.mockImplementationOnce(async () => {
        hoisted.hosp.patient.value = null
        throw conflict()
      })

      const wrapper = montar()
      await abrirTratamiento(wrapper)

      wrapper.findComponent(TreatmentStub).vm.$emit('apply', orden, '77')
      await flushPromises()

      expect(hoisted.hosp.loadDetail).not.toHaveBeenCalled()
      expect(hoisted.toast.warn).toHaveBeenCalledWith(
        'Conflicto de concurrencia',
        expect.stringContaining('se recargó la información'),
      )
      expect(hoisted.toast.errorFrom).not.toHaveBeenCalled()
    })
  })

  describe('el resto de manejadores comparte el mismo camino', () => {
    it('añadir, editar y suspender también recargan y avisan ante un 409', async () => {
      const wrapper = montar()
      await abrirTratamiento(wrapper)
      const treatment = wrapper.findComponent(TreatmentStub)
      const payload = { name: 'Amoxicilina' }

      hoisted.hosp.addMedication.mockRejectedValueOnce(conflict())
      treatment.vm.$emit('add', 'med', payload)
      await flushPromises()

      hoisted.hosp.updateMedication.mockRejectedValueOnce(conflict())
      treatment.vm.$emit('edit', 'med', 10, payload)
      await flushPromises()

      hoisted.hosp.suspendMedication.mockRejectedValueOnce(conflict())
      treatment.vm.$emit('suspend', 'med', 10)
      await flushPromises()

      expect(hoisted.hosp.loadDetail).toHaveBeenCalledTimes(3)
      expect(hoisted.toast.warn).toHaveBeenCalledTimes(3)
      expect(hoisted.toast.errorFrom).not.toHaveBeenCalled()
      expect(hoisted.toast.success).not.toHaveBeenCalled()
      expect(hoisted.toast.info).not.toHaveBeenCalled()
    })

    it('observaciones y notas evolutivas, igual', async () => {
      const wrapper = montar()
      await abrirDetalle(wrapper)
      const detail = wrapper.findComponent(DetailStub)

      hoisted.hosp.addObservation.mockRejectedValueOnce(conflict())
      detail.vm.$emit('add-observation', 'Vomitó a las 03:00')
      await flushPromises()

      hoisted.hosp.addProgressNote.mockRejectedValueOnce(conflict())
      detail.vm.$emit('add-note', 'Mejora la hidratación')
      await flushPromises()

      expect(hoisted.hosp.loadDetail).toHaveBeenCalledTimes(2)
      expect(hoisted.toast.warn).toHaveBeenCalledTimes(2)
      expect(hoisted.toast.errorFrom).not.toHaveBeenCalled()
    })

    it('ninguno de ellos usa la recarga del alta: esa es exclusiva de onDischarge', async () => {
      // Si `reloadAfterDischarge` se colara como recarga por defecto, cualquier
      // conflicto de la hoja de medicación devolvería al usuario al tablero.
      hoisted.hosp.applyDose.mockRejectedValueOnce(conflict())

      const wrapper = montar()
      await abrirTratamiento(wrapper)
      hoisted.hosp.loadBoard.mockClear()

      wrapper.findComponent(TreatmentStub).vm.$emit('apply', orden, '77')
      await flushPromises()

      expect(hoisted.hosp.loadBoard).not.toHaveBeenCalled()
      expect(hoisted.hosp.closeDetail).not.toHaveBeenCalled()
    })
  })
})
