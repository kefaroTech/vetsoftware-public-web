import { ASISTENTE_PROPUESTA_KEY } from '@/constants/storageKeys'
import { http } from '@/services/http/http.client'
import type {
  ActualizarLineasArgs,
  AssistantPackOfferResponse,
  AssistantProposalLineResponse,
  AssistantProposalResponse,
  EditProposalLinesRequest,
  GenerarArgs,
  GenerateProposalRequest,
  LineaRecomendada,
  OfertaPaquete,
  OrigenLinea,
  Propuesta,
  PropuestaLinea,
  PruebaPerdida,
  RefinarArgs,
  RefineProposalRequest,
  ResultadoAsistente,
} from '../types/asistente.types'

/**
 * EL SEAM DEL ASISTENTE, ya cortado a la red.
 *
 * Es el único módulo de todo el front que sabe de dónde sale una propuesta.
 * Ningún componente, store ni composable importa nada de aquí que no sean estas
 * cuatro funciones, y por eso el corte del sustituto a
 * `POST /assistant/proposal` no movió ni un componente.
 *
 * ── ⚠️ EL TOKEN NO SALE DE ESTE FICHERO ─────────────────────────────────────
 * La credencial de la propuesta son 43 caracteres de `SecureRandom` y viaja de
 * dos formas, **nunca en un segmento de ruta**: `?token=` en el `GET` y dentro
 * del cuerpo en el `POST` y el `PUT`. El motivo está escrito en el backend y no
 * es teórico: `RequestLoggingContextFilter` mete `getRequestURI()` en el
 * contexto de log de *toda* petición —«incluidas las públicas», dice su
 * javadoc—, ningún patrón del redactor casa con 43 caracteres de base64url
 * sueltos, y `getRequestURI()` no incluye la cadena de consulta. Un token en la
 * ruta acabaría intacto en CloudWatch y en Loki con 31 días de retención, y de
 * paso en el `Referer` que el navegador manda a terceros: una credencial
 * funcionando para cualquiera con acceso a los logs.
 *
 * <p>Por el mismo motivo **no entra en ningún store de Pinia**: lo que hay en un
 * store se ve entero en las devtools y se serializa con cualquier volcado de
 * estado. Vive en {@link sesiones}, aquí dentro, y hacia fuera solo sale un
 * identificador opaco de cliente ({@link Propuesta.id}) que no acredita nada.
 *
 * ── El registro de sesiones y por qué NO es el patrón híbrido prohibido ─────
 * {@link sesiones} es un `Map` a nivel de módulo. La regla dura del proyecto
 * prohíbe el `ref()`/`reactive()` singleton de módulo dentro de un composable, y
 * esto no es ninguna de las dos cosas: no es reactivo —ninguna pantalla se
 * repinta por su culpa, y meterlo en Pinia obligaría a envolver una credencial
 * en un proxy observable—, no vive en un composable, y ningún componente lo lee.
 * Es infraestructura del cliente HTTP, del mismo orden que el mapa `inFlight`
 * del store del catálogo.
 *
 * ── Lo que el contrato NO trae, y aquí no se inventa ────────────────────────
 * El hueco entre el contrato y lo que este front había supuesto resultó ser
 * grande, y está documentado campo a campo en {@link desdeRespuesta}. En una
 * línea: no hay ciclo, no hay capacidades, no hay tipo impositivo, no hay origen
 * de línea y la edición de líneas es un **delta** y no el carrito entero. Donde
 * falta el dato se devuelve el vacío y **nunca un relleno**: un `0` inventado en
 * la pantalla que decide una compra es peor que un bloque que no se pinta.
 */

/** El estado que este seam guarda de una propuesta viva. Nunca sale de aquí. */
interface SesionPropuesta {
  /** La credencial de 43 caracteres. */
  token: string
  /** Los códigos que el servidor devolvió la última vez, para calcular el delta. */
  codigos: string[]
  /** Lo que el usuario añadió a mano en esta sesión. Es el origen de `MANUAL`. */
  manuales: Set<string>
}

/**
 * Las propuestas vivas de esta pestaña, por identificador opaco.
 *
 * <p>No se poda: una pestaña de la landing no acumula propuestas —hay tres
 * refinamientos por propuesta y el token expira en el servidor—, y un `Map` con
 * un puñado de entradas que muere con la pestaña no es una fuga.
 */
const sesiones = new Map<string, SesionPropuesta>()

/** `token → id`, para que un refinamiento del mismo token conserve su identidad. */
const idPorToken = new Map<string, string>()

let contador = 0

/**
 * ── EL ESPEJO EN ALMACENAMIENTO, y por qué existe ───────────────────────────
 *
 * El `Map` de arriba muere con la pestaña. Mientras la propuesta solo se veía en
 * `/planes` eso bastaba; desde que una propuesta puede convertirse en una
 * intención de contratación, deja de bastar: entre generarla y confirmarla hay
 * un registro, una verificación por correo y al menos una recarga completa de la
 * página. Sin espejo, quien pulsa «Continuar con esta propuesta» llega al paso 6
 * con una intención que apunta a un identificador que ya no existe — el carrito
 * perdido en silencio que el aviso del panel existía para no prometer.
 *
 * <p>Lo que se persiste es **exactamente lo que hay en el `Map`**, y por tanto
 * el token. No hay alternativa honesta: la propuesta se relee con
 * `GET /assistant/proposal?token=…` y el servidor no publica ningún otro
 * identificador. Guardar el carrito en su lugar sería peor —dos verdades sobre
 * los mismos importes, y la del cliente envejeciendo—; la regla de que **el
 * servidor es la fuente de verdad de las líneas y los totales** se sostiene
 * precisamente porque aquí solo se guarda con qué volver a preguntárselo.
 *
 * <p>La exposición es la misma que ya acepta el repositorio para la credencial
 * de sesión (`AUTH_STORAGE_KEY`, en este mismo `localStorage`): mismo origen,
 * mismo alcance de un XSS. Lo que sigue prohibido es lo de la cabecera —el token
 * en un segmento de ruta, y el token dentro de un store de Pinia—, y las dos
 * siguen sin ocurrir: el espejo lo escribe y lo lee este fichero, y hacia fuera
 * sigue saliendo solo el identificador opaco.
 */
interface SesionSerializada {
  id: string
  token: string
  codigos: string[]
  manuales: string[]
}

let hidratado = false

/** Escribir puede lanzar (modo privado, cuota llena): eso no puede tumbar el asistente. */
function persistirSesiones(): void {
  try {
    const filas: SesionSerializada[] = [...sesiones.entries()].map(([id, s]) => ({
      id,
      token: s.token,
      codigos: s.codigos,
      manuales: [...s.manuales],
    }))
    window.localStorage.setItem(ASISTENTE_PROPUESTA_KEY, JSON.stringify({ contador, filas }))
  } catch {
    // Se pierde la reanudación tras recargar, no la propuesta de esta pestaña.
  }
}

/**
 * Lee el espejo una sola vez por vida del módulo.
 *
 * <p>El {@link contador} se restaura al máximo leído, y no a cero: si volviera a
 * empezar, la propuesta siguiente de esta pestaña se llamaría `p-1` y pisaría en
 * el `Map` a la que la intención guardada está apuntando. Una entrada corrupta
 * se descarta entera —sin token no hay nada que releer— en vez de resucitar una
 * sesión a medias.
 */
function hidratarSesiones(): void {
  if (hidratado) return
  hidratado = true
  try {
    const crudo = window.localStorage.getItem(ASISTENTE_PROPUESTA_KEY)
    if (!crudo) return
    const leido = JSON.parse(crudo) as { contador?: unknown; filas?: unknown }
    const filas = Array.isArray(leido.filas) ? (leido.filas as SesionSerializada[]) : []
    for (const fila of filas) {
      if (typeof fila?.id !== 'string' || typeof fila?.token !== 'string' || !fila.token) continue
      sesiones.set(fila.id, {
        token: fila.token,
        codigos: Array.isArray(fila.codigos) ? fila.codigos : [],
        manuales: new Set(Array.isArray(fila.manuales) ? fila.manuales : []),
      })
      idPorToken.set(fila.token, fila.id)
    }
    contador = Number.isFinite(leido.contador)
      ? Math.max(contador, Number(leido.contador))
      : contador
  } catch {
    // Espejo ilegible: se sigue sin él. El asistente funciona, lo que se pierde
    // es poder retomar una propuesta anterior a la recarga.
  }
}

/**
 * Un identificador de cliente **que no es el token**.
 *
 * <p>Existe porque el contrato no publica ningún identificador de propuesta que
 * no sea la credencial —`proposal.id` es interno del servidor— y el store
 * necesita nombrar la propuesta que está editando sin sostener el secreto.
 */
function nuevoId(): string {
  contador += 1
  return `p-${contador}`
}

function abortadoAntesDeEmpezar(signal?: AbortSignal): Error | null {
  if (!signal?.aborted) return null
  return signal.reason instanceof Error ? signal.reason : new Error('cancelado')
}

/** La sesión de una propuesta, o el error de haberla perdido. */
function sesionDe(propuestaId: string): SesionPropuesta {
  hidratarSesiones()
  const sesion = sesiones.get(propuestaId)
  if (!sesion) {
    // Sin token no hay petición que hacer. Se falla ruidosamente en vez de
    // mandar un cuerpo sin credencial y dejar que el servidor conteste con un
    // error que la pantalla traduciría como «falló el asistente».
    throw new Error(`No hay token para la propuesta ${propuestaId}`)
  }
  return sesion
}

/** Guarda —o refresca— la sesión, y devuelve el identificador estable del token. */
function registrar(token: string, codigos: string[], manuales: Set<string>): string {
  hidratarSesiones()
  const id = idPorToken.get(token) ?? nuevoId()
  idPorToken.set(token, id)
  sesiones.set(id, { token, codigos, manuales })
  persistirSesiones()
  return id
}

/**
 * De dónde salió una línea, deducido de lo que ESTE cliente pidió.
 *
 * <p>⚠️ `AssistantProposalLineResponse` **no trae el origen**, y es deliberado:
 * su javadoc lo dice —«sin veredicto y sin origen»— porque el endpoint es
 * *driveable* y distinguir causas lo convertiría en un oráculo sobre el catálogo
 * interno. Así que el origen se deduce de las dos únicas fuentes honestas:
 *
 *  · `MANUAL` — lo sabe el cliente porque lo pidió él: está en
 *    {@link SesionPropuesta.manuales}. Es un hecho local, no una suposición.
 *  · `IA` / `BASE` — lo dice el servidor con `presentation`: si leyó el texto
 *    (`PROPOSAL`) las líneas son suyas; si no lo leyó (`NOT_UNDERSTOOD`,
 *    `DETERMINISTIC`) el carrito es el determinista y va rotulado como tal.
 *
 * <p>`REQUISITO` **no se emite nunca**: qué línea arrastró a cuál no viaja por
 * el contrato, y etiquetar de requisito lo que no consta sería inventarle al
 * usuario un motivo. Sus dos chips —`notaRequisito` y `requeridoPor`— quedan a
 * `null` por la misma razón.
 */
function origenDe(
  code: string,
  manuales: Set<string>,
  presentacion: AssistantProposalResponse['presentation'],
): OrigenLinea {
  if (manuales.has(code)) return 'MANUAL'
  return presentacion === 'PROPOSAL' ? 'IA' : 'BASE'
}

/** `0` días es «sin prueba» en el contrato (`int trialDays`); aquí eso es `null`. */
function pruebaDe(trialDays: number | null): number | null {
  return trialDays !== null && trialDays > 0 ? trialDays : null
}

function comoLinea(
  linea: AssistantProposalLineResponse,
  manuales: Set<string>,
  presentacion: AssistantProposalResponse['presentation'],
): PropuestaLinea {
  const code = linea.code ?? ''
  return {
    code,
    nombre: linea.name ?? code,
    descripcion: linea.description ?? '',
    origen: origenDe(code, manuales, presentacion),
    // El `kind` del servidor, tal cual. Se pasaba por alto y era el motivo de
    // que una capacidad cotizada se pintara como un módulo más.
    tipo: linea.kind,
    cantidad: linea.quantity ?? 1,
    // `unitAmount` y no `totalAmount`: aquél es el precio del artículo —la misma
    // base con la que el catálogo pinta su columna y con la que el servidor arma
    // `subtotal`—, mientras que `totalAmount` es `totalConImpuesto` y pintarlo al
    // lado de un subtotal sin impuesto mezclaría dos bases en la misma tabla.
    // Restar `taxAmount` para obtener el neto sería aritmética de dinero en el
    // cliente, que es exactamente lo que este front no hace.
    importe: linea.unitAmount,
    trialDays: pruebaDe(linea.trialDays),
    motivo: linea.reason,
    notaRequisito: null,
    requeridoPor: null,
  }
}

function comoRecomendada(linea: AssistantProposalLineResponse): LineaRecomendada {
  const code = linea.code ?? ''
  return {
    code,
    nombre: linea.name ?? code,
    descripcion: linea.description ?? '',
    importe: linea.unitAmount,
    trialDays: pruebaDe(linea.trialDays),
    motivo: linea.reason,
  }
}

/**
 * La comparación de paquete. **Las dos dimensiones o ninguna.**
 *
 * <p>Los nombres de los módulos que pierden la prueba se resuelven contra las
 * líneas del propio carrito, que sí los traen. Es la alternativa a inventarlos:
 * `modulesLosingTrial` son códigos pelados, y un nombre falso bajo un aviso de
 * pérdida es peor que el código.
 */
function comoOferta(
  oferta: AssistantPackOfferResponse,
  lineas: AssistantProposalLineResponse[],
): OfertaPaquete {
  const nombrePorCodigo = new Map(lineas.map((l) => [l.code ?? '', l.name ?? l.code ?? '']))
  const pruebasQuePierde: PruebaPerdida[] = (oferta.modulesLosingTrial ?? []).map((code) => ({
    code,
    nombre: nombrePorCodigo.get(code) ?? code,
  }))

  return {
    code: oferta.packCode ?? '',
    nombre: oferta.packName ?? '',
    importePaquete: oferta.packAmount ?? 0,
    importeActual: oferta.standaloneTotal ?? 0,
    ahorro: oferta.monthlySaving ?? 0,
    // ⚠️ El agregado del servidor, no un máximo calculado aquí sobre las líneas.
    diasDePruebaPerdidos: oferta.trialDaysLost ?? 0,
    // ⚠️ VACÍO SIEMPRE: `AssistantPackOfferResponse` publica qué se pierde al
    // cambiarse, pero no qué módulos trae el paquete y el carrito no tiene. La
    // frase «además te llevarías X» desaparece en vez de adivinarse.
    modulosExtra: [],
    pruebasQuePierde,
  }
}

/**
 * La traducción del contrato al dominio. **Es la mitad del seam que importa.**
 *
 * <p>Exportada a propósito: se puede probar sin fingir una red, igual que
 * `componer` en el seam del catálogo.
 *
 * ── Lo que el contrato NO trae y aquí queda vacío ───────────────────────────
 * Cinco huecos, y ninguno se rellena:
 *
 *  1. **El ciclo.** Ninguna de las tres peticiones lo lleva y la respuesta no lo
 *     dice. `firstPeriodTotal` y `monthlySaving` —`ahorroMensual` en el dominio
 *     del backend— delatan que el servidor cotiza en mensual, así que
 *     `totales.ciclo` es `MENSUAL` y no el que el usuario tenga elegido.
 *  2. **El tipo impositivo.** No hay campo de respuesta, y el `taxRate` por línea
 *     no declara su escala. `tasaImpuesto` queda a `null` y la pantalla enseña
 *     «IVA» con el importe al lado.
 *  3. **Las capacidades.** No hay bloque en la respuesta ni campo de sedes o
 *     personas en ninguna petición. `capacidades` queda vacío.
 *  4. **El origen de línea.** Ver {@link origenDe}.
 *  5. **Los módulos extra del paquete.** Ver {@link comoOferta}.
 */
export function desdeRespuesta(
  respuesta: AssistantProposalResponse,
  manuales: Set<string>,
): Propuesta {
  const lineas = respuesta.lines ?? []
  const presentacion = respuesta.presentation

  return {
    // Se rellena en `adoptarRespuesta`, que es quien conoce el identificador.
    id: '',
    version: respuesta.version ?? 0,
    lineas: lineas.map((l) => comoLinea(l, manuales, presentacion)),
    recomendados: (respuesta.recommendations ?? []).map(comoRecomendada),
    // ⚠️ Vacío por contrato, no por descuido. Ver el punto 3 de arriba.
    capacidades: [],
    totales: {
      subtotal: respuesta.subtotal ?? 0,
      impuesto: respuesta.taxes ?? 0,
      tasaImpuesto: null,
      total: respuesta.total ?? 0,
      ciclo: 'MENSUAL',
      primerMes: respuesta.firstPeriodTotal,
    },
    oferta: respuesta.packOffer ? comoOferta(respuesta.packOffer, lineas) : null,
    descartadas: respuesta.discardedLines ?? 0,
    ajustesRestantes: respuesta.refinementsLeft ?? 0,
    recalculado: respuesta.recalculated ?? false,
  }
}

/**
 * Registra la respuesta y le pone su identificador de cliente.
 *
 * <p>Es el único punto donde el token entra en {@link sesiones}, y por tanto el
 * único sitio que hay que leer para saber que no se guarda en ningún otro lado.
 */
function adoptarRespuesta(respuesta: AssistantProposalResponse, manuales: Set<string>): Propuesta {
  const token = respuesta.token ?? ''
  const codigos = (respuesta.lines ?? []).map((l) => l.code ?? '')
  const id = registrar(token, codigos, manuales)
  return { ...desdeRespuesta(respuesta, manuales), id }
}

/**
 * El desenlace, leído del **discriminador del servidor** y no de una lista
 * vacía.
 *
 * <p>`presentation` es `ProposalPresentation` y tiene cuatro valores:
 *
 *  · `PROPOSAL` — el modelo leyó el texto. Propuesta con sus líneas.
 *  · `DETERMINISTIC` — sin lectura del texto libre, pero **el carrito es una
 *    propuesta correcta** (núcleo, cierre de dependencias y precio por tramos),
 *    así que se presenta como propuesta y no como fallo. Las tres degradaciones
 *    internas del servidor colapsan aquí a propósito: distinguirlas le diría a
 *    un anónimo cuándo se agotó el presupuesto diario de la plataforma.
 *  · `NOT_UNDERSTOOD` — reescribir sirve, y se le pide.
 *  · `OUT_OF_DOMAIN` — reescribir NO sirve. **Ni una línea de catálogo**: el
 *    error caro no es perder el lead, es venderle software veterinario a quien
 *    no tiene animales.
 *
 * <p>Un `presentation` desconocido cae en `NO_DISPONIBLE` y no en «propuesta»:
 * la atadura al contrato acepta un tipo local más estrecho sin comprobarlo, así
 * que un quinto valor del backend llegaría aquí sin romper el build, y pintarlo
 * como propuesta sería enseñar un carrito que el servidor no llamó carrito.
 */
function comoResultado(
  respuesta: AssistantProposalResponse,
  manuales: Set<string>,
): ResultadoAsistente {
  if (respuesta.presentation === 'OUT_OF_DOMAIN') return { clase: 'FUERA_DE_DOMINIO' }

  // Sin token no se persistió nada que releer, refinar o editar. Es el caso
  // `ProposalViewDto.sinCatalogo()` —no hay tarifa publicada—, que es un estado
  // NORMAL del catálogo y responde 200 con todo a `null`. Tratarlo como
  // propuesta pintaría un carrito vacío de 0 pesos en la pantalla de compra.
  if (!respuesta.token) return { clase: 'NO_DISPONIBLE' }

  const propuesta = adoptarRespuesta(respuesta, manuales)
  if (respuesta.presentation === 'PROPOSAL' || respuesta.presentation === 'DETERMINISTIC') {
    // El tercer dato del desenlace, y el que hace honesta la pantalla: las dos
    // ramas son un carrito válido, pero solo una salió de leer el texto. Va aquí
    // —y no en el componente— porque `presentation` no cruza el seam: si la
    // pantalla tuviera que mirarlo, tendría que conocer el contrato.
    return { clase: 'PROPUESTA', propuesta, leyoElTexto: respuesta.presentation === 'PROPOSAL' }
  }
  if (respuesta.presentation === 'NOT_UNDERSTOOD') {
    return { clase: 'NO_ENTENDIDO', propuestaBase: propuesta }
  }
  return { clase: 'NO_DISPONIBLE' }
}

/**
 * El turno inicial.
 *
 * @param args
 *            correo, texto libre, las **dos** aceptaciones legales y la llave de
 *            idempotencia. Las aceptaciones no son decorativas: el texto libre
 *            viaja a un encargado en EE. UU. y el literal a) del artículo 26
 *            exige que la autorización diga a dónde. Se guardan, no solo se
 *            validan.
 * @param signal
 *            el del `AbortController` de la pantalla, con techo de 35 s.
 *            ⚠️ Abortar en el navegador **no cancela la invocación ni devuelve el
 *            gasto**: el consumo se reconcilia igual contra el cubo. El botón
 *            devuelve el control al usuario, no ahorra dinero.
 */
export async function generarPropuesta(
  args: GenerarArgs,
  signal?: AbortSignal,
): Promise<ResultadoAsistente> {
  const abortado = abortadoAntesDeEmpezar(signal)
  if (abortado) throw abortado

  const cuerpo: GenerateProposalRequest = {
    email: args.email,
    description: args.texto,
    acceptances: args.aceptaciones.map((a) => ({
      code: a.code,
      documentVersion: a.documentVersion,
    })),
  }

  const { data } = await http.post<AssistantProposalResponse>('/assistant/proposal', cuerpo, {
    signal,
    // ⛔ Obligatorio. El `PageLoader` global es un overlay `inset: 0` con
    // `cursor: wait`: seis segundos de eso sobre la pantalla que decide una
    // compra son seis segundos sin poder releer, corregir ni cancelar. La
    // pantalla tiene su propia espera (`AsistenteEspera`), con su botón.
    skipGlobalLoader: true,
    // La llave va en CABECERA y no en el cuerpo porque es metadato de
    // transporte: «esta petición es la misma que la anterior». Se genera al
    // MONTAR la pantalla, así que el doble clic y el reintento tras cancelar
    // mandan la misma y no pagan dos invocaciones al modelo.
    headers: { 'Idempotency-Key': args.clientRequestId },
  })

  return comoResultado(data, new Set())
}

/**
 * Un refinamiento. Máximo tres, y el cuarto devuelve **200 con la propuesta
 * intacta y `recalculated = false`**, nunca un error: el usuario no hizo nada
 * mal. Quien lea el resultado tiene que mirar {@link Propuesta.recalculado} y no
 * suponer que hubo cambio.
 *
 * <p>⚠️ **No viajan `retirados` ni `manuales`.** `RefineProposalRequest` son tres
 * campos y no los lleva, y no hace falta: la edición manual escribe en el
 * servidor una línea `REMOVED` de origen `CUSTOMER` y el refinamiento siguiente
 * ya no la vuelve a proponer. La soberanía de la edición la sostiene el
 * servidor, no este front.
 */
export async function refinarPropuesta(
  args: RefinarArgs,
  signal?: AbortSignal,
): Promise<ResultadoAsistente> {
  const abortado = abortadoAntesDeEmpezar(signal)
  if (abortado) throw abortado

  const sesion = sesionDe(args.propuestaId)
  const cuerpo: RefineProposalRequest = {
    token: sesion.token,
    text: args.texto,
    version: args.version,
  }

  const { data } = await http.post<AssistantProposalResponse>(
    '/assistant/proposal/refine',
    cuerpo,
    {
      signal,
      skipGlobalLoader: true,
    },
  )

  return comoResultado(data, sesion.manuales)
}

/**
 * Una edición manual del carrito: quitar una línea, marcar una casilla, aceptar
 * un recomendado.
 *
 * <p>**Devuelve la propuesta entera, repreciada.** Esa es la decisión de diseño
 * más importante del seam: la alternativa evidente —restar el importe de la
 * línea en el store— pinta una cifra que el servidor no ha calculado, y este
 * repositorio ya publicó dos veces una cifra así. Un viaje por clic es barato;
 * una pantalla de compra que miente, no.
 *
 * <p>⚠️ **El contrato quiere un DELTA, no el carrito entero.** Es la diferencia
 * más grande entre lo que este front había supuesto y lo que existe:
 * `EditProposalLinesRequest` son `addedCodes` y `removedCodes`. El store sigue
 * hablando de carrito completo —es lo correcto para él, que no puede razonar
 * sobre deltas de un estado que otra pestaña pudo mover— y el delta se calcula
 * **aquí**, contra los códigos que el servidor devolvió la última vez y no
 * contra un estado del store. La `version` es lo que hace que el delta se pueda
 * aplicar sin adivinar: o encaja, o el servidor responde con el choque.
 */
export async function actualizarLineas(
  args: ActualizarLineasArgs,
  signal?: AbortSignal,
): Promise<Propuesta> {
  const abortado = abortadoAntesDeEmpezar(signal)
  if (abortado) throw abortado

  const sesion = sesionDe(args.propuestaId)
  const antes = new Set(sesion.codigos)
  const ahora = new Set(args.codigos)
  const addedCodes = args.codigos.filter((c) => !antes.has(c))
  const removedCodes = sesion.codigos.filter((c) => !ahora.has(c))

  const cuerpo: EditProposalLinesRequest = {
    token: sesion.token,
    addedCodes,
    removedCodes,
    version: args.version,
  }

  const { data } = await http.put<AssistantProposalResponse>('/assistant/proposal/lines', cuerpo, {
    signal,
    skipGlobalLoader: true,
  })

  // Lo añadido a mano se acumula: es la única fuente de `MANUAL` y tiene que
  // sobrevivir al refinamiento siguiente, igual que sobrevive en el servidor.
  const manuales = new Set(sesion.manuales)
  for (const code of addedCodes) manuales.add(code)
  for (const code of removedCodes) manuales.delete(code)

  return adoptarRespuesta(data, manuales)
}

/**
 * Relee una propuesta ya generada. Es lo que abre el enlace del correo.
 *
 * <p>⚠️ **El token entra por `?token=` y jamás por un segmento de ruta.** Ver la
 * cabecera de este fichero: `getRequestURI()` no incluye la cadena de consulta,
 * y es `getRequestURI()` lo que el filtro de trazabilidad escribe en el contexto
 * de log de toda petición.
 *
 * <p>Lo que se pierde y se acepta por escrito: con el token fuera de la ruta,
 * `http.path` deja de distinguir «leer la propuesta A» de «leer la propuesta B».
 * Es exactamente lo que se busca.
 *
 * @param manuales
 *            lo que este cliente añadió a mano, cuando se sabe. Se pasa vacío
 *            desde el enlace del correo —otro navegador no puede saberlo— y
 *            lleno desde {@link releerPropuesta}, que lo tiene en la sesión
 *            persistida. Sin él, tras una recarga todas las líneas volverían a
 *            rotularse `IA`/`BASE` y el usuario vería como sugerido lo que había
 *            elegido él.
 */
export async function leerPropuesta(
  token: string,
  signal?: AbortSignal,
  manuales = new Set<string>(),
): Promise<ResultadoAsistente> {
  const abortado = abortadoAntesDeEmpezar(signal)
  if (abortado) throw abortado

  const { data } = await http.get<AssistantProposalResponse>('/assistant/proposal', {
    signal,
    params: { token },
    skipGlobalLoader: true,
  })

  return comoResultado(data, manuales)
}

/**
 * ¿Sigue este navegador teniendo con qué releer esa propuesta?
 *
 * <p>Es una pregunta LOCAL y no un viaje: distingue «perdimos el token» de
 * «el servidor dijo que no». Las dos acaban en pantalla como una propuesta que
 * no se puede mostrar, pero la primera se arregla volviendo a `/planes` en ESTE
 * dispositivo y la segunda no, y la frase que se le escribe al usuario es
 * distinta. Sin esto, el paso 6 tendría que leer un `Error` por su mensaje.
 */
export function conocePropuesta(propuestaId: string): boolean {
  hidratarSesiones()
  return sesiones.has(propuestaId)
}

/**
 * Relee una propuesta que ESTE navegador generó, por su identificador opaco.
 *
 * <p>Es lo que convierte «continuar con esta propuesta» en algo que sobrevive a
 * una recarga: el paso vinculante no arrastra el carrito, arrastra la referencia
 * y **vuelve a preguntar**. Si el prospecto editó la propuesta en otra pestaña
 * entre medias, lo que llega aquí son las líneas y los totales de después de esa
 * edición, que es la única versión que el servidor va a cotizar.
 *
 * <p>El token no sale: entra {@link Propuesta.id} y sale la propuesta. Quien
 * llama a esto no puede acreditar nada ante el servidor.
 *
 * @throws si el navegador ya no tiene la sesión. Compruébalo antes con
 *         {@link conocePropuesta}: llegar aquí sin sesión es un fallo de
 *         programación, no un estado del usuario.
 */
export async function releerPropuesta(
  propuestaId: string,
  signal?: AbortSignal,
): Promise<ResultadoAsistente> {
  const sesion = sesionDe(propuestaId)
  return leerPropuesta(sesion.token, signal, sesion.manuales)
}

/**
 * Lo que abre el enlace del correo: **relee por el token que trae la URL**.
 *
 * <p>Es {@link leerPropuesta} con lo único que este fichero puede aportar y el
 * llamador no: si ESTE navegador ya conoce el token —lo generó él, y el espejo
 * de `localStorage` sobrevivió a la recarga—, recupera de la sesión persistida
 * los códigos que el usuario añadió a mano. Sin eso, un prospecto que vuelve
 * por su propio enlace ve rotulado como «te lo sugerimos» lo que había elegido
 * él, que es la carencia que el parámetro `manuales` de {@link leerPropuesta}
 * existe para cubrir y que nadie estaba rellenando.
 *
 * <p>Desde otro navegador no hay nada que recuperar y se pasa el conjunto
 * vacío: no se inventa un origen que no consta.
 *
 * <p>⚠️ El token **entra** aquí y no sale: lo que se devuelve lleva el
 * identificador opaco. Quien llama a esto no puede acreditar nada ante el
 * servidor, que es la razón de que la lectura del enlace viva en el seam y no
 * en un composable ni —mucho menos— en un store.
 */
export async function recuperarPorToken(
  token: string,
  signal?: AbortSignal,
): Promise<ResultadoAsistente> {
  hidratarSesiones()
  const id = idPorToken.get(token)
  const manuales = id ? sesiones.get(id)?.manuales : undefined
  return leerPropuesta(token, signal, new Set(manuales ?? []))
}

/**
 * ¿El servidor dijo que esa propuesta no existe?
 *
 * <p>**404 y punto, sin distinguir «no existe» de «caducó».** No es una
 * simplificación de este front: el servidor los colapsa a propósito
 * (`ProposalReader`, «es 404 y no 410») porque un 410 le confirmaría a quien
 * prueba tokens a ciegas que ese existió. Aquí la consecuencia es que la
 * pantalla tiene **una** frase para los dos casos, y tiene que ser la del
 * usuario —«este enlace ya no sirve»— y no la del sistema.
 *
 * <p>Se comprueba el `status` y no el mensaje del `ProblemDetail`: el texto es
 * copy del servidor y cambiarlo no debe apagar esta rama en silencio.
 */
export function esPropuestaNoEncontrada(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404
}

/** Solo para las pruebas: vacía el registro de sesiones entre casos. */
export function olvidarSesiones(): void {
  sesiones.clear()
  idPorToken.clear()
  contador = 0
  hidratado = false
  try {
    window.localStorage.removeItem(ASISTENTE_PROPUESTA_KEY)
  } catch {
    /* ignore */
  }
}
