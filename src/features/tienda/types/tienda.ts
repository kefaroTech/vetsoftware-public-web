/**
 * Tipos del módulo Tienda (Petshop). Espejo de los DTOs del backend
 * (com.vetsoftware.app.{product,service,promotion,productcategory,servicecategory,tax}).
 *
 * Nota: el backend serializa BigDecimal como number en JSON; los precios se
 * tipan como number en el front.
 */

/** Espejo de com.vetsoftware.app.infrastructure.web.PageResponse */
export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

export interface CompanySummary {
  id: number
  name: string
  identifier: string
}

/** Tributo DIAN de la tasa: IVA o INC (Impuesto Nacional al Consumo). */
export type TaxScheme = 'IVA' | 'INC'

export interface TaxSummary {
  id: number
  name: string
  percentage: number
  taxScheme: TaxScheme
}

export interface TaxResponse extends TaxSummary {
  company: CompanySummary
  createdDate: string
  enabled: boolean
  /** Optimistic locking (@Version): se reenvía en el PUT para detectar ediciones concurrentes. */
  version: number
}

/**
 * Clasificación tributaria del producto/servicio (espejo del enum del backend).
 * El IVA solo se extrae cuando es `GRAVADO`. `EXENTO`/`EXCLUIDO`/`INC` no
 * generan IVA contenido en el bruto.
 */
export type TaxTreatment = 'GRAVADO' | 'EXENTO' | 'EXCLUIDO' | 'INC'

// ── Categorías ─────────────────────────────────────────────────────────────

export interface CategorySummary {
  id: number
  name: string
}

export interface CategoryResponse {
  id: number
  name: string
  description: string
  company?: CompanySummary
  createdDate?: string
  enabled?: boolean
  /** Optimistic locking (@Version): se reenvía en el PUT para detectar ediciones concurrentes. */
  version: number
}

export interface CategoryPayload {
  name: string
  description: string
  /** Solo en UPDATE (PUT). El CREATE (POST) no la envía. */
  version?: number
}

// ── Productos ──────────────────────────────────────────────────────────────

export interface ProductResponse {
  id: number
  name: string
  code: string
  purchasePrice: number
  salePrice: number
  currentStock: number
  minStock: number
  provider: string | null
  taxTreatment: TaxTreatment
  /** Fecha real de vencimiento (ISO `yyyy-MM-dd`); null = no vence / no se rastrea. Opcional. */
  expireDate: string | null
  /** Número de lote/batch; null si no aplica. Opcional. */
  lotNumber: string | null
  notes: string | null
  productCategory: CategorySummary
  tax: TaxSummary | null
  company: CompanySummary
  createdDate: string
  enabled: boolean
  /** Optimistic locking (@Version): se reenvía en el PUT para detectar ediciones concurrentes. */
  version: number
}

export interface ProductPayload {
  name: string
  code: string
  purchasePrice: number
  salePrice: number
  currentStock: number
  minStock: number
  provider?: string | null
  taxTreatment: TaxTreatment
  expireDate?: string | null
  lotNumber?: string | null
  notes?: string | null
  productCategoryId: number
  taxId?: number | null
  /** Solo en UPDATE (PUT). El CREATE (POST) no la envía. */
  version?: number
}

export interface ProductSearchCriteria {
  name?: string | null
  code?: string | null
  productCategoryId?: number | null
  taxId?: number | null
  page?: number
  pageSize?: number
}

// ── Servicios ──────────────────────────────────────────────────────────────

export interface ServiceResponse {
  id: number
  name: string
  price: number
  taxTreatment: TaxTreatment
  notes: string | null
  serviceCategory: CategorySummary
  tax: TaxSummary | null
  company: CompanySummary
  createdDate: string
  enabled: boolean
  /** Optimistic locking (@Version): se reenvía en el PUT para detectar ediciones concurrentes. */
  version: number
}

export interface ServicePayload {
  name: string
  price: number
  taxTreatment: TaxTreatment
  notes?: string | null
  serviceCategoryId: number
  taxId?: number | null
  /** Solo en UPDATE (PUT). El CREATE (POST) no la envía. */
  version?: number
}

export interface ServiceSearchCriteria {
  name?: string | null
  serviceCategoryId?: number | null
  taxId?: number | null
  page?: number
  pageSize?: number
}

// ── Promociones ────────────────────────────────────────────────────────────

export type PromotionType = 'DISCOUNT' | 'SPECIAL_PRICE'
export type ApplicationType = 'CATEGORY' | 'PRODUCT' | 'SERVICE'
export type ValueType = 'PERCENTAGE' | 'VALUE'
/** Estado persistido por el backend. El estado "PROGRAMADA/VENCIDA" se deriva por fecha en el front. */
export type PromotionStatus = 'ACTIVE' | 'INACTIVE'

export interface PromotionResponse {
  id: number
  name: string
  promotionType: PromotionType
  applicationType: ApplicationType
  /** Id del producto/servicio/categoría destino, según applicationType. */
  applicationItem: number
  valueType: ValueType
  value: number
  startDate: string
  endDate: string
  promotionStatus: PromotionStatus
  company: CompanySummary
  createdDate: string
  enabled: boolean
}

export interface PromotionPayload {
  name: string
  promotionType: PromotionType
  applicationType: ApplicationType
  applicationItem: number
  valueType: ValueType
  value: number
  startDate: string
  endDate: string
  promotionStatus: PromotionStatus
}

/** Estado derivado por fecha (no persistido): para los badges de la UI. */
export type DerivedPromoStatus = 'ACTIVA' | 'PROGRAMADA' | 'VENCIDA' | 'INACTIVA'

// ── POS (ticket client-side, no persistido como entidad propia) ──────────────

export type SaleItemKind = 'product' | 'service'

export interface SaleLine {
  kind: SaleItemKind
  id: number
  name: string
  unitPrice: number
  qty: number
  taxTreatment: TaxTreatment
  taxPercentage: number
  taxName?: string
  /** Promo aplicada (si existe) — para mostrar precio tachado + ahorro. */
  promoName?: string
  originalUnitPrice?: number
}

/** Estado de stock derivado. */
export type StockState = 'OK' | 'BAJO' | 'AGOTADO'
