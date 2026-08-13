import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCancellableLatest, useLatestOnly } from '@/composables/useLatestOnly'

/**
 * FE-13. Al navegar rápido entre pacientes quedan dos cargas en vuelo y el
 * orden de llegada no está garantizado. Si la respuesta de la mascota anterior
 * llega la última, escribe encima de la que el usuario está viendo: la pantalla
 * acaba mostrando la historia clínica de OTRO paciente, sin ningún error que lo
 * delate.
 *
 * Estas pruebas fuerzan justamente ese orden invertido, que es el que nunca
 * ocurre en un happy path y por eso no salta en pruebas normales.
 */

describe('useLatestOnly', () => {
  it('la primera carga deja de ser vigente cuando arranca una segunda', () => {
    const { begin } = useLatestOnly()

    const primera = begin()
    expect(primera()).toBe(true)

    const segunda = begin()
    expect(primera()).toBe(false)
    expect(segunda()).toBe(true)
  })

  it('solo la última sobrevive por muchas que se encadenen', () => {
    const { begin } = useLatestOnly()

    const a = begin()
    const b = begin()
    const c = begin()

    expect([a(), b(), c()]).toEqual([false, false, true])
  })

  it('cada instancia es una secuencia independiente', () => {
    // `useGeoCascade` usa una para departamentos y otra para municipios: cambiar
    // de departamento no debe invalidar la carga de municipios en curso.
    const departamentos = useLatestOnly()
    const municipios = useLatestOnly()

    const dep = departamentos.begin()
    const mun = municipios.begin()
    departamentos.begin()

    expect(dep()).toBe(false)
    expect(mun()).toBe(true)
  })
})

describe('useCancellableLatest', () => {
  it('abrir un turno nuevo aborta la señal del anterior', () => {
    const { begin } = useCancellableLatest()

    const primero = begin()
    expect(primero.signal.aborted).toBe(false)

    const segundo = begin()
    expect(primero.signal.aborted).toBe(true)
    expect(primero.isCurrent()).toBe(false)
    expect(segundo.signal.aborted).toBe(false)
    expect(segundo.isCurrent()).toBe(true)
  })

  it('cancel() corta lo que haya en vuelo sin abrir turno nuevo', () => {
    // Es lo que hace falta al desmontar o al cerrar sesión: no viene otra carga
    // detrás, simplemente ya no interesa la que está en curso.
    const { begin, cancel } = useCancellableLatest()

    const turno = begin()
    cancel()

    expect(turno.signal.aborted).toBe(true)
    expect(turno.isCurrent()).toBe(false)
  })

  it('un turno abortado deja de ser vigente aunque siga siendo el último', () => {
    // `isCurrent` mira el turno Y el aborto: si solo mirara el turno, una carga
    // cancelada por `cancel()` seguiría escribiendo al resolverse.
    const { begin, cancel } = useCancellableLatest()
    const turno = begin()

    expect(turno.isCurrent()).toBe(true)
    cancel()
    expect(turno.isCurrent()).toBe(false)
  })
})

describe('carrera real: dos cargas que responden en orden invertido', () => {
  /** Cargador controlable: cada id se resuelve cuando la prueba lo decide. */
  function cargadorManual() {
    const resolvers = new Map<string, (v: string[]) => void>()
    const load = (id: string) => new Promise<string[]>((resolve) => resolvers.set(id, resolve))
    return { load, resolver: (id: string, v: string[]) => resolvers.get(id)?.(v) }
  }

  it('la respuesta tardía del paciente anterior no pisa la del actual', async () => {
    const { load, resolver } = cargadorManual()
    const { begin } = useLatestOnly()
    const lista = ref<string[]>([])
    const loading = ref(false)

    async function refresh(id: string) {
      const vigente = begin()
      loading.value = true
      const rows = await load(id)
      if (!vigente()) return
      lista.value = rows
      loading.value = false
    }

    // El usuario abre A y salta a B antes de que A responda.
    const cargaA = refresh('A')
    const cargaB = refresh('B')

    // B responde primero; A llega tarde, que es el caso que rompe la pantalla.
    resolver('B', ['datos de B'])
    resolver('A', ['datos de A'])
    await Promise.all([cargaA, cargaB])
    await nextTick()

    expect(lista.value).toEqual(['datos de B'])
    // Y el loading no se queda pegado por la respuesta descartada.
    expect(loading.value).toBe(false)
  })

  it('sin el guardián, la misma secuencia deja los datos del anterior', async () => {
    // Contraprueba: demuestra que la carrera es real y que la protección es lo
    // único que la evita. Si esta prueba dejara de fallar sin guardián, es que
    // el escenario ya no reproduce el defecto.
    const { load, resolver } = cargadorManual()
    const lista = ref<string[]>([])

    async function refreshSinGuardia(id: string) {
      lista.value = await load(id)
    }

    const a = refreshSinGuardia('A')
    const b = refreshSinGuardia('B')
    resolver('B', ['datos de B'])
    resolver('A', ['datos de A'])
    await Promise.all([a, b])

    expect(lista.value).toEqual(['datos de A'])
  })
})

describe('useClinicalHistory descarta la respuesta del paciente anterior', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cambiar de mascota antes de que responda la primera no contamina la vista', async () => {
    // BE-06: la historia pasó a paginarse en servidor, así que el cargador devuelve una
    // `PageResponse` y el descarte de la respuesta vieja lo hace el `AbortSignal` de
    // `useInfiniteList`. La invariante que se protege es la misma: la respuesta de la mascota
    // anterior nunca puede pisar la que el usuario está viendo.
    const resolvers = new Map<number, (v: unknown) => void>()
    vi.doMock('@/features/historia-clinica/api/clinicalHistory.api', () => ({
      clinicalHistoryApi: {
        findByAnimal: (animalId: number) =>
          new Promise((resolve) => resolvers.set(animalId, resolve as (v: unknown) => void)),
        summary: () => Promise.resolve([]),
      },
    }))

    const { useClinicalHistory } =
      await import('@/features/historia-clinica/composables/useClinicalHistory')

    const petId = ref<string | null>('1')
    const { events, loading } = useClinicalHistory(petId, {
      type: ref<'ALL'>('ALL'),
      search: ref(''),
    })

    // El watch es `immediate`: la carga de la mascota 1 ya está en vuelo.
    petId.value = '2'
    await nextTick()

    const pagina = (animalId: number, summary: string) => ({
      content: [
        {
          sourceId: animalId,
          animalId,
          eventType: 'CONSULTATION',
          eventDate: '2026-08-01',
          endDate: null,
          consultationId: animalId,
          summary,
        },
      ],
      page: 0,
      pageSize: 20,
      totalElements: 1,
      totalPages: 1,
    })

    // La 2 responde antes; la 1 llega tarde.
    resolvers.get(2)?.(pagina(2, 'consulta de la mascota 2'))
    resolvers.get(1)?.(pagina(1, 'consulta de la mascota 1'))

    // El cargador encadena varios `.then`, así que hay que dejar drenar la cola
    // de microtareas en vez de contar ticks a ojo.
    await vi.waitFor(() => expect(events.value).toHaveLength(1))

    expect(events.value.map((e) => e.animalId)).toEqual([2])
    expect(loading.value).toBe(false)
  })
})
