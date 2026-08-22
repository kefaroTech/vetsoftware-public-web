import type { ElectronicDocumentType, PaymentMeans } from '@/features/facturacion/types/facturacion'

export type PosSaleLineKind = 'PRODUCT' | 'SERVICE' | 'GENERAL'

export interface PosSaleLineRequest {
  kind: PosSaleLineKind
  /** id del producto/servicio del catálogo (requerido para PRODUCT/SERVICE). */
  refId?: number | null
  /** descripción del ítem libre (requerido para GENERAL). */
  description?: string | null
  quantity: number
  /** precio final (post-promo) con IVA incluido. El backend extrae la base/IVA según el catálogo. */
  unitPrice: number
}

export interface PosSalePaymentRequest {
  means: PaymentMeans
  amount: number
}

export interface RegisterPosSaleRequest {
  documentType: ElectronicDocumentType
  /**
   * Sede que emite la venta y de cuyo saldo se descuenta el stock.
   *
   * No estaba declarado, así que el POS dependía en exclusiva de la inyección de
   * `withBranchBody` y el contrato lo llevaba escrito como hueco conocido. Sin
   * `branchId` el backend cae a la sede «Principal»
   * (`PosSaleDocumentBuilder.java:104-106`) mientras esta misma pantalla consulta
   * las existencias filtrando por la sede activa: la venta descuenta en una sede y
   * el cajero mira otra. Issue #191.
   */
  branchId?: number | null
  finalConsumer: boolean
  /** null o finalConsumer=true ⇒ consumidor final anónimo. */
  customerOwnerId?: number | null
  lines: PosSaleLineRequest[]
  payments: PosSalePaymentRequest[]
  /**
   * Idempotency key (UUID) generada una vez por apertura del cobro y reusada en los reintentos: si el POST se
   * reintenta tras perder la respuesta, el backend devuelve la venta ya emitida en vez de registrar/transmitir
   * otra a la DIAN.
   */
  clientRequestId?: string
}
