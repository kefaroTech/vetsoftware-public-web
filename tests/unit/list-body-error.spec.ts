import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import ListBody from '@/features/acciones/components/ListBody.vue'
import Pagination from '@/components/ui/Pagination.vue'
import type { PageResponse } from '@/types/pagination'
import { exigir } from '../helpers/exigir'

/**
 * GUARDA DE EST-01 — un fallo del servidor NO es una lista vacía.
 *
 * `ListBody` monta las siete pantallas clínicas de `acciones` (vacunas, cirugías,
 * hospitalización, laboratorio, imágenes, desparasitaciones, spa). Cuando su
 * `fetchPage` reventaba, `useServerPaged` dejaba `total` en 0 y la tabla caía en
 * la rama de vacío: el veterinario leía «No hay registros aún» y concluía que el
 * paciente no tiene vacunas, cuando lo cierto es que no se pudo preguntar. Esa
 * confusión no es cosmética — decide si se vuelve a vacunar.
 *
 * Lo que esta prueba sujeta es la propiedad, no el marcado:
 *  1. hay un `role="alert"` con el mensaje que redactó el backend (`ProblemDetail`),
 *  2. el texto de vacío NO aparece por ningún lado, y
 *  3. «Reintentar» vuelve a pedir la página que el usuario pidió, no la anterior.
 *
 * El punto 3 es el fino: `server.page` solo avanza en el camino de éxito, así que
 * tras fallar un salto a la 3 sigue diciendo 1. Por eso el componente lleva
 * `lastRequestedPage` (ListBody.vue:43). Sin ese ref, reintentar recarga la página
 * vieja y el usuario pierde su sitio sin que nada se lo diga.
 */

interface Fila {
  id: number
  nombre: string
}

const DETALLE_DEL_SERVIDOR = 'No tienes permiso para consultar las vacunas de este paciente.'
const TRACE_ID = 'a1b2c3d4e5f60718'
const VACIO = 'Este paciente no tiene vacunas registradas'

/**
 * Un `AxiosError` como el que produce el interceptor real: cuerpo `ProblemDetail`
 * y cabecera `X-Trace-Id`. Se construye a mano y no con un `Error` cualquiera
 * porque `getProblemDetailMessage` y `getTraceId` comprueban `instanceof
 * AxiosError`: un doble más laxo pasaría la prueba sin ejercitar el camino real.
 */
function errorConProblemDetail(detail: string, traceId: string): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError(
    'Request failed with status code 403',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status: 403,
      statusText: 'Forbidden',
      headers: { 'x-trace-id': traceId },
      config,
      data: {
        type: 'about:blank',
        title: 'Acceso denegado',
        detail,
        status: 403,
        traceId,
      },
    },
  )
}

function paginaConDatos(page: number): PageResponse<Fila> {
  return {
    content: [
      { id: page * 10 + 1, nombre: `Registro ${page * 10 + 1}` },
      { id: page * 10 + 2, nombre: `Registro ${page * 10 + 2}` },
    ],
    page,
    pageSize: 2,
    totalElements: 8,
    totalPages: 4,
  }
}

/** El botón por su nombre accesible, no por su clase: es lo que ve el usuario. */
function botonReintentar(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').find((b) => b.text().trim() === 'Reintentar')
}

describe('ListBody — el fallo del servidor se anuncia como fallo (EST-01)', () => {
  it('pinta un role="alert" con el mensaje del ProblemDetail y no el texto de vacío', async () => {
    const fetchPage = vi
      .fn()
      .mockRejectedValue(errorConProblemDetail(DETALLE_DEL_SERVIDOR, TRACE_ID))

    const wrapper = mount(ListBody, {
      props: { fetchPage, pageSize: 2, emptyText: VACIO },
    })
    await flushPromises()

    const alerta = wrapper.find('[role="alert"]')
    expect(alerta.exists(), 'un 403 debe anunciarse como error, no como lista vacía').toBe(true)
    // El mensaje es el del backend, no un literal de la pantalla: un 403 y un 500
    // no dicen lo mismo y el usuario necesita saber cuál de los dos le pasó.
    expect(alerta.text()).toContain(DETALLE_DEL_SERVIDOR)

    expect(
      wrapper.text(),
      'el texto de vacío no puede aparecer cuando lo que hubo fue un fallo: es la confusión que EST-01 corrige',
    ).not.toContain(VACIO)
  })

  it('ofrece el identificador de la traza para poder reportar el fallo', async () => {
    const fetchPage = vi
      .fn()
      .mockRejectedValue(errorConProblemDetail(DETALLE_DEL_SERVIDOR, TRACE_ID))

    const wrapper = mount(ListBody, { props: { fetchPage, pageSize: 2, emptyText: VACIO } })
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain(TRACE_ID)
  })

  it('«Reintentar» vuelve a pedir LA PÁGINA QUE FALLÓ, no la última servida', async () => {
    // Página 1 (0-based 0) va bien; cualquier otra revienta. Así `server.page`
    // se queda en 1 y el salto a la 3 es el que falla.
    const fetchPage = vi.fn(async (page: number): Promise<PageResponse<Fila>> => {
      if (page === 0) return paginaConDatos(0)
      throw errorConProblemDetail(DETALLE_DEL_SERVIDOR, TRACE_ID)
    })

    const wrapper = mount(ListBody, { props: { fetchPage, pageSize: 2, emptyText: VACIO } })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    // El usuario salta a la página 3 desde el paginador.
    wrapper.findComponent(Pagination).vm.$emit('update:page', 3)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists(), 'el salto a la 3 debía fallar').toBe(true)
    expect(fetchPage.mock.calls.at(-1)?.[0], 'se pidió la página 3 (0-based 2)').toBe(2)

    const llamadasAntes = fetchPage.mock.calls.length
    const reintentar = botonReintentar(wrapper)
    expect(reintentar, 'la rama de error debe ofrecer «Reintentar»').toBeDefined()
    await exigir(reintentar, 'reintentar').trigger('click')
    await flushPromises()

    expect(fetchPage).toHaveBeenCalledTimes(llamadasAntes + 1)
    expect(
      fetchPage.mock.calls.at(-1)?.[0],
      'reintentar debe volver a pedir la página 3 (0-based 2). Si sale 0, el componente ' +
        'está usando `server.page`, que solo avanza en el camino de éxito y por eso sigue ' +
        'en la 1: es el defecto que `lastRequestedPage` corrige.',
    ).toBe(2)
  })

  it('un reintento con éxito borra la alerta y muestra la página pedida', async () => {
    let fallar = true
    const fetchPage = vi.fn(async (page: number): Promise<PageResponse<Fila>> => {
      if (page !== 0 && fallar) throw errorConProblemDetail(DETALLE_DEL_SERVIDOR, TRACE_ID)
      return paginaConDatos(page)
    })

    const wrapper = mount(ListBody, { props: { fetchPage, pageSize: 2, emptyText: VACIO } })
    await flushPromises()

    wrapper.findComponent(Pagination).vm.$emit('update:page', 3)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    fallar = false
    await exigir(botonReintentar(wrapper), 'botonReintentar(wrapper)').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    // La página 3 (0-based 2) es la que quedó cargada: el usuario no fue devuelto al principio.
    expect(fetchPage.mock.calls.at(-1)?.[0]).toBe(2)
    expect(wrapper.findComponent(Pagination).props('page')).toBe(3)
  })
})
