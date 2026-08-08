import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  AxiosError,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  http,
  DEFAULT_TIMEOUT_MS,
  DIAN_TIMEOUT_MS,
  TRANSFER_TIMEOUT_MS,
} from '@/services/http/http.client'
import { useLoaderStore } from '@/stores/loader.store'
import { electronicDocumentApi } from '@/features/facturacion/api/electronicDocument.api'
import { posSaleApi } from '@/features/tienda/api/posSale.api'
import { clinicalHistoryApi } from '@/features/historia-clinica/api/clinicalHistory.api'
import { laboratoryTestFileApi } from '@/features/laboratorio/api/laboratoryTestFile.api'

/**
 * El contrato del cliente HTTP no es "hacer peticiones": es garantizar que el
 * loader global vuelva SIEMPRE a cero. El interceptor de request lo incrementa
 * en cada llamada y solo el de response lo decrementa, así que cualquier camino
 * que no llegue a una respuesta —cuelgue, corte de red, cancelación— deja la
 * Huella latiendo sobre el overlay y la aplicación sin salida salvo recargar.
 *
 * La otra mitad es el timeout, y aquí no vale uno solo: hay operaciones cuyo
 * presupuesto en el servidor es legítimamente mucho mayor que el del CRUD
 * —transmitir a la DIAN, subir un adjunto, descargar un informe— y cortarlas
 * antes de tiempo no protege a nadie: aborta en el navegador algo que el backend
 * sigue haciendo. Por eso las pruebas de abajo no solo comprueban que existan
 * las constantes, sino que las llamadas concretas las usen.
 */

/** Respuesta correcta mínima con la forma que espera axios. */
function ok(config: InternalAxiosRequestConfig, data: unknown = {}): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

/** Error sin respuesta del servidor (cable desconectado, DNS caído, CORS). */
function networkError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
}

/** Lo que axios produce cuando vence `timeout`. */
function timeoutError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('timeout exceeded', AxiosError.ECONNABORTED, config)
}

/** Error con respuesta del servidor. */
function httpError(config: InternalAxiosRequestConfig, status: number): AxiosError {
  const response = { data: {}, status, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    config,
    null,
    response,
  )
}

/** Sustituye el transporte real por uno controlado, dejando los interceptores intactos. */
function useAdapter(adapter: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) {
  const spy = vi.fn(adapter)
  http.defaults.adapter = spy as never
  return spy
}

/** localStorage en memoria: el entorno de estas pruebas es node, sin DOM. */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage
}

let loader: ReturnType<typeof useLoaderStore>

beforeEach(() => {
  setActivePinia(createPinia())
  loader = useLoaderStore()
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
  vi.stubGlobal('window', { location: { pathname: '/tienda', href: '' } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('timeout', () => {
  it('toda petición nace con timeout: ninguna puede colgarse para siempre', () => {
    // Es la causa raíz de FE-04. Sin este valor la promesa nunca se resuelve,
    // ningún interceptor corre y el loader se queda arriba hasta recargar.
    expect(http.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS)
  })

  it.each([
    ['emit', () => electronicDocumentApi.emit({} as never)],
    ['transmit', () => electronicDocumentApi.transmit(1)],
    ['convertToInvoice', () => electronicDocumentApi.convertToInvoice(1)],
    ['creditNote', () => electronicDocumentApi.creditNote(1, 'ANULACION' as never)],
    ['debitNote', () => electronicDocumentApi.debitNote(1, 'INTERESES' as never)],
    ['venta de POS', () => posSaleApi.register({} as never)],
  ])('%s se da el presupuesto de la DIAN, no el del CRUD', async (_caso, llamada) => {
    // El backend transmite al proveedor con hasta 75 s (DianHttpConfig). Con los
    // 20 s por defecto el navegador abortaría con el documento ya emitido y el
    // consecutivo consumido.
    const adapter = useAdapter(async (config) => ok(config))

    await llamada()

    expect(adapter.mock.calls[0][0].timeout).toBe(DIAN_TIMEOUT_MS)
  })

  it.each([
    ['exportar la historia clínica', () => clinicalHistoryApi.exportPdf(1)],
    ['descargar un adjunto de laboratorio', () => laboratoryTestFileApi.download(1)],
    [
      'subir un adjunto de laboratorio',
      () => laboratoryTestFileApi.upload(1, new File(['x'], 'r.pdf')),
    ],
  ])('%s usa el presupuesto de transferencia', async (_caso, llamada) => {
    const adapter = useAdapter(async (config) => ok(config, new Blob()))

    await llamada()

    expect(adapter.mock.calls[0][0].timeout).toBe(TRANSFER_TIMEOUT_MS)
  })
})

describe('loader global', () => {
  it('vuelve a cero tras una respuesta correcta', async () => {
    useAdapter(async (config) => ok(config))

    await http.get('/cualquier-cosa')

    expect(loader.pending).toBe(0)
  })

  it('vuelve a cero cuando la red falla', async () => {
    useAdapter(async (config) => {
      throw networkError(config)
    })

    await expect(http.post('/cualquier-cosa', {})).rejects.toThrow()

    expect(loader.pending).toBe(0)
  })

  it('vuelve a cero cuando vence el timeout', async () => {
    // El caso que describe la auditoría: la petición se cuelga. Ahora termina en
    // error y el velo se retira, en vez de quedarse hasta recargar la página.
    useAdapter(async (config) => {
      throw timeoutError(config)
    })

    await expect(http.post('/cualquier-cosa', {})).rejects.toThrow()

    expect(loader.pending).toBe(0)
  })

  it('vuelve a cero cuando el llamador cancela', async () => {
    // Axios adjunta la config al cancelar, y es esa config la que lleva la marca
    // del loader.
    useAdapter(async (config) => {
      throw new CanceledError(undefined, config)
    })

    await expect(http.get('/cualquier-cosa')).rejects.toThrow(CanceledError)

    expect(loader.pending).toBe(0)
  })

  it('no lo toca cuando la petición pidió no mostrarlo', async () => {
    // `skipGlobalLoader` (búsqueda con debounce) no incrementa; si el camino de
    // error decrementara igualmente, retiraría el velo de otra petición en vuelo.
    useAdapter(async (config) => {
      throw networkError(config)
    })
    loader.push()

    await expect(http.post('/owners/search', {}, { skipGlobalLoader: true })).rejects.toThrow()

    expect(loader.pending).toBe(1)
    loader.pop()
  })

  it('queda balanceado tras varias peticiones concurrentes con distinto desenlace', async () => {
    useAdapter(async (config) => {
      if (config.url === '/falla') throw networkError(config)
      return ok(config)
    })

    await Promise.allSettled([
      http.post('/ok', {}),
      http.post('/falla', {}),
      http.post('/ok', {}),
      http.post('/falla', {}),
    ])

    expect(loader.pending).toBe(0)
  })
})

describe('reintentos', () => {
  it('reintenta un GET dos veces ante 5xx y deja el loader en cero', async () => {
    const adapter = useAdapter(async (config) => {
      throw httpError(config, 503)
    })

    await expect(http.get('/informes')).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(3) // original + 2 reintentos
    expect(loader.pending).toBe(0)
  })

  it('no reintenta un POST: no es idempotente', async () => {
    // Reintentar una venta que sí llegó al servidor la duplicaría.
    const adapter = useAdapter(async (config) => {
      throw httpError(config, 503)
    })

    await expect(http.post('/electronic-documents/from-sale', {})).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('no reintenta ante timeout', async () => {
    // Reintentar un cuelgue multiplicaría por tres el tiempo con la interfaz
    // bloqueada — exactamente lo contrario de lo que persigue este cambio.
    const adapter = useAdapter(async (config) => {
      throw timeoutError(config)
    })

    await expect(http.get('/informes')).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('no reintenta ante un error del cliente', async () => {
    const adapter = useAdapter(async (config) => {
      throw httpError(config, 422)
    })

    await expect(http.get('/informes')).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('devuelve la respuesta buena si el reintento acierta', async () => {
    let intentos = 0
    useAdapter(async (config) => {
      intentos += 1
      if (intentos === 1) throw networkError(config)
      return ok(config, { ok: true })
    })

    const { data } = await http.get('/informes')

    expect(data).toEqual({ ok: true })
    expect(loader.pending).toBe(0)
  })
})
