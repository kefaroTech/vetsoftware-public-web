import type { RegisterPosSaleRequest } from '../types/posSale.types'
import { http, DIAN_TIMEOUT_MS } from '@/services/http/http.client'
import { withBranchBody } from '@/features/branches/api/branchContext'
import type { ElectronicDocumentResponse } from '@/features/facturacion/types/facturacion'

// Registro de una venta de POS como documento electrónico (backend: POST /electronic-documents/from-sale).
// Empresas con el módulo FE lo transmiten a la DIAN; sin el módulo queda PENDIENTE (datos guardados).

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
