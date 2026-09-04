/**
 * Tipos del módulo Facturación electrónica (DIAN). Espejo de los DTO del backend
 * (com.vetsoftware.app.{electronicdocument,dianprovider,numberingresolution,
 * withholdingconfig,companytaxprofile,economicactivity,salesreport}).
 *
 * Notas de contrato:
 * - `id: number` (el backend usa Long autogenerado).
 * - El DTO de documento NO expone `pdfRepresentation` ni `resolutionNumber` ni el
 *   motivo de rechazo (vive en la bitácora de transmisión). El QR sí: `qrUrl`.
 * - Los secretos del proveedor NUNCA se devuelven; el GET trae booleanos `*Configured`.
 * - El gating del módulo es por permisos (ver constants/permissions.ts); no hay
 *   bandera de capacidad en /auth/me.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export type DianStatus = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO' | 'CONTINGENCIA' | 'NO_ELECTRONICO'
export type ElectronicDocumentType = 'FE_VENTA' | 'DOC_EQUIV_POS' | 'NOTA_CREDITO' | 'NOTA_DEBITO'
export type PaymentForm = 'CONTADO'
export type PaymentMeans = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA'
export type TaxCategory = 'GRAVADO' | 'EXENTO' | 'EXCLUIDO' | 'INC'
export type TaxScheme = 'IVA' | 'INC'
export type CreditNoteReason = 'DEVOLUCION' | 'ANULACION' | 'REBAJA' | 'AJUSTE_PRECIO' | 'OTROS'
export type DebitNoteReason = 'INTERESES' | 'GASTOS' | 'CAMBIO_VALOR' | 'OTROS'
export type CompanyDocumentType = 'NIT' | 'CEDULA_CIUDADANIA' | 'CEDULA_EXTRANJERIA' | 'PASAPORTE'
export type TaxRegime = 'RESPONSABLE_IVA' | 'NO_RESPONSABLE_IVA'
export type ProviderType = 'MATIAS'
export type PersonType = 'NATURAL' | 'JURIDICA'

/**
 * Responsabilidad fiscal del adquiriente. Se envía **el nombre del enum**, no el código DIAN:
 * el `R-99-PN` / `O-13` / `O-15` que aparece en el RUT lo deriva el adaptador del proveedor a
 * partir de este valor.
 *
 * <p>TR-01: aquí estaba declarado como `string` y documentado como «código de responsabilidad
 * RUT (p. ej. "R-99-PN")». Quien siguiera ese comentario mandaba un código que el backend no
 * reconoce y que su parser tolerante convierte en `null` sin quejarse: el dato fiscal se perdía
 * camino a la factura. Lo destapó la atadura al contrato.
 */
export type FiscalResponsibility =
  'NO_APLICA' | 'GRAN_CONTRIBUYENTE' | 'AUTORRETENEDOR' | 'AGENTE_RETENCION_IVA' | 'REGIMEN_SIMPLE'

// ── Etiquetas legibles + tonos (de data-facturacion.jsx) ─────────────────────

export const DOC_TYPE_LABEL: Record<ElectronicDocumentType, string> = {
  FE_VENTA: 'Factura electrónica',
  DOC_EQUIV_POS: 'Documento POS',
  NOTA_CREDITO: 'Nota crédito',
  NOTA_DEBITO: 'Nota débito',
}

export interface StatusTone {
  bg: string
  fg: string
  dot: string
}

export const STATUS_META: Record<DianStatus, { label: string; tone: StatusTone }> = {
  PENDIENTE: {
    label: 'Validando…',
    tone: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(42% 0.14 240)', dot: 'oklch(55% 0.16 240)' },
  },
  VALIDADO: {
    label: 'Validado',
    tone: { bg: 'var(--success-50)', fg: 'var(--compras-ok-fg)', dot: 'var(--success-dot)' },
  },
  RECHAZADO: {
    label: 'Rechazado',
    tone: { bg: 'var(--danger-150)', fg: 'var(--danger-700)', dot: 'var(--danger-500)' },
  },
  CONTINGENCIA: {
    label: 'En contingencia',
    tone: { bg: 'var(--warning-50)', fg: 'var(--warning-900)', dot: 'var(--warning-border)' },
  },
  NO_ELECTRONICO: {
    label: 'No electrónico',
    tone: { bg: 'var(--warm-200)', fg: 'var(--warm-600)', dot: 'var(--warm-500)' },
  },
}

export const COMPANY_DOCTYPE_LABEL: Record<CompanyDocumentType, string> = {
  NIT: 'NIT (31)',
  CEDULA_CIUDADANIA: 'Cédula (13)',
  CEDULA_EXTRANJERIA: 'C. extranjería (22)',
  PASAPORTE: 'Pasaporte (41)',
}

export const TAX_REGIME_LABEL: Record<TaxRegime, string> = {
  RESPONSABLE_IVA: 'Responsable de IVA',
  NO_RESPONSABLE_IVA: 'No responsable de IVA',
}

export const PAYMENT_FORM_LABEL: Record<PaymentForm, string> = {
  CONTADO: 'Contado',
}

export const PAYMENT_MEANS_LABEL: Record<PaymentMeans, string> = {
  EFECTIVO: 'Efectivo (10)',
  TARJETA_DEBITO: 'T. débito (48)',
  TARJETA_CREDITO: 'T. crédito (49)',
  TRANSFERENCIA: 'Transferencia (42)',
}

export const CREDIT_REASON_LABEL: Record<CreditNoteReason, string> = {
  DEVOLUCION: 'Devolución (1)',
  ANULACION: 'Anulación (2)',
  REBAJA: 'Rebaja (3)',
  AJUSTE_PRECIO: 'Ajuste de precio (4)',
  OTROS: 'Otros (5)',
}

export const DEBIT_REASON_LABEL: Record<DebitNoteReason, string> = {
  INTERESES: 'Intereses (1)',
  GASTOS: 'Gastos (2)',
  CAMBIO_VALOR: 'Cambio de valor (3)',
  OTROS: 'Otros (4)',
}

// ── Documento electrónico (ElectronicDocumentDto) ────────────────────────────

export interface IssuerSnapshot {
  documentType: string
  documentId: string
  verificationDigit: string | null
  legalName: string | null
  taxRegime: string | null
  email: string | null
}

export interface CustomerSnapshot {
  documentType: string
  documentId: string
  verificationDigit: string | null
  personType: string | null
  legalName: string | null
  name: string | null
  email: string | null
}

export interface DocumentLine {
  id: number
  lineNumber: number
  description: string
  quantity: number
  unitMeasureCode: string
  unitPrice: number
  lineExtensionAmount: number
  taxCategory: TaxCategory
  taxScheme: TaxScheme | null
  taxRate: number | null
  taxAmount: number
  totalAmount: number
}

export interface DocumentPayment {
  id: number
  paymentMeans: PaymentMeans
  dianCode: string
  amount: number
}

export interface TaxTotalByRate {
  taxScheme: TaxScheme
  taxRate: number
  taxableAmount: number
  taxAmount: number
}

/** Referencia al documento corregido (solo en notas crédito/débito). */
export interface DocumentReference {
  cufe: string | null
  prefix: string | null
  number: number | null
  issueDate: string | null
}

export interface ElectronicDocumentResponse {
  id: number
  companyId: number
  openAccountId: number | null
  documentType: ElectronicDocumentType
  prefix: string | null
  consecutive: number | null
  issueDate: string
  issueTime: string
  cufe: string | null
  cude: string | null
  uuid: string | null
  qrUrl: string | null
  dianStatus: DianStatus
  dianValidationDate: string | null
  issuer: IssuerSnapshot
  customer: CustomerSnapshot
  lineExtensionAmount: number
  taxExclusiveAmount: number
  taxInclusiveAmount: number
  payableAmount: number
  reteFuenteAmount: number
  reteIvaAmount: number
  reteIcaAmount: number
  netPayableAmount: number
  paymentForm: PaymentForm
  lines: DocumentLine[]
  payments: DocumentPayment[]
  taxTotalsByRate: TaxTotalByRate[]
  reference: DocumentReference | null
  noteReasonCode: string | null
  noteReasonText: string | null
  reversed: boolean
  createdDate: string
  enabled: boolean
}

/** Request de emisión manual (companyId lo deriva el backend del JWT). */
export interface EmitElectronicDocumentRequest {
  openAccountId: number
  documentType: ElectronicDocumentType
  finalConsumer: boolean
}

/**
 * Cuerpo de `POST /electronic-documents/{id}/credit-note` (esquema
 * `IssueElectronicCreditNoteRequest`).
 *
 * <p>Hasta ahora este cuerpo se escribia en linea dentro del cliente y no tenia atadura posible:
 * el contrato publicaba bajo ese endpoint el `IssueCreditNoteRequest` de la facturacion de la
 * plataforma —`{ chargeIds }`—, que describe otra operacion. Con esquema propio ya existe el tipo
 * al que atarse, y renombrar `reason` en el `record` del backend pasa a romper la compilacion
 * aqui en vez de emitir una nota credito sin concepto DIAN.
 *
 * <p>`partialAmount` ausente ⇒ nota TOTAL (anulacion); presente ⇒ nota PARCIAL por ese importe.
 */
export interface IssueElectronicCreditNoteRequest {
  reason: CreditNoteReason
  partialAmount?: number
}

// ── Configuración: proveedor DIAN ────────────────────────────────────────────

export interface DianProviderConfigResponse {
  id: number
  companyId: number
  provider: ProviderType
  baseUrl: string
  clientId: string | null
  clientSecretConfigured: boolean
  usernameConfigured: boolean
  passwordConfigured: boolean
  apiTokenConfigured: boolean
  webhookSecretConfigured: boolean
  numberingProviderRef: string | null
  createdDate: string
  enabled: boolean
}

/** Los secretos vacíos/omitidos conservan el valor actual. */
export interface SaveDianProviderConfigRequest {
  provider: ProviderType
  baseUrl: string
  clientId?: string | null
  clientSecret?: string | null
  username?: string | null
  password?: string | null
  apiToken?: string | null
  webhookSecret?: string | null
  numberingProviderRef?: string | null
}

// ── Configuración: resoluciones de numeración ────────────────────────────────

export interface NumberingResolutionResponse {
  id: number
  company: { id: number; name: string; identifier: string }
  /** Multi-sucursal (B-6): sede (prefijo) de la resolución. null = resolución de empresa (todas las sedes). */
  branchId: number | null
  documentType: ElectronicDocumentType
  resolutionNumber: string
  resolutionDate: string
  prefix: string | null
  rangeFrom: number
  rangeTo: number
  validFrom: string
  validTo: string
  technicalKey: string | null
  currentNumber: number
  createdDate: string
  enabled: boolean
}

export interface SaveNumberingResolutionRequest {
  documentType: ElectronicDocumentType
  resolutionNumber: string
  resolutionDate: string
  prefix?: string | null
  rangeFrom: number
  rangeTo: number
  validFrom: string
  validTo: string
  technicalKey?: string | null
  /** Sede (opcional): prefijo por sucursal. Omitir/null = resolución de empresa (todas las sedes). */
  branchId?: number | null
}

// ── Configuración: retenciones ───────────────────────────────────────────────

export interface WithholdingConfigResponse {
  id: number
  companyId: number
  reteFuenteRate: number
  reteIvaRate: number
  reteIcaRate: number
  createdDate: string
  enabled: boolean
}

export interface SaveWithholdingConfigRequest {
  reteFuenteRate: number
  reteIvaRate: number
  reteIcaRate: number
}

// ── Configuración: perfil fiscal de la empresa ───────────────────────────────

export interface EconomicActivity {
  id: number
  code: string
  name: string
}

export interface CompanyTaxProfileResponse {
  id: number
  company: { id: number; name: string; identifier: string }
  companyDocumentType: CompanyDocumentType
  companyDocumentId: string
  companyDocumentVerificationDigit: string | null
  legalName: string
  taxRegime: TaxRegime
  fiscalEmail: string
  commercialName: string | null
  economicActivity: EconomicActivity | null
  responsibilities: string[]
  createdDate: string
  enabled: boolean
}

export interface SaveCompanyTaxProfileRequest {
  documentType: CompanyDocumentType
  companyDocumentId: string
  companyDocumentVerificationDigit?: string | null
  legalName: string
  taxRegime: TaxRegime
  fiscalEmail: string
  commercialName?: string | null
  economicActivityId?: number | null
  responsibilities: string[]
}

// ── Reportes ─────────────────────────────────────────────────────────────────

export interface SalesBookEntry {
  id: number
  documentType: string
  prefix: string | null
  consecutive: number | null
  issueDate: string
  customerDocumentId: string | null
  customerName: string | null
  base: number
  iva: number
  inc: number
  total: number
  payable: number
  reteFuente: number
  reteIva: number
  reteIca: number
  dianStatus: DianStatus
  cufe: string | null
  cude: string | null
}

export interface SalesBookTaxByRate {
  taxScheme: string
  taxRate: number
  taxableAmount: number
  taxAmount: number
}

export interface SalesBookRecaudo {
  paymentMeans: string
  dianCode: string
  amount: number
}

export interface SalesBookTotals {
  documentCount: number
  base: number
  iva: number
  inc: number
  total: number
  payable: number
  reteFuente: number
  reteIva: number
  reteIca: number
}

export interface SalesBookResponse {
  dateFrom: string
  dateTo: string
  entries: SalesBookEntry[]
  taxByRate: SalesBookTaxByRate[]
  recaudoByMeans: SalesBookRecaudo[]
  totals: SalesBookTotals
}

export interface ReconciliationPending {
  id: number
  documentType: string
  prefix: string | null
  consecutive: number | null
  issueDate: string
  dianStatus: DianStatus
  cufe: string | null
  cude: string | null
}

export interface ReconciliationResponse {
  dateFrom: string
  dateTo: string
  total: number
  validados: number
  rechazados: number
  contingencia: number
  pendientes: number
  needsAttention: ReconciliationPending[]
}
