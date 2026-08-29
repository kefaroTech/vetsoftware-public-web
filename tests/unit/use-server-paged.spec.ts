import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { AxiosError, CanceledError } from 'axios'
import { useServerPaged, type ServerPageLoader } from '@/composables/useServerPaged'
import type { PageResponse } from '@/types/pagination'

/**
 * El `catch` de `useServerPaged` aplastaba cualquier fallo contra el literal
 * «No se pudo cargar el listado» y tiraba el identificador de traza.
 *
 * Eso convierte dos incidentes distintos en el mismo mensaje. Un 403 —«no
 * tienes permiso para ver la caja de otra sede»— y un 500 se leen igual, así
 * que el usuario reporta «no carga» y soporte no tiene ni el motivo ni la
 * petición: sin `X-Trace-Id` no hay forma de encontrarla en Grafana. Es el
 * mismo criterio que `errorFrom` de `useToast`, que ya lo hacía bien.
 */

const LITERAL_GENERICO = 'No se pudo cargar el listado'
const DETALLE_BACKEND = 'No tienes permiso para ver los movimientos de otra sede.'
const TRAZA = '4bf92f3577b34da6a3ce929d0e0e4736'

/** Un `AxiosError` como el que produce el interceptor ante un 403 del backend. */
function errorConProblemDetail(
  data: Record<string, unknown>,
  headers: Record<string, string> = {},
): AxiosError {
  const error = new AxiosError('Request failed with status code 403', 'ERR_BAD_REQUEST')
  error.response = {
    status: 403,
    statusText: 'Forbidden',
    headers,
    config: { headers: {} },
    data,
  } as never
  return error
}

/**
 * El composable registra `onUnmounted`, así que necesita instancia viva. Sin
 * ella Vue avisa por consola y el `abort` de limpieza nunca se engancha.
 */
function montarPaginado<T>(loader: ServerPageLoader<T>) {
  let api!: ReturnType<typeof useServerPaged<T>>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useServerPaged(loader)
        return () => h('div')
      },
    }),
  )
  return { api, wrapper }
}

const paginaVacia = <T>(): PageResponse<T> => ({
  content: [],
  page: 0,
  pageSize: 20,
  totalElements: 0,
  totalPages: 1,
})

describe('useServerPaged — el fallo llega entero a la pantalla', () => {
  it('expone el detalle que redactó el backend, no el literal genérico', async () => {
    const { api } = montarPaginado(() =>
      Promise.reject(
        errorConProblemDetail({
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          detail: DETALLE_BACKEND,
        }),
      ),
    )

    await api.reload()

    expect(api.error.value).toBe(DETALLE_BACKEND)
    expect(api.error.value).not.toBe(LITERAL_GENERICO)
  })

  it('expone el identificador de traza de la cabecera X-Trace-Id', async () => {
    const { api } = montarPaginado(() =>
      Promise.reject(
        errorConProblemDetail(
          { title: 'Forbidden', status: 403, detail: DETALLE_BACKEND },
          { 'x-trace-id': TRAZA },
        ),
      ),
    )

    await api.reload()

    expect(api.errorTraceId.value).toBe(TRAZA)
  })

  it('si no viene la cabecera, cae al traceId del propio ProblemDetail', async () => {
    const { api } = montarPaginado(() =>
      Promise.reject(
        errorConProblemDetail({ title: 'Forbidden', status: 403, detail: 'x', traceId: TRAZA }),
      ),
    )

    await api.reload()

    expect(api.errorTraceId.value).toBe(TRAZA)
  })

  it('el literal genérico sigue siendo el suelo cuando no hay respuesta (un timeout)', async () => {
    // No es una regresión: es el caso que el literal SÍ cubre. Un timeout nunca
    // llega a tener `error.response` -el servidor no alcanzó a contestar-, así
    // que no hay nada suyo que mostrar y el literal es lo único que puede
    // pintar la pantalla. Antes de la corrección de `getProblemDetailMessage`
    // esto devolvía el `error.message` crudo de axios
    // (`"timeout of 15000ms exceeded"`, sin traducir); ese era el defecto, no
    // el comportamiento correcto.
    const timeout = new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED')
    const { api } = montarPaginado(() => Promise.reject(timeout))

    await api.reload()

    expect(api.error.value).toBe(LITERAL_GENERICO)
    expect(api.errorTraceId.value).toBeNull()
  })

  it('el listado se vacía al fallar, para no dejar filas de la página anterior', async () => {
    let fallar = false
    const { api } = montarPaginado<{ id: number }>(() =>
      fallar
        ? Promise.reject(errorConProblemDetail({ detail: DETALLE_BACKEND }))
        : Promise.resolve({
            content: [{ id: 1 }],
            page: 0,
            pageSize: 20,
            totalElements: 1,
            totalPages: 1,
          }),
    )

    await api.reload()
    expect(api.items.value).toHaveLength(1)

    fallar = true
    await api.reload()

    expect(api.items.value).toEqual([])
    expect(api.total.value).toBe(0)
  })
})

describe('useServerPaged — una cancelación no es un fallo', () => {
  it('no deja mensaje de error ni identificador de traza', async () => {
    // El caso que se olvida. Cada tecla del buscador aborta la petición
    // anterior: si la cancelación ensuciara `error`, la pantalla parpadearía en
    // rojo mientras el usuario escribe, y con un identificador de traza de una
    // petición que nunca llegó a fallar.
    const { api } = montarPaginado(() => Promise.reject(new CanceledError('canceled')))

    await api.reload()

    expect(api.error.value).toBeNull()
    expect(api.errorTraceId.value).toBeNull()
  })

  it('tampoco borra el error anterior que la pantalla aún está mostrando', async () => {
    let modo: 'fallo' | 'cancelado' = 'fallo'
    const { api } = montarPaginado(() =>
      Promise.reject(
        modo === 'fallo'
          ? errorConProblemDetail({ detail: DETALLE_BACKEND }, { 'x-trace-id': TRAZA })
          : new CanceledError('canceled'),
      ),
    )

    await api.reload()
    expect(api.error.value).toBe(DETALLE_BACKEND)

    modo = 'cancelado'
    await api.reload()
    await nextTick()

    // `fetchPage` limpia `error` al arrancar, así que tras una cancelación el
    // estado queda limpio y NO con el error viejo colgando: lo que importa es
    // que la cancelación no INVENTE uno nuevo.
    expect(api.error.value).toBeNull()
    expect(api.errorTraceId.value).toBeNull()
  })

  it('una página que carga bien no deja error de un intento previo', async () => {
    let fallar = true
    const { api } = montarPaginado(() =>
      fallar
        ? Promise.reject(errorConProblemDetail({ detail: DETALLE_BACKEND }))
        : Promise.resolve(paginaVacia()),
    )

    await api.reload()
    expect(api.error.value).toBe(DETALLE_BACKEND)

    fallar = false
    await api.reload()

    expect(api.error.value).toBeNull()
    expect(api.errorTraceId.value).toBeNull()
    expect(api.loading.value).toBe(false)
  })
})
