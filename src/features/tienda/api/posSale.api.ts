import { http, DIAN_TIMEOUT_MS } from '@/services/http/http.client'
import { withBranchBody } from '@/features/branches/api/branchContext'
import type {
  ElectronicDocumentResponse,
  ElectronicDocumentType,
  PaymentMeans,
} from '@/features/facturacion/types/facturacion'

// Registro de una venta de POS como documento electrónico (backend: POST /electronic-documents/from-sale).
// Empresas con el módulo FE lo transmiten a la DIAN; sin el módulo queda PENDIENTE (datos guardados).

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

export const posSaleApi = {
  async register(payload: RegisterPosSaleRequest): Promise<ElectronicDocumentResponse> {
    // Con el módulo de facturación electrónica esta llamada transmite a la DIAN
    // en línea, y el presupuesto del backend con el proveedor llega a 75 s. El
    // timeout por defecto abortaría la venta en el navegador con el documento ya
    // emitido; el `clientRequestId` protege el reintento, pero el cajero no
    // debería tener que reintentar de entrada.
    const { data } = await http.post<ElectronicDocumentResponse>(
      '/electronic-documents/from-sale',
      withBranchBody(payload),
      { timeout: DIAN_TIMEOUT_MS },
    )
    return data
  },
}
