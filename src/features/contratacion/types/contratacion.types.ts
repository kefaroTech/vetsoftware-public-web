import type { CapacityUnit, Ciclo } from '@/features/landing/types/plans.types'
import type { EstadoPlanActual } from '@/features/suscripcion/composables/estadoSuscripcion'

export type { EstadoPlanActual }

/**
 * QUÉ eligió el prospecto. Es el discriminador de la unión, y existe porque el
 * embudo dejó de tener una sola forma de entrada.
 *
 *  · `PLAN` — lo que el prospecto armó con el catálogo público en la landing o
 *    en `/planes`: un paquete, o los módulos que marcó uno a uno. Con paquete
 *    lo identifica su `planCode` y sus importes los recalcula la lista de
 *    precio transcrita; sin él, los pone `POST /quotes/preview`.
 *  · `PROPUESTA` — una propuesta a medida del asistente comercial: **N líneas**,
 *    no un plan. La identifica una referencia opaca y sus importes **los tiene
 *    el servidor y solo el servidor**.
 */
export type OrigenIntencion = 'PLAN' | 'PROPUESTA'

/** Lo que las dos formas comparten: el ciclo, las cantidades y los metadatos del embudo. */
interface IntencionBase {
  ciclo: Ciclo
  sedes: number
  usuarios: number
  /**
   * El importe MENSUAL sin impuesto que el usuario VIO cuando eligió. Se compara
   * contra el que se recalcula en el paso 6; si difieren, la pantalla lo dice
   * con las dos cifras y se lleva el foco al aviso. **No desmarca ninguna
   * casilla**: cuando la comparación corre, la casilla de términos todavía no
   * está pintada. Ver la cabecera de `ContratarView.vue`.
   *
   * <p>`null` cuando no había importe que ver: la selección incluye una capacidad
   * que se cobra y que el catálogo no publica en el ciclo mensual. Antes esto se
   * aplanaba a `0` al leerlo del almacenamiento, y un cero guardado como «lo que
   * vio el usuario» hace saltar el aviso de deriva contra una cifra que nadie vio
   * — con «Cuando lo elegiste: $ 0» escrito en pantalla.
   */
  importeVistoMensual: number | null
  /** Sello del contenido con el que se calculó, para saber si el precio pudo moverse. */
  selloRevisadoEl: string
  /** ISO datetime. La intención caduca a los 30 días. */
  creadaEn: string
  /**
   * El usuario dijo «Ahora no» en el paso 6, o su empresa ya tenía plan. Una
   * intención descartada no se borra: se marca, para que el enganche del login
   * deje de dispararse **para siempre** y el paso 6 no se convierta en una jaula.
   */
  descartada: boolean
}

/**
 * Lo que el prospecto armó con el catálogo: un paquete publicado, o los módulos
 * que marcó uno a uno.
 *
 * <p>Las dos cosas son la misma rama y no dos, porque son el mismo acto: marcar
 * una casilla más convierte una en la otra sin que el prospecto cambie de
 * pantalla ni de intención. Lo que las distingue es {@link planCode}.
 */
export interface IntencionPlan extends IntencionBase {
  origen: 'PLAN'
  /**
   * El paquete que la selección reproduce EXACTAMENTE, o `null` cuando no
   * reproduce ninguno y se contrata suelta.
   *
   * <p>Quien lo pone es `paqueteQueCoincide`, la misma función que decide la
   * cesta que se cotiza: mientras coincida se manda la línea de paquete, que es
   * lo que conserva su descuento (decisión D4). Nulo no es un hueco — es la
   * selección modular, que el catálogo cotiza y la autocontratación acepta.
   */
  planCode: string | null
  /**
   * Los códigos de módulo marcados. **El núcleo no va aquí**: entra siempre.
   *
   * <p>Vacío cuando la elección se hizo sobre un paquete cerrado —una tarjeta de
   * la portada, el selector de la rama de recuperación—: ahí no hubo casillas
   * que marcar y quien dice qué lleva dentro es `planCode`. Con `planCode` a
   * `null`, `[]` significa literalmente «solo el núcleo», que es una compra
   * válida.
   */
  modulos: string[]
}

/**
 * Una propuesta a medida del asistente.
 *
 * <p>Lleva **una referencia y ni una cifra del carrito**, y esa es toda la
 * decisión de diseño. Arrastrar las líneas y los totales por el almacenamiento
 * crearía una segunda verdad sobre unos importes que el servidor puede haber
 * repreciado —el prospecto puede editar la propuesta en otra pestaña, o volver
 * dos días después—, y esa segunda verdad envejecería en silencio dentro de la
 * pantalla que decide una compra. El paso 6 **vuelve a preguntar** con
 * `GET /assistant/proposal?token=…` y pinta lo que conteste el servidor.
 */
export interface IntencionPropuesta extends IntencionBase {
  origen: 'PROPUESTA'
  /**
   * El identificador OPACO de cliente de la propuesta (`Propuesta.id`), **no el
   * token**. El token no sale del seam del asistente ni entra en ningún store;
   * ver la cabecera de `asistente.source.ts`. Con esto en la mano no se puede
   * acreditar nada ante el servidor: solo pedirle al seam que relea.
   */
  propuestaId: string
}

/**
 * Lo que el prospecto eligió ANTES de tener sesión: **un plan, o una propuesta**.
 *
 * <p>Es una **intención**, no un compromiso, y así se rotula en pantalla: es
 * reversible y no tiene consecuencia. El acto vinculante ocurre después de
 * autenticarse, y no puede ocurrir antes: el registro es Opción B (sin
 * auto-login, con verificación por correo), así que firmar en la zona pública
 * dejaría una aceptación sin `acceptedByEmail` ni `acceptedIp` — los dos campos
 * que el modelo exige como prueba y que pone el SERVIDOR desde la petición, no
 * el formulario.
 *
 * <p>Unión discriminada y no una `propuestaId` opcional: la mitad de los sitios
 * que la consumen tienen que hacer una cosa distinta en cada rama —el resumen
 * se relee del servidor o se arma del catálogo, las líneas de la oferta salen
 * de la propuesta o de la selección—, y un campo nulable los habría dejado
 * compilando con la rama que falta sin escribir.
 */
export type IntencionContratacion = IntencionPlan | IntencionPropuesta

/** La selección tal como la manipulan la landing y `/planes`, sin metadatos. */
export interface SeleccionContratacion {
  /** El paquete que la selección reproduce, o `null`. Ver {@link IntencionPlan.planCode}. */
  planCode: string | null
  /** Los módulos marcados. Ver {@link IntencionPlan.modulos}. */
  modulos: string[]
  ciclo: Ciclo
  sedes: number
  usuarios: number
}

/** Las cantidades y el ciclo, que son lo único que las dos formas preguntan igual. */
export interface CapacidadesElegidas {
  ciclo: Ciclo
  sedes: number
  usuarios: number
}

/** Una línea del plan con su fecha de fin de prueba resuelta. */
export interface LineaPrueba {
  code: string
  /** Nombre del módulo. Siempre delante de la fecha: nunca «tu prueba vence el 11». */
  name: string
  /**
   * ISO date del ÚLTIMO día de prueba, **inclusive**. Se redacta «gratis hasta
   * el 11», no «hasta el 12»: equivocarse aquí es equivocarse en un día de cobro.
   *
   * <p>No basta por sí solo para saber si HAY prueba: un módulo sin prueba deja
   * esta fecha en el día de inicio, que es indistinguible de una prueba de cero
   * días. Para eso está `trialDays`.
   */
  trialEndDate: string
  /**
   * Los días de prueba que el catálogo concede a ese artículo, o `null` cuando no
   * concede ninguno (`trial_eligibility = 'NEVER_FREE'`).
   *
   * <p>Existe porque `trialEndDate` solo no distingue «sin prueba» de «prueba que
   * acaba hoy», y esa diferencia se ve en pantalla. `ELECTRONIC_INVOICING` es
   * NEVER_FREE en el catálogo: sin este campo, la tabla del paso 6 rotularía
   * «Facturación electrónica DIAN — gratis hasta el 29 de agosto» sobre un módulo
   * que se cobra desde el primer día, que es exactamente la promesa que este
   * cambio existe para retirar.
   */
  trialDays: number | null
  /** Lo que se cobra por esa línea cuando termine la prueba, o `null` si va incluida. */
  precioDespues: number | null
}

/** Una línea de lo que se va a contratar, tal como se pinta y tal como se envía. */
export interface LineaContratada {
  code: string
  nombre: string
  /**
   * `MODULE`, `CAPACITY`, `BUNDLE` u `ONE_TIME`, del servidor. `null` si no lo
   * dijo.
   *
   * <p>Se pinta porque una capacidad cotizada —«5 usuarios»— no es una
   * funcionalidad, y en la tabla del paso vinculante las dos filas serían
   * indistinguibles. Ver {@link PropuestaLinea.tipo} para por qué es `string`.
   */
  tipo: string | null
  /**
   * Cuántas unidades. Es la que viaja como `quantity` en la oferta, así que no
   * es solo presentación: una cantidad mal traída aquí es una cantidad mal
   * cobrada.
   */
  cantidad: number
  /**
   * Importe **unitario** del servidor, o `null` si no lo publicó.
   *
   * <p>No se multiplica por {@link cantidad} en ningún sitio del front: eso es
   * aritmética de dinero en el cliente, que es exactamente lo que este embudo no
   * hace. Cuando la cantidad pasa de uno se pinta al lado, para que el importe
   * se pueda leer.
   */
  importe: number | null
}

/** El resumen VINCULANTE del paso 6. Lo calcula el servidor, no el front. */
interface ResumenBase {
  empresaNombre: string
  empresaIdentificador: string
  /**
   * Qué se está contratando, en una frase: el nombre del paquete, o «Tu
   * propuesta a medida».
   *
   * <p>Se llamaba `planNombre` y el nombre dejó de ser verdad en cuanto el
   * resumen pudo venir de una propuesta: un campo llamado «nombre del plan»
   * conteniendo «Tu propuesta a medida» es la clase de mentira pequeña con la
   * que se empieza a no poder confiar en un tipo.
   */
  titulo: string
  ciclo: Ciclo
  /**
   * Los tres importes son NULABLES, y los tres a la vez: `null` significa que la
   * selección incluye una capacidad que se cobra y que la lista de precio no
   * publica en el ciclo elegido. No es un fallo de carga ni un cero — es que esa
   * combinación no tiene precio y la autocontratación la rechazaría
   * (`lineasDeContratacion` explica por qué el servidor hunde la oferta entera).
   * El paso 6 esconde el botón de confirmar en ese caso, igual que hace cuando
   * falta el permiso.
   */
  subtotal: number | null
  impuesto: number | null
  /**
   * Porcentaje, 0-100. **`null` cuando la fuente no lo publica**, y entonces la
   * tabla escribe «IVA» a secas con el importe al lado.
   *
   * <p>Era `number` porque la única fuente era `PublicPlan.taxRate`. La
   * propuesta del asistente no lo trae: `AssistantProposalResponse` publica
   * `subtotal`, `taxes` y `total` pero ningún tipo impositivo, y el único
   * `taxRate` del contrato es por línea y sin escala declarada —un `BigDecimal`
   * que puede valer `0.19` o `19`—. Deducirlo aquí sería inventar un «IVA 19 %»
   * en la pantalla que decide una compra, y equivocarse por un factor de cien.
   */
  tasaImpuesto: number | null
  total: number | null
  /** El mismo importe normalizado a mes, para comparar contra la intención. */
  subtotalMensualEquivalente: number | null
  /**
   * Los ejes de capacidad que se cobran aparte y que la lista de precio no
   * publica en el ciclo elegido. Vacío en el caso normal. Es lo que convierte el
   * `null` de los importes en una frase que se puede leer, en vez de un hueco.
   */
  sinPrecio: CapacityUnit[]
  lineasPrueba: LineaPrueba[]
  /**
   * Si la empresa ya tiene plan, **según el servidor** (`GET /subscriptions/current`).
   *
   * <p>Era un `boolean` alimentado por una bandera en memoria que volvía a `false` en cada
   * recarga: el caso 6 de §5 solo saltaba si el usuario acababa de contratar en esa misma
   * pestaña. Hoy es la señal real, y con la tercera rama que hace falta —`DESCONOCIDO`, cuando
   * el rol no puede leer la suscripción— para no tratar un 403 como «no tiene plan».
   */
  estadoPlanActual: EstadoPlanActual
}

/** El resumen de un paquete del catálogo, o de una selección de módulos. */
export interface ResumenPlan extends ResumenBase {
  origen: 'PLAN'
  /**
   * Con esto se resuelve el plan entero (`findByCode`) para armar las líneas de
   * la oferta. `null` cuando la selección no reproduce ningún paquete: entonces
   * las líneas salen del catálogo comercial y los importes de
   * `POST /quotes/preview`. Ver {@link IntencionPlan.planCode}.
   */
  planCode: string | null
  /** Los módulos marcados, tal como los guardó la intención. */
  modulos: string[]
  /**
   * El desglose que devolvió el servidor, **solo en la rama modular**.
   *
   * <p>Vacío en la del paquete, y no por descuido: un paquete es UNA línea con
   * un precio de entrada con descuento, y sus componentes no tienen importe
   * propio que enseñar (`bundle_components`). Repartirlo entre los módulos sería
   * inventar un desglose que ninguna fuente publica.
   */
  lineas: LineaContratada[]
  /**
   * Las cantidades contratadas de cada eje, y **solo de esta rama**.
   *
   * <p>Estaban en `ResumenBase`, y ahí eran una mentira de tipo: en la rama del
   * plan `lineasDeContratacion` las convierte en líneas de la oferta —`{code:
   * 'EXTRA_USER', quantity: 5}`— y el servidor cobra por ellas; en la de la
   * propuesta la oferta son `lineasDePropuesta`, que no las mira, así que ni
   * viajan ni se cobran. Con el campo compartido, el paso 6 pintaba «Sedes 3 /
   * Personas 8» bajo «Lo que vas a contratar» para una propuesta cuya oferta
   * pedía `EXTRA_USER × 3`: dos cifras distintas del mismo hecho, en la pantalla
   * vinculante, y la que se cobraba era la que no se leía.
   *
   * <p>Vive aquí para que volver a pintarlas en la otra rama no compile.
   */
  sedes: number
  usuarios: number
}

/**
 * El resumen de una propuesta a medida.
 *
 * <p>Sus importes y sus líneas **son los que el servidor acaba de devolver**, no
 * los que se guardaron al elegir. Por eso lleva {@link version}: es el bloqueo
 * optimista con el que se detecta que la propuesta se editó desde otra pestaña
 * mientras esta estaba abierta.
 */
export interface ResumenPropuesta extends ResumenBase {
  origen: 'PROPUESTA'
  propuestaId: string
  /** El bloqueo optimista del servidor, tal como llegó en la relectura. */
  version: number
  /** Las líneas del carrito, del servidor. Son las que viajan a la oferta. */
  lineas: LineaContratada[]
}

export type ResumenContratacion = ResumenPlan | ResumenPropuesta

/**
 * Lo que devuelve la contratación.
 *
 * <p>`subtotal`, `impuesto` y `total` son **los del servidor**: los congela la oferta contra la
 * tarifa vigente, no los calcula la lista de precio transcrita. Los tres campos de la oferta
 * —id, número y vigencia— existen para que la pantalla de éxito pueda decir qué quedó registrado
 * y hasta cuándo vale, en vez de pedir al usuario que describa su compra por correo.
 */
export interface ResultadoContratacion {
  /** Un paquete, o una propuesta a medida. La pantalla de éxito lo redacta distinto. */
  origen: OrigenIntencion
  /** Qué quedó reservado: el nombre del paquete, o «Tu propuesta a medida». */
  titulo: string
  empresaNombre: string
  modulosActivados: string[]
  lineasPrueba: LineaPrueba[]
  /**
   * Nulables, y no por el mismo motivo que los del resumen: aquí el `null` es el
   * suelo de tipos del contrato. springdoc no marca requerido ningún campo de un
   * `record`, así que `QuoteResponse.subtotalAmount` es opcional; si el servidor
   * no lo manda y el estimado local tampoco existe, no hay importe. La pantalla
   * de éxito escribe `—` antes que un cero que el cliente leería como «no me
   * cobran nada».
   */
  subtotal: number | null
  impuesto: number | null
  total: number | null
  ciclo: Ciclo
  /** Id de la oferta emitida. Referencia interna: **no se pinta**. */
  cotizacionId: number
  /**
   * El número de la oferta, que es lo que SÍ se pinta: es la referencia con la que soporte
   * encuentra la contratación sin preguntar nada más. Nulo si el servidor no lo devolvió — el
   * contrato lo declara opcional.
   */
  cotizacionNumero: string | null
  /** ISO date hasta la que vale la oferta (15 días desde hoy, los pone el servidor). */
  validaHasta: string | null
}
