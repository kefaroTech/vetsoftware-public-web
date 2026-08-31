import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  actualizarLineas,
  desdeRespuesta,
  generarPropuesta,
  leerPropuesta,
  olvidarSesiones,
  refinarPropuesta,
} from '@/features/asistente/api/asistente.source'
import type {
  AssistantProposalLineResponse,
  AssistantProposalResponse,
} from '@/features/asistente/types/asistente.types'
import { http } from '@/services/http/http.client'
import { elemento } from '../helpers/exigir'

/**
 * EL SEAM DEL ASISTENTE, ya cortado a la red.
 *
 * <p>Aquí se prueban las dos mitades que el corte trajo: **la forma de lo que
 * sale por el cable** —dónde va el token, qué cabecera lleva la llave de
 * idempotencia, qué delta se calcula— y **la traducción de lo que entra**. La
 * segunda es la que más importa, porque el hueco entre el contrato y lo que este
 * front suponía resultó ser grande y cada hueco se cierra con un vacío honesto o
 * con un relleno inventado. Estas pruebas existen para que nadie lo cierre con
 * lo segundo.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)
const put = vi.mocked(http.put)

/** El token real son 43 caracteres de base64url. Aquí importa la longitud. */
const TOKEN = 'a'.repeat(43)

function linea(over: Partial<AssistantProposalLineResponse> = {}): AssistantProposalLineResponse {
  return {
    code: 'CORE',
    name: 'Núcleo',
    description: 'Lo mínimo de toda cuenta',
    kind: 'MODULE',
    quantity: 1,
    unitAmount: 39000,
    taxRate: 0.19,
    taxAmount: 7410,
    totalAmount: 46410,
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
    subtotal: 39000,
    taxes: 7410,
    total: 46410,
    firstPeriodTotal: 0,
    packOffer: null,
    refinementsLeft: 3,
    recalculated: true,
    ...over,
  }
}

/** Deja el seam con una propuesta viva y devuelve su identificador de cliente. */
async function conPropuestaViva(cuerpo = respuesta()): Promise<string> {
  post.mockResolvedValueOnce({ data: cuerpo } as never)
  const resultado = await generarPropuesta({
    email: 'laura@vetchapinero.co',
    texto: 'Tengo una veterinaria en Chapinero y atiendo consultas y vacunas.',
    aceptaciones: [{ code: 'PRIVACY_POLICY', documentVersion: 1 }],
    clientRequestId: 'llave-1',
  })
  if (resultado.clase !== 'PROPUESTA') throw new Error('se esperaba una propuesta')
  return resultado.propuesta.id
}

beforeEach(() => {
  vi.clearAllMocks()
  olvidarSesiones()
})

describe('el token no acaba nunca en la ruta', () => {
  it('el GET lo manda como parámetro de consulta y no como segmento', async () => {
    get.mockResolvedValueOnce({ data: respuesta() } as never)
    await leerPropuesta(TOKEN)

    const [url, config] = elemento(get.mock.calls, 0, 'get.mock.calls')
    // Si el token fuera un segmento, `getRequestURI()` lo metería en el contexto
    // de log de TODA petición y ningún patrón del redactor casa con 43
    // caracteres de base64url: acabaría en claro en CloudWatch, en Loki con 31
    // días de retención y en el `Referer` que el navegador manda a terceros.
    expect(url).toBe('/assistant/proposal')
    expect(url).not.toContain(TOKEN)
    expect(config?.params).toEqual({ token: TOKEN })
  })

  it('el refinamiento y la edición lo mandan en el CUERPO, nunca en la ruta', async () => {
    const id = await conPropuestaViva()

    post.mockResolvedValueOnce({ data: respuesta({ version: 2 }) } as never)
    await refinarPropuesta({ propuestaId: id, version: 1, texto: 'También hacemos cirugía' })

    const [urlRefine, cuerpoRefine] = elemento(post.mock.calls, 1, 'post.mock.calls')
    expect(urlRefine).toBe('/assistant/proposal/refine')
    expect(urlRefine).not.toContain(TOKEN)
    expect(cuerpoRefine).toMatchObject({ token: TOKEN, text: 'También hacemos cirugía' })

    put.mockResolvedValueOnce({ data: respuesta({ version: 3 }) } as never)
    await actualizarLineas({ propuestaId: id, version: 2, codigos: ['CORE'] })

    const [urlLines, cuerpoLines] = elemento(put.mock.calls, 0, 'put.mock.calls')
    expect(urlLines).toBe('/assistant/proposal/lines')
    expect(urlLines).not.toContain(TOKEN)
    expect(cuerpoLines).toMatchObject({ token: TOKEN })
  })

  it('el token no sale del seam: la propuesta que ven los stores no lo lleva', async () => {
    post.mockResolvedValueOnce({ data: respuesta() } as never)
    const resultado = await generarPropuesta({
      email: 'a@b.co',
      texto: 'Una veterinaria pequeña en Bogotá con consulta general.',
      aceptaciones: [],
      clientRequestId: 'k',
    })
    if (resultado.clase !== 'PROPUESTA') throw new Error('se esperaba una propuesta')

    // Lo que se guarda en Pinia se ve entero en las devtools y se serializa con
    // cualquier volcado de estado. El identificador que sale es opaco y no
    // acredita nada.
    expect(JSON.stringify(resultado.propuesta)).not.toContain(TOKEN)
    expect(resultado.propuesta.id).not.toBe(TOKEN)
  })
})

describe('la petición inicial', () => {
  it('manda la llave de idempotencia en la CABECERA y no en el cuerpo', async () => {
    post.mockResolvedValueOnce({ data: respuesta() } as never)
    await generarPropuesta({
      email: 'laura@vetchapinero.co',
      texto: 'Veterinaria de barrio con consulta, vacunación y venta de concentrado.',
      aceptaciones: [{ code: 'PRIVACY_POLICY', documentVersion: 2 }],
      clientRequestId: 'llave-abc',
    })

    const [url, cuerpo, config] = elemento(post.mock.calls, 0, 'post.mock.calls')
    expect(url).toBe('/assistant/proposal')
    // Es metadato de transporte —«esta petición es la misma que la anterior»—
    // y no un dato de la propuesta. Sin ella, un doble clic paga dos
    // invocaciones al modelo y crea dos propuestas que consumen cupo.
    expect(config?.headers).toEqual({ 'Idempotency-Key': 'llave-abc' })
    expect(cuerpo).not.toHaveProperty('clientRequestId')
    expect(cuerpo).toEqual({
      email: 'laura@vetchapinero.co',
      description: 'Veterinaria de barrio con consulta, vacunación y venta de concentrado.',
      acceptances: [{ code: 'PRIVACY_POLICY', documentVersion: 2 }],
    })
  })

  it('las tres llamadas se saltan el velo global', async () => {
    const id = await conPropuestaViva()
    post.mockResolvedValueOnce({ data: respuesta() } as never)
    await refinarPropuesta({ propuestaId: id, version: 1, texto: 'Añadimos peluquería canina' })
    put.mockResolvedValueOnce({ data: respuesta() } as never)
    await actualizarLineas({ propuestaId: id, version: 1, codigos: ['CORE'] })

    // El `PageLoader` es un overlay `inset: 0` con `cursor: wait`. Seis segundos
    // de eso sobre la pantalla que decide una compra son seis segundos sin poder
    // releer, corregir ni cancelar.
    expect(elemento(post.mock.calls, 0, 'post.mock.calls')[2]?.skipGlobalLoader).toBe(true)
    expect(elemento(post.mock.calls, 1, 'post.mock.calls')[2]?.skipGlobalLoader).toBe(true)
    expect(elemento(put.mock.calls, 0, 'put.mock.calls')[2]?.skipGlobalLoader).toBe(true)
  })
})

describe('el desenlace lo dice el servidor, no una lista vacía', () => {
  it('OUT_OF_DOMAIN no trae ni una línea de catálogo', async () => {
    post.mockResolvedValueOnce({
      data: respuesta({ presentation: 'OUT_OF_DOMAIN', lines: [], token: null }),
    } as never)
    const resultado = await generarPropuesta({
      email: 'ana@peluqueria.co',
      texto: 'Tengo una peluquería de señoras en el centro y hago tintes y peinados.',
      aceptaciones: [],
      clientRequestId: 'k',
    })

    // El error caro no es perder el lead —no era un lead—, es venderle software
    // veterinario a quien no tiene animales.
    expect(resultado).toEqual({ clase: 'FUERA_DE_DOMINIO' })
  })

  it('NOT_UNDERSTOOD y OUT_OF_DOMAIN son dos desenlaces y no un matiz del mismo', async () => {
    post.mockResolvedValueOnce({
      data: respuesta({ presentation: 'NOT_UNDERSTOOD' }),
    } as never)
    const resultado = await generarPropuesta({
      email: 'x@y.co',
      texto: 'clinica veterinaria y algo mas por aqui',
      aceptaciones: [],
      clientRequestId: 'k',
    })

    // En el primero reescribir sirve y se le pide; en el segundo se entendió
    // perfectamente y reescribir NO sirve. Confundirlos es ofrecerle historia
    // clínica veterinaria a una peluquería.
    expect(resultado.clase).toBe('NO_ENTENDIDO')
  })

  it('DETERMINISTIC es una propuesta correcta y no un fallo', async () => {
    post.mockResolvedValueOnce({ data: respuesta({ presentation: 'DETERMINISTIC' }) } as never)
    const resultado = await generarPropuesta({
      email: 'x@y.co',
      texto: 'Una veterinaria con consulta general y vacunación al día.',
      aceptaciones: [],
      clientRequestId: 'k',
    })

    // Las tres degradaciones internas del servidor colapsan aquí a propósito
    // —distinguirlas diría cuándo se agotó el presupuesto diario— pero el
    // carrito determinista SÍ es una propuesta: núcleo, cierre de dependencias
    // y precio por tramos. Tratarlo como caída dejaría al prospecto sin nada.
    expect(resultado.clase).toBe('PROPUESTA')
    if (resultado.clase !== 'PROPUESTA') throw new Error('inalcanzable')
    // Y sus líneas van rotuladas como lo que son: nadie leyó el texto.
    expect(resultado.propuesta.lineas.every((l) => l.origen === 'BASE')).toBe(true)
  })

  it('sin token no hay propuesta: es «no hay tarifa publicada», no un carrito de cero', async () => {
    // `ProposalViewDto.sinCatalogo()` responde 200 con todo a `null` y es un
    // estado NORMAL del catálogo. Pintarlo como propuesta enseñaría un carrito
    // vacío de 0 pesos en la pantalla de compra.
    //
    // La presentación es `NO_CATALOG` porque es la que manda el servidor para
    // ESTE cuerpo. La fixture decía `DETERMINISTIC` y describía un mundo que ya
    // no existe; el caso seguía verde igualmente porque lo que decide es el
    // token, y por eso hay debajo un segundo caso que sí ata el rótulo nuevo.
    post.mockResolvedValueOnce({
      data: respuesta({
        token: null,
        presentation: 'NO_CATALOG',
        lines: [],
        subtotal: null,
        total: null,
        taxes: null,
        version: null,
      }),
    } as never)
    const resultado = await generarPropuesta({
      email: 'x@y.co',
      texto: 'Una veterinaria con consulta general y vacunación al día.',
      aceptaciones: [],
      clientRequestId: 'k',
    })

    expect(resultado).toEqual({ clase: 'NO_DISPONIBLE' })
  })

  it('NO_CATALOG con token tampoco se pinta como propuesta, y sin rama propia', async () => {
    // El rótulo nuevo del backend. Hoy llega SIEMPRE con el token a `null`, así
    // que la guarda de arriba lo atrapa antes de mirar la presentación; este
    // caso fuerza el token para comprobar el OTRO camino —el `return` por
    // defecto del final— y así deja atado que ampliar la unión de literales no
    // abrió ningún camino hacia «propuesta». Si alguien añadiera `NO_CATALOG` a
    // la comparación de `PROPOSAL`/`DETERMINISTIC`, esto se pone rojo.
    post.mockResolvedValueOnce({
      data: respuesta({ presentation: 'NO_CATALOG' }),
    } as never)
    const conToken = await generarPropuesta({
      email: 'x@y.co',
      texto: 'Una veterinaria con consulta general y vacunación al día.',
      aceptaciones: [],
      clientRequestId: 'k',
    })

    expect(conToken).toEqual({ clase: 'NO_DISPONIBLE' })
  })

  it('un valor de presentación desconocido NO se pinta como propuesta', async () => {
    // La atadura al contrato acepta un tipo local más estrecho sin comprobarlo,
    // así que un valor nuevo del backend llega aquí sin romper el build — le
    // acaba de pasar a `NO_CATALOG`. El literal de abajo es deliberadamente
    // impronunciable como valor de negocio: `ALGO_NUEVO` se leía como el
    // siguiente rótulo plausible del enum, y el día que el backend publique uno
    // que se le parezca este caso dejaría de probar lo que dice su nombre.
    post.mockResolvedValueOnce({
      data: respuesta({ presentation: '__NINGUN_VALOR_DEL_CONTRATO__' as never }),
    } as never)
    const resultado = await generarPropuesta({
      email: 'x@y.co',
      texto: 'Una veterinaria con consulta general y vacunación al día.',
      aceptaciones: [],
      clientRequestId: 'k',
    })

    expect(resultado).toEqual({ clase: 'NO_DISPONIBLE' })
  })
})

describe('la traducción no inventa lo que el contrato no trae', () => {
  it('la CLASE de la línea viaja tal cual: una capacidad no se pierde por el camino', () => {
    // `AssistantProposalLineResponse.kind` (`SellableItemKind`: MODULE,
    // CAPACITY, BUNDLE, ONE_TIME) llevaba en el contrato desde el principio y
    // este seam lo estaba tirando. Sin él, una capacidad cotizada —«3 personas
    // adicionales», que se COBRA— se pinta con la misma fila y la misma letra
    // que un módulo, tanto en el panel como en la tabla del paso vinculante:
    // dinero dentro del total que nada distingue de una funcionalidad.
    const propuesta = desdeRespuesta(
      respuesta({
        lines: [
          linea({ code: 'CORE', kind: 'MODULE' }),
          linea({ code: 'EXTRA_USER', kind: 'CAPACITY', quantity: 3 }),
        ],
      }),
      new Set(),
    )

    expect(elemento(propuesta.lineas, 0, 'propuesta.lineas').tipo).toBe('MODULE')
    expect(elemento(propuesta.lineas, 1, 'propuesta.lineas').tipo).toBe('CAPACITY')
  })

  it('un `kind` que el contrato no declara llega tal cual, sin aplanarse', () => {
    // `kind` es `string` y no una unión cerrada a propósito: estrecharlo aquí
    // escondería un valor nuevo del backend detrás de un tipo que miente. Quien
    // lo consuma compara contra el literal que le interesa; lo demás es «otra
    // cosa», y sigue siendo legible en las trazas.
    const propuesta = desdeRespuesta(respuesta({ lines: [linea({ kind: 'ONE_TIME' })] }), new Set())

    expect(elemento(propuesta.lineas, 0, 'propuesta.lineas').tipo).toBe('ONE_TIME')
  })

  it('el importe de una línea es el UNITARIO y no el total con impuesto', () => {
    const propuesta = desdeRespuesta(
      respuesta({ lines: [linea({ unitAmount: 49000, taxAmount: 9310, totalAmount: 58310 })] }),
      new Set(),
    )

    // `totalAmount` es `totalConImpuesto`. Pintarlo al lado de un subtotal sin
    // impuesto mezclaría dos bases en la misma tabla, y restar `taxAmount` para
    // sacar el neto sería aritmética de dinero en el cliente.
    expect(elemento(propuesta.lineas, 0, 'propuesta.lineas').importe).toBe(49000)
  })

  it('«sin prueba» llega como null y nunca como cero', () => {
    const propuesta = desdeRespuesta(
      respuesta({
        lines: [linea({ code: 'A', trialDays: 0 }), linea({ code: 'B', trialDays: 14 })],
      }),
      new Set(),
    )

    // Un cero de relleno haría que la pantalla escribiera «0 días gratis» donde
    // la verdad es «sin prueba», y esa diferencia es la mitad de la comparación
    // con el paquete.
    expect(elemento(propuesta.lineas, 0, 'propuesta.lineas').trialDays).toBeNull()
    expect(elemento(propuesta.lineas, 1, 'propuesta.lineas').trialDays).toBe(14)
  })

  it('el tipo impositivo queda a null porque el contrato no lo publica', () => {
    const propuesta = desdeRespuesta(respuesta(), new Set())

    // El único `taxRate` del contrato es por línea y no declara su escala: un
    // `BigDecimal` que puede valer 0,19 o 19. Deducir de ahí un «IVA 19 %» es
    // equivocarse por un factor de cien en la pantalla que decide una compra.
    expect(propuesta.totales.tasaImpuesto).toBeNull()
    // El importe del impuesto sí es del servidor y sí se enseña.
    expect(propuesta.totales.impuesto).toBe(7410)
  })

  it('los importes se rotulan MENSUAL, que es como los calculó el servidor', () => {
    const propuesta = desdeRespuesta(respuesta(), new Set())

    // Ninguna de las tres peticiones lleva ciclo, y `firstPeriodTotal` y
    // `monthlySaving` delatan en qué cotiza el servidor. Rotular «al año» unos
    // importes mensuales porque el conmutador esté en anual es la mentira que
    // este seam existe para no contar.
    expect(propuesta.totales.ciclo).toBe('MENSUAL')
  })

  it('las capacidades llegan vacías porque no hay bloque en la respuesta', () => {
    const propuesta = desdeRespuesta(respuesta(), new Set())
    expect(propuesta.capacidades).toEqual([])
  })

  it('el primer periodo distingue el cero legítimo del ausente', () => {
    // `0` significa «todo el carrito está de prueba y el primer mes no se paga
    // nada», que es justamente la afirmación que hace atractiva la propuesta.
    // Aplanarlo con `null` la borraría.
    expect(desdeRespuesta(respuesta({ firstPeriodTotal: 0 }), new Set()).totales.primerMes).toBe(0)
    expect(
      desdeRespuesta(respuesta({ firstPeriodTotal: null }), new Set()).totales.primerMes,
    ).toBeNull()
  })
})

describe('la comparación con el paquete lleva las dos dimensiones', () => {
  const conOferta = respuesta({
    lines: [
      linea({ code: 'CASH_REGISTER', name: 'Caja', trialDays: 14 }),
      linea({ code: 'SCHEDULING', name: 'Agenda', trialDays: 30 }),
    ],
    packOffer: {
      packCode: 'PACK_CLINICA',
      packName: 'Paquete Clínica',
      packAmount: 120000,
      standaloneTotal: 149000,
      monthlySaving: 29000,
      currency: 'COP',
      // ⚠️ 44 y no 30, a propósito. Las líneas dan 14 y 30, así que con un 30
      // aquí una implementación que calculara el MÁXIMO de las líneas pasaría en
      // verde y este caso no probaría nada. Es la misma torsión que el precio
      // anual del catálogo: si el valor correcto coincide con el que produce la
      // regla equivocada, el caso es decorativo.
      trialDaysLost: 44,
      modulesLosingTrial: ['CASH_REGISTER', 'SCHEDULING'],
    },
  })

  it('los días perdidos son el agregado del SERVIDOR, no un máximo calculado aquí', () => {
    const propuesta = desdeRespuesta(conOferta, new Set())

    // Es la cifra que sostiene el aviso que impide que la tarjeta sea un patrón
    // oscuro: enseñar solo el ahorro es el patrón oscuro. Derivarla en cliente
    // la dejaría en manos de una regla local que ni sabe si el servidor agrega
    // por máximo o por suma.
    expect(propuesta.oferta?.diasDePruebaPerdidos).toBe(44)
    expect(propuesta.oferta?.ahorro).toBe(29000)
    expect(propuesta.oferta?.importePaquete).toBe(120000)
    expect(propuesta.oferta?.importeActual).toBe(149000)
  })

  it('los nombres de los módulos que pierden prueba salen del propio carrito', () => {
    const propuesta = desdeRespuesta(conOferta, new Set())

    // `modulesLosingTrial` son códigos pelados. Un nombre inventado bajo un
    // aviso de pérdida es peor que el código; el carrito ya trae los buenos.
    expect(propuesta.oferta?.pruebasQuePierde).toEqual([
      { code: 'CASH_REGISTER', nombre: 'Caja' },
      { code: 'SCHEDULING', nombre: 'Agenda' },
    ])
  })

  it('«además te llevarías X» no se pinta, porque el contrato no dice qué se gana', () => {
    const propuesta = desdeRespuesta(conOferta, new Set())
    expect(propuesta.oferta?.modulosExtra).toEqual([])
  })

  it('sin oferta el bloque no existe: no se fabrica una comparación', () => {
    expect(desdeRespuesta(respuesta({ packOffer: null }), new Set()).oferta).toBeNull()
  })
})

describe('la edición manual manda un DELTA, que es lo que el contrato quiere', () => {
  it('calcula lo añadido y lo quitado contra lo último que devolvió el servidor', async () => {
    const id = await conPropuestaViva(
      respuesta({
        lines: [
          linea({ code: 'CORE' }),
          linea({ code: 'SCHEDULING' }),
          linea({ code: 'INVENTORY' }),
        ],
      }),
    )

    put.mockResolvedValueOnce({ data: respuesta({ version: 2 }) } as never)
    await actualizarLineas({
      propuestaId: id,
      version: 1,
      codigos: ['CORE', 'SCHEDULING', 'SURGERY'],
    })

    // El store piensa en carrito completo —no puede razonar sobre deltas de un
    // estado que otra pestaña pudo mover— y el seam traduce. La `version` es lo
    // que hace que el delta se pueda aplicar sin adivinar.
    expect(elemento(put.mock.calls, 0, 'put.mock.calls')[1]).toEqual({
      token: TOKEN,
      addedCodes: ['SURGERY'],
      removedCodes: ['INVENTORY'],
      version: 1,
    })
  })

  it('lo añadido a mano queda marcado MANUAL y sobrevive al refinamiento siguiente', async () => {
    const id = await conPropuestaViva(respuesta({ lines: [linea({ code: 'CORE' })] }))

    put.mockResolvedValueOnce({
      data: respuesta({
        version: 2,
        lines: [linea({ code: 'CORE' }), linea({ code: 'SURGERY', name: 'Cirugía' })],
      }),
    } as never)
    const conCirugia = await actualizarLineas({
      propuestaId: id,
      version: 1,
      codigos: ['CORE', 'SURGERY'],
    })

    // `MANUAL` no viaja por el contrato —la línea no trae origen, y es
    // deliberado— así que es un hecho local: lo sabe el cliente porque lo pidió
    // él. Y nunca lleva motivo generado: no hay nada que explicarle a alguien
    // sobre su propia decisión.
    const cirugia = conCirugia.lineas.find((l) => l.code === 'SURGERY')
    expect(cirugia?.origen).toBe('MANUAL')
    expect(conCirugia.lineas.find((l) => l.code === 'CORE')?.origen).toBe('IA')

    post.mockResolvedValueOnce({
      data: respuesta({
        version: 3,
        lines: [linea({ code: 'CORE' }), linea({ code: 'SURGERY', name: 'Cirugía' })],
      }),
    } as never)
    const tras = await refinarPropuesta({
      propuestaId: conCirugia.id,
      version: 2,
      texto: 'También vendemos alimento',
    })
    if (tras.clase !== 'PROPUESTA') throw new Error('se esperaba una propuesta')
    expect(tras.propuesta.lineas.find((l) => l.code === 'SURGERY')?.origen).toBe('MANUAL')
  })

  it('sin sesión no se manda una petición sin credencial', async () => {
    // Se falla ruidosamente en vez de mandar un cuerpo sin token y dejar que el
    // servidor conteste con un error que la pantalla traduciría como «falló el
    // asistente».
    await expect(
      actualizarLineas({ propuestaId: 'p-inexistente', version: 1, codigos: [] }),
    ).rejects.toThrow(/No hay token/)
    expect(put).not.toHaveBeenCalled()
  })
})

describe('el cuarto refinamiento', () => {
  it('llega como 200 con recalculated=false y el seam lo transmite', async () => {
    const id = await conPropuestaViva()

    post.mockResolvedValueOnce({
      data: respuesta({ refinementsLeft: 0, recalculated: false }),
    } as never)
    const resultado = await refinarPropuesta({
      propuestaId: id,
      version: 1,
      texto: 'Un ajuste más, por si acaso',
    })

    if (resultado.clase !== 'PROPUESTA') throw new Error('se esperaba una propuesta')
    // Sin este campo la pantalla no puede distinguir «tu ajuste se aplicó y no
    // cambió nada» de «tu ajuste no se aplicó», y anunciaría un éxito que no
    // hubo.
    expect(resultado.propuesta.recalculado).toBe(false)
    expect(resultado.propuesta.ajustesRestantes).toBe(0)
  })
})
