import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ASISTENTE_PROPUESTA_KEY } from '@/constants/storageKeys'
import type {
  AssistantProposalLineResponse,
  AssistantProposalResponse,
} from '@/features/asistente/types/asistente.types'

/**
 * LA SESIÓN DE LA PROPUESTA SOBREVIVE A UNA RECARGA.
 *
 * ── Por qué esto es una prueba y no un detalle ─────────────────────────────
 * El token de la propuesta vivía en un `Map` a nivel de módulo, y eso bastaba
 * mientras la propuesta solo se veía en `/planes`. Desde que puede convertirse
 * en una intención de contratación, entre generarla y confirmarla hay un
 * registro, una verificación por correo y **al menos una recarga completa de la
 * página**. Sin espejo, el `Map` vuelve vacío y la intención guardada apunta a un
 * identificador que ya no existe: el carrito perdido en silencio.
 *
 * <p>La recarga se simula con `vi.resetModules()`, que es exactamente el estado
 * que deja: el módulo vuelve a evaluarse desde cero —`Map` vacío, contador a
 * cero— y `localStorage` sigue donde estaba.
 *
 * <p>Lo que estas pruebas NO relajan: el token sigue viajando por `?token=` y
 * jamás en un segmento de ruta. Es la afirmación de la última prueba, y está
 * aquí porque el espejo nuevo es justo el sitio donde alguien podría decidir
 * «ya que lo guardamos, lo metemos en la URL».
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

/** El token real son 43 caracteres de base64url. Aquí importa la longitud. */
const TOKEN = 'b'.repeat(43)

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

/**
 * Carga el seam **recién evaluado**, con su cliente HTTP doblado.
 *
 * <p>Los dos `import` tienen que salir del mismo grafo: tras `resetModules` la
 * fábrica de `vi.mock` vuelve a correr y produce espías nuevos, así que un
 * `http` importado arriba del fichero apuntaría a los de la evaluación anterior
 * y las aserciones mirarían a un espía que ya nadie llama.
 */
async function cargarSeam() {
  const seam = await import('@/features/asistente/api/asistente.source')
  const { http } = await import('@/services/http/http.client')
  return { seam, http: vi.mocked(http) }
}

async function generarUna(): Promise<string> {
  const { seam, http } = await cargarSeam()
  http.post.mockResolvedValue({ data: respuesta() } as never)
  const resultado = await seam.generarPropuesta({
    email: 'ana@clinica.co',
    texto: 'Somos una clínica pequeña',
    aceptaciones: [],
    clientRequestId: 'k-1',
  })
  if (resultado.clase !== 'PROPUESTA') throw new Error('la fixture debería dar una propuesta')
  return resultado.propuesta.id
}

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
})

describe('el espejo de sesiones', () => {
  it('se escribe al generar, y lleva el identificador opaco junto al token', async () => {
    const id = await generarUna()

    const crudo = window.localStorage.getItem(ASISTENTE_PROPUESTA_KEY)
    expect(crudo).toBeTruthy()
    const leido = JSON.parse(crudo as string) as { filas: { id: string; token: string }[] }
    expect(leido.filas).toHaveLength(1)
    expect(leido.filas[0]?.id).toBe(id)
    expect(leido.filas[0]?.token).toBe(TOKEN)
  })

  it('tras una recarga el seam sigue conociendo la propuesta', async () => {
    const id = await generarUna()

    // La recarga: el módulo se reevalúa entero y el `Map` nace vacío.
    vi.resetModules()
    const { seam } = await cargarSeam()

    expect(seam.conocePropuesta(id)).toBe(true)
  })

  it('sin espejo, tras la recarga NO la conoce — y eso es lo que hay que decir', async () => {
    await generarUna()

    vi.resetModules()
    window.localStorage.clear()
    const { seam } = await cargarSeam()

    // Es el caso «otro dispositivo, u otro navegador». Se responde que no en vez
    // de fingir una sesión: el paso 6 lo traduce a una frase distinta de «no
    // pudimos cargar tu propuesta», porque la salida del usuario es distinta.
    expect(seam.conocePropuesta('p-1')).toBe(false)
  })

  it('releer tras la recarga manda el token por `?token=`, NUNCA en la ruta', async () => {
    const id = await generarUna()

    vi.resetModules()
    const { seam, http } = await cargarSeam()
    http.get.mockResolvedValue({ data: respuesta() } as never)

    await seam.releerPropuesta(id)

    expect(http.get).toHaveBeenCalledTimes(1)
    const [ruta, config] = http.get.mock.calls[0] as [string, { params?: { token?: string } }]
    // `getRequestURI()` no incluye la cadena de consulta, y es `getRequestURI()`
    // lo que el filtro de trazabilidad del backend escribe en el contexto de log
    // de TODA petición. Un token en la ruta acabaría intacto en CloudWatch y en
    // Loki con 31 días de retención, y en el `Referer` que el navegador manda a
    // terceros.
    expect(ruta).toBe('/assistant/proposal')
    expect(ruta).not.toContain(TOKEN)
    expect(config.params?.token).toBe(TOKEN)
  })

  it('lo que el usuario añadió a mano sigue rotulado MANUAL tras la recarga', async () => {
    const id = await generarUna()

    // Añade «Agenda» a mano: el `PUT` devuelve la propuesta con las dos líneas.
    {
      const { seam, http } = await cargarSeam()
      http.put.mockResolvedValue({
        data: respuesta({
          version: 2,
          lines: [linea(), linea({ code: 'AGENDA', name: 'Agenda' })],
        }),
      } as never)
      await seam.actualizarLineas({ propuestaId: id, version: 1, codigos: ['CORE', 'AGENDA'] })
    }

    vi.resetModules()
    const { seam, http } = await cargarSeam()
    http.get.mockResolvedValue({
      data: respuesta({ version: 2, lines: [linea(), linea({ code: 'AGENDA', name: 'Agenda' })] }),
    } as never)

    const resultado = await seam.releerPropuesta(id)
    if (resultado.clase !== 'PROPUESTA') throw new Error('debería seguir siendo una propuesta')

    // Sin persistir `manuales`, tras la recarga esta línea volvería rotulada
    // `IA`: el usuario vería como sugerido por el modelo lo que eligió él.
    const agenda = resultado.propuesta.lineas.find((l) => l.code === 'AGENDA')
    expect(agenda?.origen).toBe('MANUAL')
  })

  it('el contador no se reinicia: la propuesta siguiente no pisa a la guardada', async () => {
    const id = await generarUna()
    expect(id).toBe('p-1')

    vi.resetModules()
    const { seam, http } = await cargarSeam()
    // Otra propuesta, con OTRO token: tiene que recibir un identificador nuevo.
    http.post.mockResolvedValue({ data: respuesta({ token: 'c'.repeat(43) }) } as never)
    const otra = await seam.generarPropuesta({
      email: 'ana@clinica.co',
      texto: 'Otra cosa',
      aceptaciones: [],
      clientRequestId: 'k-2',
    })
    if (otra.clase !== 'PROPUESTA') throw new Error('debería dar una propuesta')

    // Si el contador volviera a cero, esta se llamaría `p-1` y sobrescribiría en
    // el `Map` a la que la intención guardada está apuntando: el prospecto
    // confirmaría un carrito que no es el suyo.
    expect(otra.propuesta.id).not.toBe(id)
    expect(seam.conocePropuesta(id)).toBe(true)
  })
})
