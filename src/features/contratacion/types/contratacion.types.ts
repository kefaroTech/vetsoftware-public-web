import type { CapacityUnit, Ciclo } from '@/features/landing/types/plans.types'
import type { EstadoPlanActual } from '@/features/suscripcion/composables/estadoSuscripcion'

export type { EstadoPlanActual }

/**
 * Lo que el prospecto eligió ANTES de tener sesión.
 *
 * Es una **intención**, no un compromiso, y así se rotula en pantalla: es
 * reversible y no tiene consecuencia. El acto vinculante ocurre después de
 * autenticarse, y no puede ocurrir antes: el registro es Opción B (sin
 * auto-login, con verificación por correo), así que firmar en la zona pública
 * dejaría una aceptación sin `acceptedByEmail` ni `acceptedIp` — los dos campos
 * que el modelo exige como prueba y que pone el SERVIDOR desde la petición, no
 * el formulario.
 */
export interface IntencionContratacion {
  planCode: string
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

/** La selección tal como la manipulan la landing y `/planes`, sin metadatos. */
export interface SeleccionContratacion {
  planCode: string
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

/** El resumen VINCULANTE del paso 6. Lo calcula el servidor, no el front. */
export interface ResumenContratacion {
  empresaNombre: string
  empresaIdentificador: string
  planCode: string
  planNombre: string
  ciclo: Ciclo
  sedes: number
  usuarios: number
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
  tasaImpuesto: number
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

/**
 * Lo que devuelve la contratación.
 *
 * <p>`subtotal`, `impuesto` y `total` son **los del servidor**: los congela la oferta contra la
 * tarifa vigente, no los calcula la lista de precio transcrita. Los tres campos de la oferta
 * —id, número y vigencia— existen para que la pantalla de éxito pueda decir qué quedó registrado
 * y hasta cuándo vale, en vez de pedir al usuario que describa su compra por correo.
 */
export interface ResultadoContratacion {
  planNombre: string
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
