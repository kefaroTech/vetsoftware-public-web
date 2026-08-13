import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { purchaseOrdersApi } from '../api/purchaseOrders.api'
import { goodsReceiptsApi } from '../api/goodsReceipts.api'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { GoodsReceipt, PurchaseOrder } from '../types/compras'
import { useLatestOnly } from '@/composables/useLatestOnly'

/**
 * Store de Compras (órdenes de compra + recepciones). Listas company-scoped; la sede se filtra en cliente por la
 * sede seleccionada. Recarga al cambiar de sede. Las vistas fuerzan `loadOrders`/`loadReceipts` en su montaje.
 */
export const usePurchasesStore = defineStore('purchases', () => {
  const orders = ref<PurchaseOrder[]>([])
  const receipts = ref<GoodsReceipt[]>([])
  const ordersLoading = ref(false)
  // Recarga al cambiar de sede: solo la ultima escribe.
  const ordersTurn = useLatestOnly()
  const receiptsTurn = useLatestOnly()
  const receiptsLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadOrders(): Promise<void> {
    const turno = ordersTurn.begin()
    ordersLoading.value = true
    error.value = null
    try {
      const rows = await purchaseOrdersApi.listByCompany()
      if (!turno()) return
      orders.value = rows
    } catch (e) {
      if (!turno()) return
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las órdenes de compra')
    } finally {
      if (turno()) ordersLoading.value = false
    }
  }

  async function loadReceipts(): Promise<void> {
    const turno = receiptsTurn.begin()
    receiptsLoading.value = true
    error.value = null
    try {
      const rows = await goodsReceiptsApi.listByCompany()
      if (!turno()) return
      receipts.value = rows
    } catch (e) {
      if (!turno()) return
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las recepciones')
    } finally {
      if (turno()) receiptsLoading.value = false
    }
  }

  watch(
    () => useBranchStore().selectedBranchId,
    () => {
      if (orders.value.length || ordersLoading.value) void loadOrders()
      if (receipts.value.length || receiptsLoading.value) void loadReceipts()
    },
  )

  return { orders, receipts, ordersLoading, receiptsLoading, error, loadOrders, loadReceipts }
})
