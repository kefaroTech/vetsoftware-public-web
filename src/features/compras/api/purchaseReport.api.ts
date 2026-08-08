import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'
import { withBranchParam } from '@/features/branches/api/branchContext'
import type { PurchaseBook } from '../types/compras'

// Libro de compras (backend: /purchase-reports). Reporte de solo lectura + export CSV/PDF.

export const purchaseReportApi = {
  async purchaseBook(from: string, to: string): Promise<PurchaseBook> {
    const { data } = await http.get<PurchaseBook>('/purchase-reports/purchase-book', {
      params: withBranchParam({ from, to }),
    })
    return data
  },

  /** Descarga el libro de compras (CSV/PDF) disparando la descarga en el navegador. */
  async export(from: string, to: string, format: 'csv' | 'pdf'): Promise<void> {
    const { data } = await http.get<Blob>('/purchase-reports/purchase-book/export', {
      params: withBranchParam({ from, to, format }),
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `libro_compras_${from}_${to}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
