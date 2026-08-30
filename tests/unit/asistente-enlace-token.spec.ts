import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ASISTENTE_PROPUESTA_KEY } from '@/constants/storageKeys'
import { olvidarSesiones } from '@/features/asistente/api/asistente.source'
import { useRecuperarPropuesta } from '@/features/asistente/composables/useRecuperarPropuesta'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import type {
  AssistantProposalLineResponse,
  AssistantProposalResponse,
} from '@/features/asistente/types/asistente.types'
import { http } from '@/services/http/http.client'
import { elemento } from '../helpers/exigir'

/**
 * EL ENLACE DEL CORREO, DE VERDAD CONECTADO.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * El backend manda `<base>/?token=<43 caracteres>` y en todo el front había
 * **dos** sitios que leían un token de la URL —restablecer contraseña y
 * verificar correo—, ninguno en esta feature. El prospecto pulsaba, aterrizaba
 * en la landing, y la landing no sabía que traía una propuesta encima.
 *
 * ── Cómo muerden estas pruebas ─────────────────────────────────────────────
 * Cada caso está escrito contra la línea concreta que lo sostiene, no contra el
 * resultado feliz:
 *
 *  · Si se quita la hidratación, el primer caso ve `INICIAL` y falla.
 *  · Si `replace` se convierte en `push`, el caso del historial falla — y esa
 *    diferencia no es de estilo: con `push`, «atrás» devuelve al prospecto a la
 *    URL con el token dentro y la entrada se queda en el historial del
 *    navegador para siempre.
 *  · Si el 404 se trata como avería, el caso del enlace caducado ve
 *    `ASISTENTE_CAIDO` y falla; si se trata TODO como enlace caducado, el caso
 *    del 500 ve `ENLACE_CADUCADO` y falla. Los dos existen porque arreglar uno
 *    rompiendo el otro es el error natural.
 *  · Si al hidratar se ignora `presentation` y se aplana a «hay líneas →
 *    propuesta lista», el caso de `NOT_UNDERSTOOD` falla: ahí el carrito es un
 *    punto de partida determinista y la pantalla lleva un aviso que dice
 *    exactamente eso.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const errorFrom = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    errorFrom,
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/** Lo que el composable le pasa al router. Tipado para no arrastrar `any` al spec. */
interface DestinoRuta {
  name: string
  query: Record<string, unknown>
}

const replace = vi.fn<(destino: DestinoRuta) => Promise<void>>()
const push = vi.fn<(destino: DestinoRuta) => Promise<void>>()
const ruta: { name: string; query: Record<string, unknown> } = { name: 'landing', query: {} }

vi.mock('vue-router', () => ({
  useRoute: () => ruta,
  useRouter: () => ({ replace, push }),
}))

/** 32 bytes en base64url sin relleno. La longitud es parte de lo que se afirma. */
const TOKEN = 'a'.repeat(43)

function linea(over: Partial<AssistantProposalLineResponse> = {}): AssistantProposalLineResponse {
  return {
    code: 'CORE',
    name: 'Núcleo',
    description: 'Lo mínimo de toda cuenta',
    kind: 'MODULE',
    quantity: 1,
    unitAmount: 39_000,
    taxRate: 0.19,
    taxAmount: 7_410,
    totalAmount: 46_410,
    trialDays: 0,
    currency: 'COP',
    reason: null,
    ...over,
  }
}

function respuesta(over: Partial<AssistantProposalResponse> = {}): AssistantProposalResponse {
  return {
    token: TOKEN,
    presentation: 'PROPOSAL',
    expiresAt: '2026-09-30T12:00:00',
    version: 1,
    lines: [linea()],
    recommendations: [],
    discardedLines: 0,
    currency: 'COP',
    subtotal: 39_000,
    taxes: 7_410,
    total: 46_410,
    firstPeriodTotal: 0,
    packOffer: null,
    refinementsLeft: 3,
    recalculated: true,
    ...over,
  }
}

const cliente = vi.mocked(http)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // `olvidarSesiones` limpia además la clave del espejo, así que va ANTES de
  // sembrar nada en `localStorage`.
  olvidarSesiones()
  ruta.name = 'landing'
  ruta.query = {}
})

describe('llegar con un token válido', () => {
  it('hidrata la propuesta y deja al prospecto con su carrito', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({ data: respuesta() } as never)

    const { recuperarDeEnlace } = useRecuperarPropuesta()
    await recuperarDeEnlace()

    const store = usePropuestaStore()
    expect(store.estado).toBe('PROPUESTA_LISTA')
    expect(store.lineas).toHaveLength(1)
    expect(elemento(store.lineas, 0).code).toBe('CORE')
  })

  it('pide la propuesta por `?token=` y NUNCA en un segmento de ruta', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({ data: respuesta() } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    expect(cliente.get).toHaveBeenCalledTimes(1)
    const [camino, config] = cliente.get.mock.calls[0] as [string, { params?: { token?: string } }]
    // `getRequestURI()` no incluye la cadena de consulta, y es lo que el filtro
    // de trazabilidad del backend escribe en el contexto de log de TODA
    // petición. En la ruta, el token acabaría en CloudWatch y en Loki con 31
    // días de retención — y ningún patrón del redactor casa con 43 caracteres
    // de base64url sueltos.
    expect(camino).toBe('/assistant/proposal')
    expect(camino).not.toContain(TOKEN)
    expect(config.params?.token).toBe(TOKEN)
  })

  it('borra el token de la barra SUSTITUYENDO la entrada del historial', async () => {
    ruta.query = { token: TOKEN, ciclo: 'ANUAL' }
    cliente.get.mockResolvedValue({ data: respuesta() } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    expect(replace).toHaveBeenCalledTimes(1)
    // Con `push` la entrada con el token dentro se queda en el historial del
    // navegador para siempre, y «atrás» devuelve a ella. Eso es lo que esta
    // afirmación impide, y por eso mira las dos: que hubo `replace` y que NO
    // hubo `push`.
    expect(push).not.toHaveBeenCalled()

    const destino = elemento(elemento(replace.mock.calls, 0), 0, 'los argumentos del replace')
    expect(destino.name).toBe('planes')
    expect(destino.query).not.toHaveProperty('token')
    // Lo demás de la cadena de consulta sobrevive: solo el token se descarta.
    expect(destino.query.ciclo).toBe('ANUAL')
  })

  it('no marca como «Nuevo» nada: una relectura no es un recálculo', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({
      data: respuesta({ lines: [linea(), linea({ code: 'AGENDA', name: 'Agenda' })] }),
    } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    // Sin vaciarlo, `adoptar` compara contra un carrito anterior vacío y marca
    // como recién añadidas TODAS las líneas de la propuesta recuperada.
    expect(store.nuevos).toEqual([])
    expect(store.delta).toBeNull()
  })

  it('conserva el rótulo MANUAL de lo que este navegador añadió a mano', async () => {
    // El espejo que dejó la sesión anterior en ESTE navegador: el prospecto
    // había añadido «Agenda» desde el catálogo.
    window.localStorage.setItem(
      ASISTENTE_PROPUESTA_KEY,
      JSON.stringify({
        contador: 1,
        filas: [{ id: 'p-1', token: TOKEN, codigos: ['CORE', 'AGENDA'], manuales: ['AGENDA'] }],
      }),
    )
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({
      data: respuesta({ lines: [linea(), linea({ code: 'AGENDA', name: 'Agenda' })] }),
    } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    const agenda = store.lineas.find((l) => l.code === 'AGENDA')
    // Sin recuperar `manuales` de la sesión persistida, esta línea vuelve
    // rotulada `IA`: el prospecto vería como sugerido por el modelo lo que
    // había elegido él.
    expect(agenda?.origen).toBe('MANUAL')
  })
})

describe('llegar con un token caducado o desconocido', () => {
  it('lo cuenta como enlace agotado, no como avería del sistema', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockRejectedValue({ response: { status: 404 } })

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    // El servidor colapsa «no existe» y «caducó» en un 404 a propósito, para no
    // ser un oráculo de tokens. Para el usuario es una sola cosa, y no ha
    // fallado nada nuestro: el correo decía por escrito cuándo caducaba.
    expect(store.estado).toBe('ENLACE_CADUCADO')
    expect(store.propuesta).toBeNull()
    // Y no se le echa encima un aviso rojo de error del sistema.
    expect(errorFrom).not.toHaveBeenCalled()
  })

  it('limpia la barra igualmente: el token gastado tampoco puede quedarse', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockRejectedValue({ response: { status: 404 } })

    await useRecuperarPropuesta().recuperarDeEnlace()

    expect(replace).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('un enlace truncado por el cliente de correo no gasta una petición', async () => {
    // Los clientes de correo cortan y envuelven URLs largas. 42 caracteres no
    // pueden ser un token, así que el endpoint público no tiene por qué
    // enterarse — y para el usuario la frase es exactamente la misma.
    ruta.query = { token: 'a'.repeat(42) }

    await useRecuperarPropuesta().recuperarDeEnlace()

    expect(cliente.get).not.toHaveBeenCalled()
    expect(usePropuestaStore().estado).toBe('ENLACE_CADUCADO')
  })

  it('un 500 NO se disfraza de enlace caducado', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockRejectedValue({ response: { status: 500 } })

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    // Decir «caducó» sobre una propuesta que probablemente sigue viva manda al
    // prospecto a escribirlo todo otra vez sin motivo. La salida honesta es la
    // degradación, con el catálogo delante y la traza en el aviso.
    expect(store.estado).toBe('ASISTENTE_CAIDO')
    expect(errorFrom).toHaveBeenCalledTimes(1)
  })
})

describe('llegar SIN token', () => {
  it('no toca el estado, no navega y no gasta una petición', async () => {
    ruta.query = {}
    const store = usePropuestaStore()

    await useRecuperarPropuesta().recuperarDeEnlace()

    // Es la inmensa mayoría de las visitas a la landing, y además el segundo
    // paso de las que sí traen enlace: tras limpiar la barra, el panel monta y
    // vuelve a llamar aquí. Si esa segunda llamada tocara el estado, borraría
    // el `RECUPERANDO` que la primera acaba de poner.
    expect(store.estado).toBe('INICIAL')
    expect(cliente.get).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('un `?token=` vacío tampoco dispara nada', async () => {
    ruta.query = { token: '' }

    await useRecuperarPropuesta().recuperarDeEnlace()

    expect(usePropuestaStore().estado).toBe('INICIAL')
    expect(cliente.get).not.toHaveBeenCalled()
  })
})

describe('el discriminador de presentación se respeta al hidratar', () => {
  it('`NOT_UNDERSTOOD` lleva a la pantalla del punto de partida, no a «Tu propuesta»', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({
      data: respuesta({ presentation: 'NOT_UNDERSTOOD' }),
    } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    // Las dos mitades: hay carrito —es el determinista, y es útil— pero la
    // pantalla es otra. Pintarlo como `PROPUESTA_LISTA` enseñaría el carrito
    // bajo el encabezado «Tu propuesta» y sin el aviso «punto de partida, no
    // una recomendación», que es la pantalla equivocada.
    expect(store.estado).toBe('NO_ENTENDIDO')
    expect(store.lineas).toHaveLength(1)
  })

  it('`OUT_OF_DOMAIN` no enseña ni una línea de catálogo', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({
      data: respuesta({ presentation: 'OUT_OF_DOMAIN' }),
    } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    expect(store.estado).toBe('FUERA_DE_DOMINIO')
    expect(store.propuesta).toBeNull()
  })

  it('un 200 sin token —sin tarifa publicada— degrada, no pinta un carrito de cero', async () => {
    ruta.query = { token: TOKEN }
    cliente.get.mockResolvedValue({
      data: respuesta({ token: null, lines: [], subtotal: null, total: null }),
    } as never)

    await useRecuperarPropuesta().recuperarDeEnlace()

    const store = usePropuestaStore()
    expect(store.estado).toBe('ASISTENTE_CAIDO')
    expect(store.propuesta).toBeNull()
  })
})
