/**
 * Cotizaciones (propuestas) y su aceptación.
 *
 * <p><b>Hay dos caminos y no se mezclan.</b> El de plataforma —`POST /quotes`,
 * `GET /quotes/platform`— sigue siendo de sistema: ahí viajan `priceListId`, `validUntil`,
 * `trialDays` y el descuento de cada línea, y por eso el tenant no lo alcanza. El de
 * autoservicio —`POST /quotes/self-serve`— sí lo alcanza la clínica, y su cuerpo no declara
 * **ni un solo campo económico**: solo qué artículo y cuántos. Un `@PreAuthorize` evalúa quién
 * llama y no qué trae el cuerpo, así que la garantía no es un gate sino el tipo, y por eso son
 * dos peticiones distintas en vez de una con permisos distintos.
 */

/**
 * `DRAFT` **no se lista**: es el borrador de plataforma y no le concierne a la clínica. El
 * rótulo en español de cada uno vive en `cotizacionesText.ts`; el nombre del enum no se enseña.
 */
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

/** Solo para satisfacer el contrato: el tenant es una sola empresa y esto no se pinta. */
export interface QuoteCompanySummary {
  id: number
  name: string
  identifier: string
}

/** Una línea de la propuesta: qué incluye y a cuánto sale. */
export interface QuoteLineResponse {
  id?: number
  lineNumber?: number
  catalogItemId?: number
  itemCode?: string
  itemName?: string
  itemType?: string
  tierMin?: number
  tierMax?: number
  contractedQuantity?: number
  includedQuantity?: number
  quantity?: number
  unitAmount?: number
  grossAmount?: number
  discountPercent?: number
  discountAmount?: number
  discountIsConditional?: boolean
  taxRate?: number
  taxTreatment?: string
  taxableBase?: number
  taxAmount?: number
  lineTotal?: number
  enabled?: boolean
}

/** Respuestas del configurador. **No se pintan**: son notas internas del comercial. */
export interface QuoteAnswerResponse {
  id?: number
  questionId?: number
  optionId?: number
  questionCode?: string
  answerValue?: string
  enabled?: boolean
}

export interface QuoteSummaryResponse {
  id: number
  quoteNumber?: string
  /** **NO se pinta**: el tenant es una sola empresa. */
  company?: QuoteCompanySummary
  prospectName?: string
  prospectEmail?: string
  /** **NO se pinta**: referencia interna de plataforma. */
  priceListId?: number
  billingCycle?: string
  subtotalAmount?: number
  discountAmount?: number
  taxAmount?: number
  totalAmount?: number
  status?: QuoteStatus
  validUntil?: string
  trialDays?: number
  acceptedAt?: string
  createdDate?: string
  enabled?: boolean
}

/**
 * `GET /quotes/{id}`.
 *
 * <p>`acceptedIp` se declara y **no se pinta**, igual que `clientRequestId`: la IP y la marca de
 * tiempo de la aceptación las escribe el servidor. Una prueba que teclea el cliente no prueba
 * nada, así que el formulario de aceptar no tiene campo de IP — pedirla sería fabricar
 * evidencia.
 */
export interface QuoteResponse {
  id: number
  quoteNumber?: string
  /** **NO se pinta**: el tenant es una sola empresa. */
  company?: QuoteCompanySummary
  prospectName?: string
  prospectEmail?: string
  prospectDocument?: string
  prospectPhone?: string
  /** **NO se pinta**: referencia interna de plataforma. */
  priceListId?: number
  billingCycle?: string
  subtotalAmount?: number
  discountAmount?: number
  taxAmount?: number
  totalAmount?: number
  status?: QuoteStatus
  validUntil?: string
  trialDays?: number
  acceptedAt?: string
  acceptedByEmail?: string
  /** **NO se pinta**: la escribe el servidor, no el cliente. */
  acceptedIp?: string
  /** **NO se pinta**: idempotencia interna. */
  clientRequestId?: string
  /** Suelto para `MatchesContract`: se lee siempre con `Array.isArray`. */
  lines?: QuoteLineResponse[]
  /** **NO se pintan**: notas internas del comercial. */
  answers?: QuoteAnswerResponse[]
  createdDate?: string
  enabled?: boolean
}

/**
 * `POST /quotes/{id}/accept`. Solo lleva el correo de quien acepta: **la IP y la marca de tiempo
 * las pone el servidor**.
 */
export interface AcceptQuoteRequest {
  acceptedByEmail: string
}

/**
 * Una línea de la autocontratación: **qué artículo y cuántos**, y nada más.
 *
 * <p>`code` es el rótulo del catálogo público, no un id. El servidor lo traduce contra el mismo
 * conjunto que publica `GET /plans` y responde lo mismo para un código inexistente que para uno
 * interno, así que este campo no sirve para enumerar el catálogo. Máximo 50 caracteres: es el
 * ancho exacto de `catalog_items.code`.
 *
 * <p>`quantity` es la cantidad **contratada**, no la extra: el servidor resta lo que el artículo
 * ya incluye (`TieredPrice.of` → `billableQuantity`) antes de repartir por tramos. Restarla
 * aquí la restaría dos veces.
 *
 * <p>El contrato lo declara opcional porque `int` primitivo no lleva `@NotNull`; aquí es
 * **requerido** a propósito, y esa estrechez es legítima: el borde REST lo valida `@Positive`, y
 * un cuerpo sin `quantity` llega a Java como `0` y se rechaza con un 400. Declararlo opcional
 * dejaría compilar exactamente esa petición.
 *
 * <p>Espeja `SelfServeQuoteLineRequest`.
 */
export interface SelfServeQuoteLineRequest {
  code: string
  quantity: number
}

/**
 * `POST /quotes/self-serve`. La clínica pide su propia oferta y la recibe ya emitida (`SENT`).
 *
 * <p><b>No lleva `companyId`</b> —la pone el servidor desde el principal— <b>ni ningún término
 * económico</b>: ni tarifa, ni vigencia, ni descuento, ni días de prueba. No es una omisión que
 * el servidor valide después: son campos que el tipo no tiene, así que no hay dónde escribirlos.
 *
 * <p>`billingCycle` **ya no es un estrechamiento local**: el contrato publica el esquema como
 * `enum: ["MONTHLY","ANNUAL"]` (springdoc lo deriva del `@Pattern(regexp = "MONTHLY|ANNUAL")`
 * del DTO), así que esta unión es una copia del contrato y no una decisión de este repositorio.
 * Aquí decía lo contrario: que un tercer ciclo se colaría en silencio porque el esquema seguiría
 * diciendo `string` y la atadura no miraría. Ya no es verdad — `MismatchedFields` compara la
 * unión contra la del contrato, así que **un tercer ciclo en el backend rompe este build**, con
 * el nombre del campo a la vista, y la unión se amplía aquí para volver a compilar.
 *
 * <p>Espeja `SelfServeQuoteRequest`.
 */
export interface SelfServeQuoteRequest {
  /** Llave de idempotencia del cliente. Máximo 64 caracteres. */
  clientRequestId: string
  billingCycle: 'MONTHLY' | 'ANNUAL'
  lines: SelfServeQuoteLineRequest[]
}
