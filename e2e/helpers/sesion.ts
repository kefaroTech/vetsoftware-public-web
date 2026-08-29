import type { Page, Route } from '@playwright/test'
import { AUTH_STORAGE_KEY } from '../../src/services/storage/storage.service'

/**
 * Sesión simulada y respuestas de API simuladas, para las pantallas que viven
 * DETRÁS del login.
 *
 * ── Por qué simulada y no un login de verdad ───────────────────────────────
 * Las suites que hacen login (`auth`, `consulta`, `historia`…) se saltan solas
 * sin `E2E_PASSWORD`, así que un caso que dependiera de ellas no se ejecutaría
 * nunca en la máquina de quien no tiene credenciales — que es donde más falta
 * hace que se ejecute. Y lo que estos casos comprueban es **semántica de la
 * interfaz** (roles ARIA, orden del foco, texto exacto), no el backend: hacerlo
 * depender de una base de datos con datos de ese día lo convertiría en
 * intermitente por motivos que no son un cambio de código, y un caso que falla
 * por ruido se acaba desactivando.
 *
 * Lo que SÍ se ejercita es la aplicación real —router, guardas, stores,
 * componentes—: lo único que se sustituye es la frontera HTTP.
 *
 * ── Lo que esto NO puede detectar, y hay que decirlo ───────────────────────
 * Un cambio de forma en el contrato del backend. Estos objetos están escritos a
 * mano contra los tipos de `src/features/suscripcion/types/`; si el backend
 * renombra un campo, aquí seguiría verde. Esa cobertura es de `api:check` y de
 * `MatchesContract`, no de una prueba de interfaz.
 */

/** Empresa de la sesión simulada. Todos los mocks cuelgan de este id. */
export const EMPRESA_ID = 7

/** Reconocible como dato de prueba a simple vista, en pantalla y en el informe. */
export const EMPRESA_NOMBRE = 'Clínica E2E de prueba'

/** Prefijo de la API. `createApiBaseUrl` produce `<origen>/api/v1`. */
const API = '**/api/v1'

function base64url(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url')
}

/**
 * Un JWT que este front puede LEER pero nadie puede usar.
 *
 * La firma es literal y no cifra nada: `decodeJwt` no verifica —la firma la
 * comprueba el backend en cada petición— y lo único que el cliente saca de aquí
 * es `exp` y `companyId`. Como ninguna petición sale de verdad, el token no
 * llega a ningún servidor.
 */
export function tokenSimulado(minutosDeVida = 30): string {
  const ahora = Math.floor(Date.now() / 1000)
  return [
    base64url({ alg: 'none', typ: 'JWT' }),
    base64url({
      sub: '1',
      type: 'EMPLOYEE',
      companyId: EMPRESA_ID,
      iat: ahora,
      exp: ahora + minutosDeVida * 60,
    }),
    'sin-firma-no-sirve-contra-ningun-servidor',
  ].join('.')
}

export interface PerfilSimulado {
  permisos?: string[]
  mustChangePassword?: boolean
}

/** `GET /auth/me`, que es lo que el guard del router pide en cada navegación. */
export function perfilSimulado(opciones: PerfilSimulado = {}) {
  return {
    id: 1,
    type: 'EMPLOYEE',
    companyId: EMPRESA_ID,
    name: 'Empleado E2E de prueba',
    employeeCode: 'E2E-001',
    mustChangePassword: opciones.mustChangePassword ?? false,
    permissions: opciones.permisos ?? [],
    branchIds: [1],
  }
}

/**
 * Instala la sesión ANTES de que arranque la aplicación.
 *
 * `addInitScript` y no un `evaluate` tras el `goto`: el store de auth lee
 * `localStorage` en su creación, así que escribirlo después dejaría la primera
 * navegación sin sesión y el guard mandaría a `/login`.
 */
export async function instalarSesion(page: Page): Promise<void> {
  await page.addInitScript(
    ([clave, valor]) => {
      window.localStorage.setItem(clave, valor)
    },
    [AUTH_STORAGE_KEY, JSON.stringify({ token: tokenSimulado(), type: 'EMPLOYEE' })] as const,
  )
}

/**
 * Las cabeceras de CORS, y por qué una prueba de interfaz tiene que ponerlas.
 *
 * La aplicación habla con `http://localhost:8080/api/v1` y se sirve desde
 * `http://localhost:5174`: **son orígenes distintos**. Interceptar una petición
 * y responderla con `route.fulfill()` no exime al navegador de aplicar CORS —
 * la respuesta simulada pasa por el mismo control que una real—, y como el
 * cliente va con `withCredentials` (el refresh token vive en una cookie
 * `HttpOnly`), no vale el comodín: hay que devolver el origen exacto y
 * `allow-credentials`.
 *
 * Sin esto el síntoma no señala a la causa: `/auth/me` falla, el store limpia la
 * sesión, el guard manda a `/login` y la prueba dice «no encuentro el
 * encabezado» sobre una pantalla que ni siquiera llegó a montarse.
 */
function cabecerasCors(route: Route): Record<string, string> {
  const cabeceras = route.request().headers()
  return {
    'access-control-allow-origin': cabeceras['origin'] ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers':
      cabeceras['access-control-request-headers'] ?? 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-max-age': '600',
  }
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  // El preflight se contesta aquí mismo: si se dejara pasar, saldría hacia
  // `localhost:8080` y la prueba volvería a depender de que haya backend.
  if (route.request().method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: cabecerasCors(route) })
  }
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: cabecerasCors(route),
    body: JSON.stringify(body),
  })
}

/** Una página vacía con la forma de `PageResponse`, para el comodín. */
const PAGINA_VACIA = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 }

/**
 * `GET /branches`, y por qué NO puede caer en el comodín.
 *
 * El armazón autenticado monta `AppSidebar` → `BranchSelector` en TODA pantalla
 * bajo `/dashboard`, y `branch.store` hace `branches.value.filter(...)` sobre lo
 * que devuelva este endpoint. Servirle la página vacía del comodín —un objeto,
 * no un array— revienta con `branches.value.filter is not a function` **dentro
 * de un watcher**, así que el árbol entero deja de pintarse y el fallo que se
 * ve es «no encuentro el encabezado» en una pantalla que sí existe.
 *
 * El id coincide con el `branchIds: [1]` del perfil simulado: si no coincidiera,
 * `operableBranchIds()` daría vacío y el selector de sede quedaría sin opciones.
 */
const SEDES = [
  {
    id: 1,
    name: 'Sede E2E de prueba',
    code: 'E2E-1',
    address: null,
    phone: null,
    city: { id: 1, name: 'Bogotá D.C.' },
    active: true,
  },
]

/**
 * Enruta la API.
 *
 * El comodín se registra PRIMERO a propósito: Playwright resuelve la ruta
 * registrada más tarde, así que lo específico declarado después gana. Sin el
 * comodín, cualquier petición que una pantalla haga y esta prueba no haya
 * previsto saldría hacia `localhost:8080` y el caso dependería de que hubiera un
 * backend levantado — exactamente lo que se está evitando.
 */
export async function enrutarApi(
  page: Page,
  rutas: Record<string, unknown | ((route: Route) => Promise<void> | void)>,
  perfil: PerfilSimulado = {},
): Promise<void> {
  await page.route(`${API}/**`, (route) => json(route, PAGINA_VACIA))
  await page.route(`${API}/auth/me`, (route) => json(route, perfilSimulado(perfil)))
  await page.route(`${API}/branches`, (route) => json(route, SEDES))

  for (const [patron, respuesta] of Object.entries(rutas)) {
    await page.route(`${API}${patron}`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: cabecerasCors(route) })
      }
      if (typeof respuesta === 'function') {
        return (respuesta as (r: Route) => Promise<void> | void)(route)
      }
      return json(route, respuesta)
    })
  }
}

/** `GET /companies/{id}` — lo único que el paso 6 lee de verdad del servidor. */
export const EMPRESA_RESPUESTA = {
  id: EMPRESA_ID,
  name: EMPRESA_NOMBRE,
  identifier: '900123456-7',
  enabled: true,
}

/** 403 con `problem+json`, que es lo que el front sabe leer. */
export function prohibido(route: Route): Promise<void> {
  return route.fulfill({
    status: 403,
    contentType: 'application/problem+json',
    headers: cabecerasCors(route),
    body: JSON.stringify({ status: 403, title: 'Forbidden', detail: 'Sin permiso' }),
  })
}
