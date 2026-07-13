import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { purchaseOrdersApi } from '../api/purchaseOrders.api'
import { goodsReceiptsApi } from '../api/goodsReceipts.api'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { GoodsReceipt, PurchaseOrder } from '../types/compras'

/**
 * Store de Compras (órdenes de compra + recepciones). Listas company-scoped; la sede se filtra en cliente por la
 * sede seleccionada. Recarga al cambiar de sede. Las vistas fuerzan `loadOrders`/`loadReceipts` en su montaje.
 */
export const usePurchasesStore = defineStore('purchases', () => {
  const orders = ref<PurchaseOrder[]>([])
  const receipts = ref<GoodsReceipt[]>([])
  const ordersLoading = ref(false)
  const receiptsLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadOrders(): Promise<void> {
    ordersLoading.value = true
    error.value = null
    try {
      orders.value = await purchaseOrdersApi.listByCompany()
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las órdenes de compra')
    } finally {
      ordersLoading.value = false
    }
  }

  async function loadReceipts(): Promise<void> {
    receiptsLoading.value = true
    error.value = null
    try {
      receipts.value = await goodsReceiptsApi.listByCompany()
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las recepciones')
    } finally {
      receiptsLoading.value = false
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
