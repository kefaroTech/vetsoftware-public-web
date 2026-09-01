import type { Ciclo } from '../../landing/types/plans.types'

/**
 * La propuesta a medida, del lado del front.
 *
 * ── Dos vocabularios en un fichero, y la frontera entre ellos ───────────────
 * Desde que los cuatro endpoints existen, este fichero declara **dos familias
 * de tipos y no una**, y confundirlas es el único error grave que se puede
 * cometer aquí:
 *
 *  · Abajo del todo, los `*Request` / `*Response` en **vocabulario de contrato**
 *    (inglés, nombre idéntico al esquema). Están **atados** en
 *    `src/types/api.contract.ts`, así que renombrar un campo en el `record` de
 *    Java rompe este build. Es la única forma que tiene TR-01 de morder: los
 *    conjuntos de `MatchesContract` cruzan por nombre de campo, y un tipo en
 *    español no comparte ni un nombre con su esquema.
 *  · Arriba, los tipos de dominio en **español** (`Propuesta`, `PropuestaLinea`,
 *    `OfertaPaquete`…). Siguen **sin atar, y a propósito**: no son la forma que
 *    viaja por el cable sino la que ven las pantallas, y el hueco entre las dos
 *    —que resultó ser mucho mayor de lo previsto— lo cierra el mapeador del seam
 *    (`api/asistente.source.ts`). Que lleven vocabulario español es lo que hace
 *    imposible creerlos atados de un vistazo.
 *
 * ⚠️ **Lo que la atadura NO cubre, y hay que tener delante.** `MatchesContract`
 * no es unidireccional —un tipo local más estrecho que el contrato pasa en
 * silencio— y es **ciega a lo anidado**: su `Comparable` es
 * `string | number | boolean`, así que `lines`, `recommendations` y `packOffer`
 * NO se comparan al atar {@link AssistantProposalResponse}. Por eso
 * {@link AssistantProposalLineResponse} y {@link AssistantPackOfferResponse}
 * llevan **su propia línea** en `api.contract.ts`: alcanzarlos a través de la
 * respuesta no los cubre.
 *
 * ── La regla que gobierna TODO este fichero ─────────────────────────────────
 * **Un precio que se pinta es un precio que calculó el servidor.** Por eso
 * {@link PropuestaTotales} viaja DENTRO de la propuesta y no se deriva de las
 * líneas en ningún sitio de este front. No es una preferencia de estilo: este
 * repositorio ya publicó dos veces una cifra recalculada en cliente que no
 * coincidía con la del servidor —una de ellas una extrapolación anual por diez—
 * y la pantalla donde se pinta es la que decide una compra.
 *
 * Consecuencia de diseño, y es la que explica la forma del seam: **cada cambio
 * del carrito es un viaje**. Quitar una línea no resta un número en memoria;
 * pide al servidor la propuesta repreciada. `PUT /assistant/proposal/lines`
 * existe para eso y tiene su propio límite por IP (30/h) precisamente porque se
 * espera que se llame a menudo.
 */

/**
 * Los estados de la pantalla.
 *
 * <p>`ESCRIBIENDO`, `VACIO` y `DEMASIADO_CORTO` de la lista del plan §8.2 **no
 * son estados de esta máquina**: son estados de un formulario, viven en el
 * componente de entrada con el patrón `touched` del repositorio y no sobreviven
 * a un remontaje. Meterlos aquí obligaría a que el store supiera de validación
 * de campos, que es exactamente lo que la convención de formularios mantiene
 * fuera.
 *
 * <p>`YA_ERES_CLIENTE` está retirado a propósito (plan §8.2.2): comprobar si un
 * correo ya es cliente desde una pantalla anónima es un oráculo de existencia de
 * clientes abierto a cualquiera con un diccionario de correos.
 *
 * <p>`RECUPERANDO` y `ENLACE_CADUCADO` son los dos estados del enlace del
 * correo, y ninguno se puede fundir con los que ya había:
 *
 *  · `RECUPERANDO` **no es `CARGANDO`**. `CARGANDO` es «el modelo está leyendo
 *    lo que escribiste» —de tres a ocho segundos, con su cuenta atrás y su
 *    botón de cancelar—; esto es una relectura sin modelo, y anunciarla con
 *    aquellas frases le contaría al usuario un trabajo que no está pasando.
 *  · `ENLACE_CADUCADO` **no es `ERROR_MODELO` ni `ASISTENTE_CAIDO`**. No ha
 *    fallado nada nuestro: el enlace tenía fecha de caducidad y el correo la
 *    decía por escrito. Pintarlo como avería manda al prospecto a reintentar
 *    un camino que no lleva a ningún sitio, y de paso nos acusa de un fallo que
 *    no hubo.
 *
 * <p>`LIMITE_ALCANZADO` es el 429, y **tampoco es `ERROR_MODELO` ni
 * `ASISTENTE_CAIDO`**. Es el mismo razonamiento que `ENLACE_CADUCADO` ya dejó
 * escrito: no ha fallado nada, se ha agotado un cupo que existe a propósito.
 * Mientras no tuvo estado propio, un 429 caía en el `catch` genérico de
 * `generar`, **sumaba a `fallos`**, y dos límites seguidos degradaban la
 * pantalla a `ASISTENTE_CAIDO` — al prospecto se le contaba una avería que no
 * hubo y se le mandaba al catálogo por una causa falsa.
 *
 * <p>Y es **un** estado, no cuatro: que haya o no paquetes publicados es una
 * propiedad ortogonal de la pantalla (`useCatalogoComercial.vacio`,
 * `PlanesView.sinPaquetes`), no una causa. Cruzar causas con condiciones daría
 * el producto cartesiano de las dos para expresar una variación de frase.
 */
export type EstadoAsistente =
  | 'INICIAL'
  | 'CARGANDO'
  | 'PROPUESTA_LISTA'
  | 'REFINANDO'
  | 'ERROR_MODELO'
  | 'ASISTENTE_CAIDO'
  | 'NO_ENTENDIDO'
  | 'FUERA_DE_DOMINIO'
  | 'RECUPERANDO'
  | 'ENLACE_CADUCADO'
  | 'LIMITE_ALCANZADO'

/**
 * Cuánto hay que esperar tras un `LIMITE_ALCANZADO`, **solo si el servidor lo
 * dijo**.
 *
 * <p>`null` es el caso por defecto y no es un hueco: significa «no lo sabemos»,
 * y la pantalla dice entonces «más tarde». Hay tres límites simultáneos —5/h por
 * IP, 3/día por correo, N/día por IP— y el front **no sabe cuál saltó**, así que
 * cualquier plazo inventado sería mentira en dos de los tres casos.
 *
 * <p>Solo se puebla desde la cabecera `Retry-After` de la respuesta 429. Ver
 * `esperaDelLimite` en el seam, que también explica por qué hoy puede no llegar.
 */
export type EsperaLimite = 'HORA' | 'DIA' | null

/**
 * De dónde salió una línea. Son cuatro y **ninguna es prescindible**.
 *
 *  · `IA` — la propuso el modelo. Es la única que lleva motivo en cursiva.
 *  · `MANUAL` — la marcó el usuario en el catálogo. **Nunca recibe motivo
 *    generado**, ni en este recálculo ni en ninguno: no hay nada que explicarle
 *    a alguien sobre su propia decisión.
 *  · `REQUISITO` — la arrastró un `REQUIRES`. No es «lo añadiste tú» ni «te lo
 *    sugerimos»: es una tercera cosa y necesita su propia etiqueta, porque el
 *    usuario no la eligió y tampoco la propuso el modelo.
 *  · `BASE` — el punto de partida determinista del estado `NO_ENTENDIDO`. Sin
 *    motivo, y rotulada como lo que es.
 */
export type OrigenLinea = 'IA' | 'MANUAL' | 'REQUISITO' | 'BASE'

/**
 * Una línea de la propuesta.
 *
 * <p>`importe` es el que devolvió el servidor para el ciclo vigente. `null`
 * significa «sin precio publicado en este ciclo», no «gratis».
 */
export interface PropuestaLinea {
  code: string
  nombre: string
  /** `short_description` del catálogo, en español revisado. */
  descripcion: string
  origen: OrigenLinea
  /**
   * Qué CLASE de artículo es, tal como lo publica el servidor
   * (`AssistantProposalLineResponse.kind`): `MODULE`, `CAPACITY`, `BUNDLE` o
   * `ONE_TIME`.
   *
   * <p>Existe porque sin él **una capacidad cotizada se pinta como un módulo
   * más**: la misma fila, el mismo tipo de letra y ningún indicio de que lo que
   * se está cobrando son unidades de un eje y no una funcionalidad. El campo
   * llevaba en el contrato desde el principio y este front lo estaba tirando en
   * el seam.
   *
   * <p>Se guarda como `string | null` y NO como unión cerrada, por el mismo
   * motivo que en `AssistantProposalLineResponse`: `MatchesContract` acepta un
   * tipo local más estrecho sin comprobarlo, así que estrecharlo escondería un
   * valor nuevo del backend detrás de un tipo que miente. Quien lo consuma
   * compara contra el literal que le interesa y trata lo demás como «otra cosa».
   */
  tipo: string | null
  /**
   * Cuántas unidades del artículo. Casi siempre `1`; los ejes de capacidad son
   * los que traen más.
   *
   * <p>Se pinta cuando pasa de `1`, y no es cosmético: {@link importe} es el
   * precio **unitario** que devuelve el servidor, así que una línea de tres
   * unidades enseñaría un importe que no explica su parte del subtotal si no se
   * dice al lado cuántas son.
   */
  cantidad: number
  /**
   * Importe **unitario**, calculado por el servidor. `null` = sin precio.
   *
   * <p>Es `AssistantProposalLineResponse.unitAmount`, la misma base sin impuesto
   * con la que el servidor arma `subtotal`. El otro candidato, `totalAmount`, es
   * el total **con** impuesto de la línea, y mezclar las dos bases en una tabla
   * que además enseña el subtotal aparte es cómo se lee mal una factura.
   */
  importe: number | null
  /** Días de prueba del artículo. `null` = sin prueba. Nunca `0` por relleno. */
  trialDays: number | null
  /**
   * El motivo escrito por el modelo, YA SANEADO. Solo en líneas `IA`.
   *
   * <p>Se pinta por interpolación de Vue, **jamás con `v-html`**: es texto de
   * entrada de usuario procesado por un tercero, o sea el vector de XSS de
   * manual.
   */
  motivo: string | null
  /** La `note` del catálogo cuando la línea la arrastró un `REQUIRES`. En redonda. */
  notaRequisito: string | null
  /** Nombre del módulo que la exige, para el chip «Necesario para X». */
  requeridoPor: string | null
}

/**
 * Los importes. **Los calcula el servidor y este front no los recalcula jamás.**
 *
 * <p>`primerMes` es lo que se paga el primer mes con las pruebas activas, y
 * también viene del servidor: derivarlo aquí sumando las líneas sin prueba sería
 * reintroducir el mismo defecto por la puerta de atrás, en la cifra que además
 * sostiene la promesa «Prueba gratis. Sin tarjeta.» de la landing.
 */
export interface PropuestaTotales {
  subtotal: number
  impuesto: number
  /**
   * Porcentaje, 0-100. Se muestra, no se aplica. **`null` = el contrato no lo
   * publica**, y hoy siempre lo es.
   *
   * <p>`AssistantProposalResponse` trae `subtotal`, `taxes` y `total` pero
   * ningún tipo impositivo; el único `taxRate` del contrato es **por línea**
   * (`AssistantProposalLineResponse.taxRate`) y su escala no está declarada —un
   * `BigDecimal` que puede valer `0.19` o `19`—. Deducir de ahí un «IVA 19 %»
   * sería inventar en la pantalla que decide una compra una cifra que el
   * servidor no ha dicho, y equivocarse por un factor de cien es la forma más
   * barata de hacerlo. Mientras el contrato no lo publique, se enseña «IVA» a
   * secas con el importe al lado, que sí es del servidor.
   */
  tasaImpuesto: number | null
  total: number
  /**
   * El ciclo al que corresponden estos importes.
   *
   * <p>⚠️ **El asistente cotiza en MENSUAL y solo en mensual**, y no es una
   * elección de este front: ninguna de las tres peticiones del contrato
   * (`GenerateProposalRequest`, `RefineProposalRequest`,
   * `EditProposalLinesRequest`) lleva campo de ciclo, y la respuesta lo confirma
   * por sus propios nombres —`firstPeriodTotal`, y `monthlySaving`, que en el
   * dominio del backend se llama literalmente `ahorroMensual`—. El mapeador del
   * seam fija `MENSUAL` porque es lo que el servidor calculó; poner aquí el
   * ciclo que el usuario tenga elegido rotularía como anuales unos importes
   * mensuales, que es exactamente la clase de mentira que este fichero existe
   * para impedir.
   */
  ciclo: Ciclo
  /**
   * Lo que se paga el primer mes con las pruebas activas, sin impuesto.
   *
   * <p>`null` cuando no aplica —ciclo anual—, y **`0` es un valor legítimo y
   * distinto**: significa que todo el carrito está de prueba y el primer mes no
   * se paga nada. Aplanar los dos al mismo valor borraría justamente la
   * afirmación que hace atractiva la propuesta.
   */
  primerMes: number | null
}

/**
 * Una capacidad, mostrada como DATO y nunca como línea cotizada.
 *
 * <p>La frase que produce es «8 personas: 2 van incluidas», y **ahí se para**.
 * Decía «el resto se ajusta al contratar» y eso no ocurría en ninguna parte: el
 * número no sale del navegador. No es una elección de redacción que se pueda
 * revisar a la ligera: los cuatro `EXTRA_*` tienen `selfServiceEligible = false`
 * porque no cuelgan de ningún `BUNDLE` activo, así que cotizarlos produce un
 * `ARTICULO_NO_CONTRATABLE` en el paso vinculante — con un texto que a propósito
 * **no dice qué línea sobró**, después de que el prospecto se haya registrado y
 * verificado el correo. Ver la cabecera de `PropuestaCapacidades.vue`.
 */
export interface CapacidadPropuesta {
  unit: string
  /** Lo que pidió el usuario en el control numérico. */
  solicitado: number
  /** Lo que trae el paquete sin coste. */
  incluido: number
}

/**
 * La comparación con un paquete. **Se muestra, no se sustituye.**
 *
 * <p>Lleva las DOS dimensiones y esa es toda la sección: el paquete cuesta menos
 * al mes, y los tres `BUNDLE` son `NEVER_FREE`, así que cambiarse **cuesta las
 * pruebas gratis de los módulos sueltos**. Sustituir en silencio ahorraría unos
 * pesos al mes y le quitaría al cliente el primer mes de prueba entero, en una
 * landing que promete «Prueba gratis. Sin tarjeta.». Por eso `pruebasQuePierde`
 * es un campo obligatorio y no un adorno: sin él, el aviso es un patrón oscuro
 * con mejor tipografía.
 */
export interface OfertaPaquete {
  code: string
  nombre: string
  /** Precio del paquete en el ciclo vigente, del servidor. */
  importePaquete: number
  /** Lo que suma el carrito actual, **calculado por el servidor**. */
  importeActual: number
  /** `importeActual` menos `importePaquete`. Del servidor. Positivo o no hay oferta. */
  ahorro: number
  /**
   * Los días de prueba que se pierden al cambiarse. **La otra mitad de la
   * comparación, y viene del servidor**: es `trialDaysLost`, un agregado que el
   * backend calcula.
   *
   * <p>No se deriva del máximo de {@link pruebasQuePierde} —aunque coincida—
   * porque esa derivación dejaría de ser cierta en cuanto el servidor cambiara
   * cómo agrega, y esta es la cifra que sostiene el aviso que impide que la
   * tarjeta sea un patrón oscuro.
   */
  diasDePruebaPerdidos: number
  /**
   * Módulos que el paquete trae y el carrito no. **Hoy siempre vacío.**
   *
   * <p>`AssistantPackOfferResponse` publica qué se pierde al cambiarse pero no
   * qué se gana, así que la frase «además te llevarías X» no se pinta en vez de
   * adivinarse desde el catálogo local.
   */
  modulosExtra: string[]
  /** Qué módulos pierden su prueba. La lista, no la cifra: esa es {@link diasDePruebaPerdidos}. */
  pruebasQuePierde: PruebaPerdida[]
}

/**
 * Un módulo del carrito que hoy lleva prueba y dentro del paquete no la
 * llevaría.
 *
 * <p>Sin días propios: `modulesLosingTrial` son **códigos pelados** y el
 * contrato solo publica el agregado (`trialDaysLost`). Declarar aquí un
 * `trialDays` por módulo obligaría a rellenarlo con un `0` inventado bajo un
 * aviso de pérdida, que es justo donde un cero de relleno hace más daño.
 */
export interface PruebaPerdida {
  code: string
  nombre: string
}

/** Una línea que el modelo sugirió sin que se le pidiera. Nunca entra al carrito. */
export interface LineaRecomendada {
  code: string
  nombre: string
  descripcion: string
  importe: number | null
  trialDays: number | null
  motivo: string | null
}

/**
 * La propuesta completa, tal como la sirve el servidor.
 *
 * <p>`version` no es decorativa: `refine` y `PUT /lines` escriben sobre la misma
 * propuesta desde un token público sin sesión, y **dos pestañas son dos
 * clientes**. El servidor rechaza con 409 si la versión no coincide; sin ese
 * candado, un refinamiento en vuelo pisa una edición manual recién aplicada y
 * devuelve la línea que el usuario acababa de quitar — que es el fallo exacto
 * que la regla de soberanía existe para impedir.
 */
export interface Propuesta {
  /** Identificador interno. NO es el token: el token no se guarda en el store. */
  id: string
  /** Bloqueo optimista del servidor. Viaja en cada escritura. */
  version: number
  lineas: PropuestaLinea[]
  /**
   * Lo que el modelo sugirió de más. **Se sirve aparte, sin sumar al total.**
   *
   * <p>El prompt sesga explícitamente hacia esta lista («ante la duda, va en
   * recomendados»), así que fundirla con `lineas` inflaría el carrito
   * exactamente con lo que el propio modelo marcó como no pedido.
   */
  recomendados: LineaRecomendada[]
  capacidades: CapacidadPropuesta[]
  totales: PropuestaTotales
  /** La comparación de paquete, o `null` si ninguno sale estrictamente más barato. */
  oferta: OfertaPaquete | null
  /**
   * Cuántas líneas se descartaron. **Un entero y nada más.**
   *
   * <p>Sin códigos y sin veredictos, y no por economía: el endpoint es
   * *driveable* —el texto de entrada lo escribe quien quiera— y cinco veredictos
   * distinguibles convierten la respuesta en un oráculo de cinco valores sobre
   * el catálogo interno. Existe solo para poder decir «no todo lo que propusimos
   * se puede contratar».
   */
  descartadas: number
  /** Refinamientos que quedan. Empieza en 3 y baja. */
  ajustesRestantes: number
  /**
   * Si el servidor **rehizo** el carrito en este turno.
   *
   * <p>Existe porque el cuarto refinamiento devuelve `200` con la propuesta
   * intacta y `recalculated = false`, nunca un `400` (`AssistantController`,
   * javadoc de `refine`). Sin este campo la pantalla no puede distinguir «tu
   * ajuste se aplicó y no cambió nada» de «tu ajuste no se aplicó», y anunciaría
   * un éxito que no hubo.
   */
  recalculado: boolean
}

/**
 * Lo que el servidor responde: la propuesta, o el motivo por el que no la hay.
 *
 * <p>`NO_ENTENDIDO` y `FUERA_DE_DOMINIO` son **dos desenlaces distintos y no un
 * matiz del mismo**. En el primero el texto no se entendió y reescribirlo sirve;
 * en el segundo se entendió perfectamente y reescribirlo NO sirve, porque el
 * negocio no es del dominio. Llegan diferenciados desde el esquema de salida
 * —`out_of_domain` y `understood` son dos booleanos obligatorios— justamente
 * para que la pantalla no tenga que adivinarlo desde una lista vacía.
 *
 * <p>`leyoElTexto` es el **tercer** discriminante, y existe porque `PROPOSAL` y
 * `DETERMINISTIC` colapsan a propósito en la misma clase: las dos son un carrito
 * correcto y accionable, así que las dos se presentan como propuesta. Lo que
 * **no** es igual es de dónde salió. Sin este campo la pantalla pinta un carrito
 * armado con lo más habitual de una clínica bajo el encabezado «Tu propuesta»,
 * sin un solo aviso, y quien cree que se le leyó el texto no revisa las líneas y
 * contrata módulos que no va a usar. **No cuesta contrato**: sale de
 * `presentation`, que ya viaja en la respuesta.
 */
export type ResultadoAsistente =
  | { clase: 'PROPUESTA'; propuesta: Propuesta; leyoElTexto: boolean }
  | { clase: 'NO_ENTENDIDO'; propuestaBase: Propuesta }
  | { clase: 'FUERA_DE_DOMINIO' }
  | { clase: 'NO_DISPONIBLE' }

/** Lo que la aceptación de un documento legal aporta a la petición. */
export interface AceptacionLegal {
  code: string
  documentVersion: number
}

/**
 * La petición del turno inicial.
 *
 * <p>⚠️ **Sigue sin ciclo, y ahora eso es una decisión y no un límite.**
 * `GenerateProposalRequest` ya declara `billingCycle` —opcional, y ausente
 * significa `MONTHLY`—, pero la pantalla del asistente no tiene selector de
 * ciclo, así que el seam no tiene qué mandar. La regla de este tipo no cambia:
 * lo que declara es lo que de verdad sale por el cable, porque un campo que el
 * llamador rellena y nadie envía es la forma más barata de creer que se está
 * mandando algo. El día que haya selector hay que añadirlo aquí **y** al cuerpo
 * que arma `generarPropuesta`, no solo aquí. Ver {@link PropuestaTotales.ciclo}.
 */
export interface GenerarArgs {
  /** Correo del prospecto. Va al enlace de vuelta, y a nada más. */
  email: string
  /** El texto libre, de 15 a 1000 caracteres. */
  texto: string
  /** Las dos aceptaciones: tratamiento y transferencia internacional. */
  aceptaciones: AceptacionLegal[]
  /**
   * Llave de idempotencia generada al MONTAR la pantalla, no al pulsar.
   *
   * <p>Es lo que hace que un doble clic —o el reintento tras cancelar— no pague
   * dos invocaciones ni cree dos propuestas huérfanas que consumen cupo. El
   * botón de cancelar hace el doble envío **más** probable, no menos.
   */
  clientRequestId: string
}

/**
 * La petición de un refinamiento. Máximo tres por propuesta.
 *
 * <p>⚠️ **Sin `retirados` ni `manuales`, y esta vez la ausencia es buena
 * noticia.** Una versión anterior de este tipo los declaraba porque suponía que
 * el modelo necesitaba recibir el estado del carrito para no reproponer lo que
 * el cliente acababa de quitar. El servidor ya lo resuelve mejor: la edición
 * manual escribe una línea `REMOVED` de origen `CUSTOMER` y el refinamiento
 * siguiente no la vuelve a añadir aunque el modelo la proponga. La soberanía de
 * la edición vive donde tiene que vivir.
 *
 * <p>`propuestaId` es el identificador **opaco de cliente**, no el token: el
 * token lo sostiene el seam y no sale de él.
 */
export interface RefinarArgs {
  propuestaId: string
  version: number
  /** El añadido, de 10 a 400 caracteres. **10 y no 15**: es un añadido, no una descripción. */
  texto: string
}

/**
 * La petición de una edición manual, **tal como la piensa el store**.
 *
 * <p>El store manda el carrito ENTERO y eso es lo correcto para él: no puede
 * razonar sobre deltas de un estado que otra pestaña pudo mover. Pero el
 * contrato quiere un delta (`addedCodes` / `removedCodes`), así que la
 * conversión la hace el seam contra lo último que devolvió el servidor. Es
 * exactamente el trabajo para el que existe un seam.
 */
export interface ActualizarLineasArgs {
  propuestaId: string
  version: number
  /** Los códigos que el usuario quiere, en el orden en que se pintan. */
  codigos: string[]
}

/* ─────────────────────────────────────────────────────────────────────────────
 * VOCABULARIO DE CONTRATO. Todo lo de aquí abajo está atado en
 * `src/types/api.contract.ts` y NO lo lee ningún componente: solo el mapeador
 * del seam. Nombres y nulabilidad son los del esquema, no los del dominio.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Una aceptación legal, tal como la exige `POST /assistant/proposal`.
 *
 * <p>`documentVersion` es opcional en el esquema y aquí también, pero este front
 * la manda **siempre**: es la versión concreta del documento que el prospecto
 * leyó, y una aceptación sin versión no prueba a qué texto consintió.
 */
export interface LegalAcceptanceRequest {
  code: string
  documentVersion?: number
}

/**
 * El cuerpo del turno inicial.
 *
 * <p>⚠️ **Ya lleva ciclo, y sigue sin llevar sedes ni personas.** El esquema son
 * cuatro campos: lo que el prospecto escribe, su correo, las aceptaciones y el
 * ciclo con el que se cotiza. Ver {@link PropuestaTotales.ciclo} y
 * {@link CapacidadPropuesta}.
 *
 * <p>La llave de idempotencia **no está aquí**: viaja en la cabecera
 * `Idempotency-Key`, porque es metadato de transporte —«esta petición es la
 * misma que la anterior»— y no un dato de la propuesta.
 */
export interface GenerateProposalRequest {
  email: string
  /** El texto libre del prospecto, de 15 a 1000 caracteres. */
  description: string
  acceptances: LegalAcceptanceRequest[]
  /**
   * ⚠️ **Opcional en el contrato, y tiene que seguir siéndolo.** Ausente significa `MONTHLY`, y
   * el defecto lo aplica el servidor (`GenerateProposalCommand`), no este front. Por eso el
   * cambio es aditivo: un cliente ya desplegado que no lo mande recibe exactamente lo que
   * recibía ayer.
   *
   * <p><b>Este front todavía no lo envía</b>, y el seam tampoco lo acepta —{@link GenerarArgs}
   * no lo declara—: la pantalla del asistente no tiene selector de ciclo. Se declara aquí porque
   * el esquema está atado en `api.contract.ts` y `UndeclaredFields` rompe el build si el
   * contrato tiene un campo que este tipo no consta. Poner el selector es trabajo de pantalla,
   * no de contrato.
   *
   * <p>Vocabulario del CONTRATO (inglés), no el {@link Ciclo} de dominio en español: los
   * conjuntos de `MatchesContract` cruzan por nombre y por valor.
   */
  billingCycle?: 'MONTHLY' | 'ANNUAL'
}

/**
 * El cuerpo de un refinamiento.
 *
 * <p>⚠️ **El token va en el cuerpo y nunca en la ruta.** El filtro de
 * trazabilidad del backend mete `getRequestURI()` en el contexto de log de toda
 * petición —incluidas las públicas— y ningún patrón del redactor casa con 43
 * caracteres de base64url: un token en la ruta acabaría en claro en CloudWatch,
 * en Loki, en el `Referer` y en el historial del navegador.
 *
 * <p>⚠️ **No lleva `retirados` ni `manuales`.** El estado del carrito que el
 * modelo necesita para no reproponer lo que el cliente quitó lo guarda el
 * servidor: la edición manual escribe una línea `REMOVED` de origen `CUSTOMER` y
 * el refinamiento siguiente ya no la vuelve a añadir.
 */
export interface RefineProposalRequest {
  token: string
  /** El añadido, de 10 a 400 caracteres. */
  text: string
  /** Bloqueo optimista. Sin él, dos pestañas se pisan sin que nadie lo note. */
  version?: number
}

/**
 * El cuerpo de una edición manual del carrito.
 *
 * <p>⚠️ **Es un DELTA, no el carrito entero**, al revés de lo que este front
 * había supuesto. `addedCodes` y `removedCodes` son lo que cambia en este turno;
 * el servidor conserva el resto. La `version` es lo que hace que el delta se
 * pueda aplicar sin adivinar: o encaja, o el servidor responde y no hay tercera
 * opción silenciosa.
 */
export interface EditProposalLinesRequest {
  token: string
  addedCodes?: string[]
  removedCodes?: string[]
  version?: number
}

/**
 * Una línea **aceptada**, que es la única clase de línea que sale por HTTP.
 *
 * <p>⚠️ **Sin veredicto y sin origen, a propósito.** El endpoint es *driveable*
 * —el texto de entrada lo escribe quien pregunta—, así que distinguir por qué se
 * descartó una línea convertiría la respuesta en un oráculo sobre el catálogo
 * interno. Consecuencia para este front: {@link OrigenLinea} **no viaja por el
 * cable** y el seam lo deduce de lo que el propio cliente pidió.
 *
 * <p>`kind` es `SellableItemKind` (`MODULE`, `CAPACITY`, `BUNDLE`, `ONE_TIME`) y
 * se declara `string` y no la unión cerrada: `MatchesContract` acepta un tipo
 * local más estrecho **sin comprobarlo**, así que estrecharlo aquí no ganaría
 * seguridad y sí escondería un valor nuevo del backend detrás de un tipo que
 * miente.
 */
export interface AssistantProposalLineResponse {
  code: string | null
  name: string | null
  description: string | null
  kind: string | null
  quantity: number | null
  unitAmount: number | null
  taxRate: number | null
  taxAmount: number | null
  totalAmount: number | null
  trialDays: number | null
  currency: string | null
  reason: string | null
}

/**
 * La comparación con un paquete: el ahorro **y** lo que cuesta en días de
 * prueba. Las dos mitades, o es un patrón oscuro con mejor tipografía.
 *
 * <p>`modulesLosingTrial` son **códigos y nada más**. El nombre y los días de
 * cada uno no viajan aquí: el seam los resuelve contra las líneas del propio
 * carrito, que sí los traen, en vez de inventarlos.
 */
export interface AssistantPackOfferResponse {
  packCode: string | null
  packName: string | null
  packAmount: number | null
  /** Lo que suma el carrito suelto. Calculado por el servidor. */
  standaloneTotal: number | null
  monthlySaving: number | null
  currency: string | null
  /** El agregado de días de prueba perdidos. */
  trialDaysLost: number | null
  modulesLosingTrial: string[] | null
}

/**
 * La propuesta tal como la sirven las cuatro rutas del asistente.
 *
 * <p>Todos los campos son opcionales en el esquema porque un `record` de Java no
 * dice nada sobre nulabilidad, y aquí se declaran nulables en consecuencia: el
 * caso «no hay tarifa publicada» responde `200` con `ProposalViewDto.sinCatalogo()`
 * —token, versión e importes a `null`— y tratarlo como imposible sería estrellar
 * la pantalla contra un estado normal del catálogo.
 *
 * <p>`presentation` es {@code ProposalPresentation} y es **el discriminador**:
 * `PROPOSAL`, `NOT_UNDERSTOOD`, `OUT_OF_DOMAIN`, `DETERMINISTIC` y
 * `NO_CATALOG`. Las tres degradaciones internas del servidor colapsan en
 * `DETERMINISTIC` a propósito —saber cuál tocó le diría a un anónimo cuándo se
 * agotó el presupuesto diario de la plataforma—, pero `NOT_UNDERSTOOD` y
 * `OUT_OF_DOMAIN` sí se distinguen, porque son lectura del texto del prospecto
 * y tienen pantallas distintas.
 *
 * <p>`NO_CATALOG` es el rótulo del caso de arriba: `ProposalViewDto.sinCatalogo()`
 * ya no viaja rotulado como una degradación cualquiera. **Declararlo aquí no
 * cambia ni una rama del seam**, y es lo que se quería: el token nulo ya
 * clasifica ese cuerpo antes de que nadie mire la presentación, así que la
 * unión se amplía para no mentir sobre lo que el cable trae, no para abrir un
 * camino nuevo. Y el build no lo habría avisado: el contrato declara
 * `presentation` como `string` a secas, así que `MatchesContract` acepta esta
 * unión igual de estrecha o de ancha (ver `api.contract.ts`, §del asistente).
 */
export interface AssistantProposalResponse {
  /** La credencial de 43 caracteres. **No entra en ningún store.** */
  token: string | null
  presentation:
    'PROPOSAL' | 'NOT_UNDERSTOOD' | 'OUT_OF_DOMAIN' | 'DETERMINISTIC' | 'NO_CATALOG' | null
  expiresAt: string | null
  version: number | null
  lines: AssistantProposalLineResponse[] | null
  /** El bloque «también podría interesarte». **No suma al total.** */
  recommendations: AssistantProposalLineResponse[] | null
  /** Cuántas líneas no se pudieron cotizar. Un entero y nada más. */
  discardedLines: number | null
  currency: string | null
  subtotal: number | null
  taxes: number | null
  total: number | null
  /** Lo que se paga el primer periodo con las pruebas activas. */
  firstPeriodTotal: number | null
  packOffer: AssistantPackOfferResponse | null
  refinementsLeft: number | null
  /** `false` cuando el servidor devolvió la propuesta intacta sin rehacerla. */
  recalculated: boolean | null
}
