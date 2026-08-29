/**
 * Cotizaciones (propuestas) y su aceptación.
 *
 * <p><b>La plataforma propone, la clínica acepta.</b> `POST /quotes` y `GET /quotes/platform`
 * son de sistema: el tenant no se cotiza solo ni añade líneas. Por eso aquí hay tipos de
 * lectura y un único tipo de petición, el de aceptar.
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
