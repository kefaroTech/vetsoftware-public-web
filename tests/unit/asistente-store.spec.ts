import { beforeEach, describe, expect, it, vi } from 'vitest'
import { olvidarSesiones } from '@/features/asistente/api/asistente.source'
import {
  MIN_DESCRIPCION,
  MIN_REFINAMIENTO,
  RELLENOS_RAPIDOS,
} from '@/features/asistente/content/copy.content'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import type {
  AssistantProposalLineResponse,
  AssistantProposalResponse,
} from '@/features/asistente/types/asistente.types'
import { http } from '@/services/http/http.client'

/**
 * El estado de la propuesta a medida, **contra la red de verdad**.
 *
 * <p>Antes este fichero conducía un motor determinista en memoria que hacía de
 * servidor. Ese motor se borró con el corte del seam, así que aquí se conduce el
 * cliente HTTP: cada caso dice qué contesta el servidor y comprueba qué hace el
 * store con eso. La diferencia importa — probar contra un sustituto que uno
 * mismo escribió comprueba que el sustituto y el store están de acuerdo, no que
 * el store esté bien.
 *
 * <p>Las tres invariantes que este store existe para sostener siguen siendo las
 * de siempre: que no calcula precios, que las ediciones manuales del usuario son
 * soberanas, y que su texto no se pierde nunca.
 */

// `useToast().errorFrom` lee el `ProblemDetail` y el `X-Trace-Id` desde este
// mismo módulo, así que el doble tiene que traerlos: sin ellos, el primer
// `catch` del store revienta con un `TypeError` y la prueba culparía al store.
vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  getProblemDetailMessage: (_e: unknown, fallback = 'Error inesperado') => fallback,
  getTraceId: () => undefined,
}))

const post = vi.mocked(http.post)
const put = vi.mocked(http.put)

const TOKEN = 'z'.repeat(43)

const TEXTO_CLINICA =
  'Tengo una veterinaria en Chapinero, atiendo consultas y vacunas, y vendo concentrado y accesorios que le compro a proveedores.'

const ACEPTACIONES = [
  { code: 'PRIVACY_POLICY', documentVersion: 1 },
  { code: 'TERMS_OF_SERVICE', documentVersion: 1 },
]

function linea(
  code: string,
  over: Partial<AssistantProposalLineResponse> = {},
): AssistantProposalLineResponse {
  return {
    code,
    name: code,
    description: `Descripción de ${code}`,
    kind: 'MODULE',
    quantity: 1,
    unitAmount: 49000,
    taxRate: 0.19,
    taxAmount: 9310,
    totalAmount: 58310,
    trialDays: 14,
    currency: 'COP',
    reason: 'Porque atiendes consultas todos los días.',
    ...over,
  }
}

function respuesta(over: Partial<AssistantProposalResponse> = {}): AssistantProposalResponse {
  const lines = over.lines ?? [linea('CORE'), linea('SCHEDULING'), linea('INVENTORY')]
  const subtotal = lines.reduce((s, l) => s + (l.unitAmount ?? 0), 0)
  return {
    token: TOKEN,
    presentation: 'PROPOSAL',
    expiresAt: '2026-09-30T12:00:00',
    version: 1,
    recommendations: [],
    discardedLines: 0,
    currency: 'COP',
    subtotal,
    taxes: Math.round(subtotal * 0.19),
    total: subtotal + Math.round(subtotal * 0.19),
    firstPeriodTotal: 0,
    packOffer: null,
    refinementsLeft: 3,
    recalculated: true,
    ...over,
    lines,
  }
}

async function conPropuesta(cuerpo = respuesta()) {
  const store = usePropuestaStore()
  store.texto = TEXTO_CLINICA
  store.email = 'laura@vetchapinero.co'
  store.nuevaLlave()
  post.mockResolvedValueOnce({ data: cuerpo } as never)
  await store.generar(ACEPTACIONES)
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  olvidarSesiones()
})

describe('la generación', () => {
  it('deja la pantalla con propuesta y totales del servidor', async () => {
    const store = await conPropuesta()

    expect(store.estado).toBe('PROPUESTA_LISTA')
    expect(store.lineas.length).toBe(3)
    // El total no lo calcula el store: viene dentro de la propuesta, tal cual.
    expect(store.propuesta?.totales.total).toBe(147000 + Math.round(147000 * 0.19))
  })

  it('un negocio que no es del dominio no recibe ni una línea de catálogo', async () => {
    const store = usePropuestaStore()
    store.reiniciar()
    store.texto = 'Tengo una peluquería de señoras en el centro y hago tintes y peinados.'
    store.email = 'ana@peluqueria.co'
    store.nuevaLlave()
    post.mockResolvedValueOnce({
      data: respuesta({ presentation: 'OUT_OF_DOMAIN', token: null, lines: [] }),
    } as never)
    await store.generar(ACEPTACIONES)

    expect(store.estado).toBe('FUERA_DE_DOMINIO')
    // Ni un punto de partida. El error caro no es perder el lead —no era un
    // lead—, es venderle software veterinario a quien no tiene animales.
    expect(store.propuesta).toBeNull()
    // Y su texto sigue ahí: la pantalla lo deja editable por si nos explicamos mal.
    expect(store.texto).toContain('peluquería de señoras')
  })

  it('un texto que no se entiende deja un punto de partida rotulado como tal', async () => {
    const store = usePropuestaStore()
    store.reiniciar()
    store.texto = 'clinica veterinaria'
    store.email = 'x@y.co'
    store.nuevaLlave()
    post.mockResolvedValueOnce({
      data: respuesta({
        presentation: 'NOT_UNDERSTOOD',
        lines: [linea('CORE', { reason: null }), linea('CLINICAL_HISTORY', { reason: null })],
      }),
    } as never)
    await store.generar(ACEPTACIONES)

    expect(store.estado).toBe('NO_ENTENDIDO')
    // Son un punto de partida determinista, no una recomendación: no hay nada
    // que citar del cliente porque no se le entendió. El origen lo dice el
    // `presentation` del servidor, no una suposición de la pantalla.
    expect(store.lineas.every((l) => l.origen === 'BASE')).toBe(true)
  })

  it('el texto del usuario NO se pierde cuando la llamada falla', async () => {
    const store = usePropuestaStore()
    store.reiniciar()
    store.texto = TEXTO_CLINICA
    store.email = 'laura@vetchapinero.co'
    store.nuevaLlave()
    post.mockRejectedValueOnce(new Error('la red se cayó'))
    await store.generar(ACEPTACIONES)

    // Escribir un párrafo sobre tu propio negocio es la interacción más cara de
    // toda la landing; si un fallo lo borra, la sesión se acabó.
    expect(store.estado).toBe('ERROR_MODELO')
    expect(store.texto).toBe(TEXTO_CLINICA)
  })

  it('dos fallos seguidos degradan la pantalla en vez de pedir un tercer intento', async () => {
    const store = usePropuestaStore()
    store.reiniciar()
    store.texto = TEXTO_CLINICA
    store.email = 'laura@vetchapinero.co'
    store.nuevaLlave()
    post.mockRejectedValueOnce(new Error('uno'))
    await store.generar(ACEPTACIONES)
    post.mockRejectedValueOnce(new Error('dos'))
    await store.reintentar()

    // Un tercer intento manual sobre un asistente que ya falló dos veces gasta
    // seis segundos más del prospecto para llegar al mismo sitio. La
    // degradación le da el catálogo, que sí funciona.
    expect(store.estado).toBe('ASISTENTE_CAIDO')
  })
})

describe('la soberanía de las ediciones manuales', () => {
  it('lo que el usuario quita entra en el bloque de restauración aunque falle la red', async () => {
    const store = await conPropuesta()
    put.mockRejectedValueOnce(new Error('la red se cayó'))

    await store.quitar('INVENTORY')

    // Si el usuario quitó algo, esa afirmación suya sobre su propio negocio no
    // depende de que la red funcione.
    expect(store.retirados.map((r) => r.code)).toContain('INVENTORY')
  })

  it('volver a añadir algo retirado lo saca del bloque de restauración', async () => {
    const store = await conPropuesta()

    put.mockResolvedValueOnce({
      data: respuesta({ version: 2, lines: [linea('CORE'), linea('SCHEDULING')] }),
    } as never)
    await store.quitar('INVENTORY')
    expect(store.retirados.map((r) => r.code)).toContain('INVENTORY')

    put.mockResolvedValueOnce({
      data: respuesta({
        version: 3,
        lines: [linea('CORE'), linea('SCHEDULING'), linea('INVENTORY')],
      }),
    } as never)
    await store.anadir('INVENTORY')

    expect(store.codigosEnCarrito).toContain('INVENTORY')
    // Si no, la pantalla diría a la vez «lo tienes» y «no volvimos a añadirlo».
    expect(store.retirados.map((r) => r.code)).not.toContain('INVENTORY')
  })
})

describe('el precio siempre lo calcula el servidor', () => {
  it('quitar una línea adopta los totales NUEVOS y no resta nada en memoria', async () => {
    const store = await conPropuesta()
    const antes = store.propuesta?.totales.subtotal ?? 0

    // El servidor devuelve unos totales que NO son la resta del importe de la
    // línea. Si el store restara en memoria, este caso saldría en rojo — y esa
    // es exactamente su razón de ser.
    put.mockResolvedValueOnce({
      data: respuesta({
        version: 2,
        lines: [linea('CORE'), linea('SCHEDULING')],
        subtotal: 111111,
        taxes: 21111,
        total: 132222,
      }),
    } as never)
    await store.quitar('INVENTORY')

    expect(antes).toBe(147000)
    expect(store.propuesta?.totales.subtotal).toBe(111111)
    expect(store.propuesta?.totales.total).toBe(132222)
    expect(store.propuesta?.version).toBe(2)
  })

  it('añadir algo que ya está en el carrito no gasta una petición del límite de 30/h', async () => {
    const store = await conPropuesta()
    await store.anadir('CORE')

    // `CORE` ya está en el carrito: no hay delta que mandar y el `PUT`
    // devolvería exactamente lo que ya está en pantalla. El endpoint tiene un
    // límite de 30/h por IP y ese cupo es del usuario.
    expect(put).not.toHaveBeenCalled()
  })

  it('cambiar de ciclo NO repreciar la propuesta, y no la rotula de otro ciclo', async () => {
    const store = await conPropuesta()
    const antes = store.propuesta?.totales.subtotal

    store.cambiarCiclo('ANUAL')

    // El contrato del asistente no acepta ciclo: sus tres peticiones no lo
    // llevan y la respuesta cotiza en mensual. Empujar el carrito devolvería los
    // mismos importes gastando cupo, y rotularlos «al año» sería la mentira.
    expect(put).not.toHaveBeenCalled()
    expect(store.ciclo).toBe('ANUAL')
    expect(store.propuesta?.totales.subtotal).toBe(antes)
    expect(store.propuesta?.totales.ciclo).toBe('MENSUAL')
  })

  it('fijar sedes y personas se queda en el cliente, sin fingir un recálculo', async () => {
    const store = await conPropuesta()
    const antes = store.propuesta?.totales.total

    store.fijarCapacidades(3, 7)

    // No hay campo de capacidad en ninguna petición del contrato. Un `PUT` con
    // el mismo carrito fingiría que el número se tuvo en cuenta.
    expect(put).not.toHaveBeenCalled()
    expect(store.sedes).toBe(3)
    expect(store.usuarios).toBe(7)
    expect(store.propuesta?.totales.total).toBe(antes)
  })
})

describe('el refinamiento', () => {
  it('anuncia el delta cuando el servidor SÍ rehizo el carrito', async () => {
    const store = await conPropuesta()

    post.mockResolvedValueOnce({
      data: respuesta({
        version: 2,
        refinementsLeft: 2,
        recalculated: true,
        lines: [linea('CORE'), linea('SCHEDULING'), linea('INVENTORY'), linea('SURGERY')],
      }),
    } as never)
    await store.refinar('También hacemos cirugía de tejidos blandos')

    expect(store.estado).toBe('PROPUESTA_LISTA')
    expect(store.codigosEnCarrito).toContain('SURGERY')
    expect(store.delta).toEqual({ anadidos: 1, quitados: 0 })
  })

  it('el cuarto NO se anuncia como aplicado: llega 200 con recalculated=false', async () => {
    const store = await conPropuesta()
    const antes = store.codigosEnCarrito.slice()

    post.mockResolvedValueOnce({
      data: respuesta({ version: 1, refinementsLeft: 0, recalculated: false }),
    } as never)
    await store.refinar('Un ajuste más, por si acaso')

    // El servidor devuelve 200 con la propuesta intacta y nunca un 400: el
    // usuario no hizo nada mal. Sin mirar `recalculated`, la pantalla diría
    // «propuesta actualizada» sobre un carrito que no se movió.
    expect(store.estado).toBe('PROPUESTA_LISTA')
    expect(store.codigosEnCarrito).toEqual(antes)
    expect(store.delta).toBeNull()
  })
})

describe('los topes del formulario', () => {
  it('ningún relleno rápido mide menos que el mínimo del refinamiento', () => {
    // Un botón que la propia interfaz ofrece y el servidor rechaza es el peor
    // fallo que puede tener un formulario: el usuario hizo literalmente lo que
    // se le indicó, y el mensaje le habla de una longitud que él no eligió.
    for (const relleno of RELLENOS_RAPIDOS) {
      expect(relleno.length, relleno).toBeGreaterThanOrEqual(MIN_REFINAMIENTO)
    }
  })

  it('el mínimo del refinamiento es más bajo que el de la descripción', () => {
    // Un refinamiento es un añadido sobre una descripción que ya existe. Exigir
    // lo mismo que a la descripción inicial es pedir dos veces el mismo trabajo.
    expect(MIN_REFINAMIENTO).toBeLessThan(MIN_DESCRIPCION)
  })
})
