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
  getProblemDetailCode,
  getProblemDetailFieldErrors,
  isConcurrencyConflict,
  isAppointmentOverlap,
  setRefreshHandler,
  setSessionClearHandler,
} from '@/services/http/http.client'
import { storageService } from '@/services/storage/storage.service'
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
function httpError(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = {},
): AxiosError {
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
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

let loader: ReturnType<typeof useLoaderStore>

beforeEach(() => {
  setActivePinia(createPinia())
  loader = useLoaderStore()
  localStorage.clear()
  sessionStorage.clear()
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

    // Issue #215 · «venta de POS» pasa por `withBranchBody`, y con la sede sin
    // resolver (Pinia se recrea en cada test, sin sesión ni sede cargadas) el
    // interceptor espera de verdad: `ensureSelectedBranch()` dispara `/auth/me`
    // y el listado de sedes ANTES de dejar salir esta escritura. Esas dos
    // peticiones anidadas pasan por el mismo adapter espiado y quedan
    // registradas primero — la llamada bajo prueba es siempre la ÚLTIMA, nunca
    // la primera. En los otros cinco casos (sin `withBranchBody`) no hay
    // llamadas anidadas, así que la última y la primera son la misma.
    expect(adapter.mock.calls.at(-1)?.[0].timeout).toBe(DIAN_TIMEOUT_MS)
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

/**
 * El otro camino que atraviesa el mismo interceptor: el 401. Comparte con el
 * loader la propiedad de fallar en silencio — si el reintento tras refrescar se
 * rompiera, el usuario vería sesiones que caen sin motivo aparente.
 *
 * Este bloque se mantiene idéntico en los dos fronts (TR-02).
 */
describe('401 y renovación de sesión', () => {
  beforeEach(() => {
    // El redirect es una navegación dura; jsdom no la implementa, así que se
    // observa sobre un doble en vez de dejar que reviente.
    vi.stubGlobal('location', { pathname: '/tienda', href: '' })
    storageService.setSession({ token: 'access-viejo', type: 'EMPLOYEE' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setRefreshHandler(async () => null)
    setSessionClearHandler(() => {})
    localStorage.clear()
    sessionStorage.clear()
  })

  it('refresca una vez y reintenta la petición con el token nuevo', async () => {
    // El handler real (auth.store) persiste la sesión antes de resolver, y de eso
    // depende el reintento: al reenviar la petición, el interceptor de request
    // relee el token del storage. Un doble que no persistiera reintentaría con el
    // token viejo — y la prueba pasaría por el motivo equivocado.
    const refresh = vi.fn(async () => {
      storageService.setSession({ token: 'access-nuevo', type: 'EMPLOYEE' })
      return 'access-nuevo'
    })
    setRefreshHandler(refresh)
    let intentos = 0
    useAdapter(async (config) => {
      intentos += 1
      if (intentos === 1) throw httpError(config, 401, { code: 'TOKEN_EXPIRED' })
      expect(config.headers.Authorization).toBe('Bearer access-nuevo')
      return ok(config, { items: [] })
    })

    const { data } = await http.get('/medicaments')

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(data).toEqual({ items: [] })
    expect(loader.pending).toBe(0)
  })

  it('no reintenta dos veces la misma petición aunque el reintento vuelva a dar 401', async () => {
    // Sin la marca `_retry` esto sería un bucle infinito de refrescos.
    const refresh = vi.fn(async () => 'access-nuevo')
    setRefreshHandler(refresh)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_EXPIRED' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(location.href).toBe('/login?redirect=%2Ftienda')
    expect(loader.pending).toBe(0)
  })

  it('manda al login sin intentar refrescar cuando el token es inválido, no expirado', async () => {
    const refresh = vi.fn(async () => 'access-nuevo')
    setRefreshHandler(refresh)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(refresh).not.toHaveBeenCalled()
    expect(storageService.getToken()).toBeNull()
    expect(location.href).toBe('/login?redirect=%2Ftienda')
  })

  it('conserva query string en el destino recordado, no solo el pathname', async () => {
    vi.stubGlobal('location', { pathname: '/tienda', search: '?tab=historia', href: '' })
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(location.href).toBe('/login?redirect=%2Ftienda%3Ftab%3Dhistoria')
  })

  it('limpia el store ANTES de la limpieza de almacenamiento, incluso sin recarga', async () => {
    // Es el defecto del issue: sin este handler los refs del store sobreviven al
    // 401 y `isAuthenticated` se queda en `true` con un token ya rechazado. Se
    // comprueba también estando ya en `/login`, donde no hay recarga dura que lo
    // corrija por su cuenta.
    vi.stubGlobal('location', { pathname: '/login', href: '' })
    const orden: string[] = []
    setSessionClearHandler(() => orden.push('store'))
    const originalClearVolatile = storageService.clearVolatile.bind(storageService)
    const clearVolatile = vi.spyOn(storageService, 'clearVolatile').mockImplementation(() => {
      orden.push('storage')
      originalClearVolatile()
    })
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(orden).toEqual(['store', 'storage'])
    clearVolatile.mockRestore()
  })

  it('no recarga si el 401 llega estando ya en el login', async () => {
    vi.stubGlobal('location', { pathname: '/login', href: '' })
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(location.href).toBe('')
  })

  it('deja dicho por qué se cerró la sesión cuando la desplazó otro dispositivo', async () => {
    // Sin este aviso el usuario aparece en el login sin explicación y lo lee como
    // un fallo de la aplicación. El texto va a sessionStorage porque lo que sigue
    // es una navegación dura que destruye el store.
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'SESSION_REPLACED' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(storageService.takeSessionReplacedNotice()).toBe(
      'Tu cuenta se inició en otro dispositivo.',
    )
    expect(location.href).toBe('/login?redirect=%2Ftienda')
  })

  it('deja pasar el 401 de las llamadas de auth sin tocar la sesión', async () => {
    // Un login con credenciales malas responde 401: refrescar o redirigir ahí
    // sería recursión y pérdida del mensaje de error del formulario.
    const refresh = vi.fn(async () => 'access-nuevo')
    setRefreshHandler(refresh)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'BAD_CREDENTIALS' })
    })

    await expect(http.post('/auth/login/employee', {})).rejects.toThrow()

    expect(refresh).not.toHaveBeenCalled()
    expect(storageService.getToken()).toBe('access-viejo')
    expect(location.href).toBe('')
  })

  it('integración: el 401 real deja al store de auth sin sesión, no solo al storage', async () => {
    // Defecto del issue: `redirectToLogin()` limpiaba el storage pero nunca el
    // store, así que `isAuthenticated` seguía en `true` con un token que el
    // backend ya rechazó. Se usa el store real (no un doble) para probar el
    // cableado end-to-end: `auth.store` registra `setSessionClearHandler` con su
    // propio `clearSession`.
    const { useAuthStore } = await import('@/features/auth/stores/auth.store')
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(true)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/medicaments')).rejects.toThrow()

    expect(store.isAuthenticated).toBe(false)
    expect(store.session).toBeNull()
  })
})

/**
 * Los tres lectores del `ProblemDetail` que el backend ya emitía y que nadie
 * leía. Existían solo en el front operativo, así que el admin trataba un 409 de
 * bloqueo optimista igual que un 500 y descartaba los errores por campo.
 *
 * Este bloque se mantiene idéntico en los dos fronts (TR-02).
 */
describe('lectores del ProblemDetail', () => {
  const config = { headers: {} } as InternalAxiosRequestConfig

  describe('getProblemDetailCode', () => {
    it('devuelve el código de negocio', () => {
      const error = httpError(config, 409, { code: 'CONCURRENT_MODIFICATION' })

      expect(getProblemDetailCode(error)).toBe('CONCURRENT_MODIFICATION')
    })

    it('devuelve null cuando el cuerpo no trae código', () => {
      expect(getProblemDetailCode(httpError(config, 500, {}))).toBeNull()
    })

    it('devuelve null ante algo que no es un error de axios', () => {
      expect(getProblemDetailCode(new Error('vaya'))).toBeNull()
      expect(getProblemDetailCode(null)).toBeNull()
    })
  })

  describe('isConcurrencyConflict', () => {
    it('reconoce el 409 de bloqueo optimista', () => {
      // Es la señal de "recarga y vuelve a intentarlo", no la de "algo se rompió".
      // Confundirla hace que el usuario reintente sobre datos ya obsoletos.
      const error = httpError(config, 409, { code: 'CONCURRENT_MODIFICATION' })

      expect(isConcurrencyConflict(error)).toBe(true)
    })

    it('no confunde otro 409 con un conflicto de versión', () => {
      const error = httpError(config, 409, { code: 'DUPLICATED_CODE' })

      expect(isConcurrencyConflict(error)).toBe(false)
    })
  })

  describe('isAppointmentOverlap', () => {
    it('reconoce el 409 de solape de cita', () => {
      // BE-17: la duración de la cita ahora bloquea el hueco. El llamador puede
      // reintentar marcando un flag de forzado para agendar igualmente.
      const error = httpError(config, 409, { code: 'APPOINTMENT_OVERLAP' })

      expect(isAppointmentOverlap(error)).toBe(true)
    })

    it('no confunde otro 409 con un solape de cita', () => {
      const error = httpError(config, 409, { code: 'CONCURRENT_MODIFICATION' })

      expect(isAppointmentOverlap(error)).toBe(false)
    })
  })

  describe('getProblemDetailFieldErrors', () => {
    it('indexa por campo los errores de validación', () => {
      const error = httpError(config, 400, {
        code: 'VALIDATION_ERROR',
        errors: [
          { field: 'name', message: 'no puede estar vacío' },
          { field: 'email', message: 'formato inválido' },
        ],
      })

      expect(getProblemDetailFieldErrors(error)).toEqual({
        name: 'no puede estar vacío',
        email: 'formato inválido',
      })
    })

    it('devuelve un objeto vacío cuando no hay errores por campo', () => {
      expect(getProblemDetailFieldErrors(httpError(config, 400, {}))).toEqual({})
    })

    it('devuelve un objeto vacío ante algo que no es un error de axios', () => {
      expect(getProblemDetailFieldErrors(new Error('vaya'))).toEqual({})
    })
  })
})
