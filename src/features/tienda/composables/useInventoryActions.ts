import { ref, type Ref } from 'vue'
import { useTienda } from './useTienda'
import { useToast } from '@/composables/useToast'
import type { ProductResponse } from '../types/tienda'
import type { ReceiveDraft } from '../components/RestockModal.vue'
import type { AdjustDraft } from '../components/AdjustModal.vue'
import type { TransferDraft } from '../components/TransferModal.vue'
import type { ConsumeDraft } from '../components/ConsumeModal.vue'
import type { CountDraft } from '../components/CountSheetModal.vue'

/**
 * Operaciones de stock de `InventarioView`: entrada, ajuste, transferencia,
 * conteo, consumo, mínimo y alta/baja de producto y categoría.
 *
 * Los `ref` que apuntan al producto objetivo viven aquí junto a su manejador
 * porque son la misma cosa: `restockFor` es a la vez "qué modal está abierto" y
 * "sobre qué producto opera". Separarlos obligaría a pasarlos de ida y vuelta.
 *
 * Todos los manejadores comparten el mismo contrato: validan que haya sede
 * activa, llaman al store, avisan con un toast y cierran su modal. El error se
 * comunica siempre con `getProblemDetailMessage`, nunca con el error crudo.
 */
export function useInventoryActions(ctx: {
  branchId: Ref<number | null>
  branchName: Ref<string>
  reloadStock: () => Promise<void>
  minStockOf: (p: ProductResponse) => number
}) {
  const store = useTienda()
  const toast = useToast()

  const restockFor = ref<ProductResponse | null>(null)
  const adjustFor = ref<ProductResponse | null>(null)
  const transferFor = ref<ProductResponse | null>(null)
  const consumeFor = ref<ProductResponse | null>(null)
  const countOpen = ref(false)
  const pausing = ref<ProductResponse | null>(null)
  const pausingBusy = ref(false)

  const fail = (e: unknown, msg: string) => toast.errorFrom('Ocurrió un error', e, msg)

  async function onReceive(draft: ReceiveDraft) {
    const p = restockFor.value
    if (!p || ctx.branchId.value == null) return
    try {
      await store.receiveStock({
        branchId: ctx.branchId.value,
        productId: p.id,
        quantity: draft.quantity,
        unitCost: draft.unitCost,
        lotNumber: draft.lotNumber,
        expireDate: draft.expireDate,
      })
      toast.success('Entrada registrada', `Ingresaron ${draft.quantity} u. de ${p.name}.`)
      restockFor.value = null
    } catch (e) {
      fail(e, 'No se pudo registrar la entrada')
    }
  }

  async function onAdjust(draft: AdjustDraft) {
    const p = adjustFor.value
    if (!p || ctx.branchId.value == null) return
    try {
      await store.adjustStock({
        branchId: ctx.branchId.value,
        productId: p.id,
        delta: draft.delta,
        unitCost: draft.unitCost,
        reason: draft.reason,
      })
      toast.success('Ajuste aplicado', `${p.name}: ${draft.delta > 0 ? '+' : ''}${draft.delta} u.`)
      adjustFor.value = null
    } catch (e) {
      fail(e, 'No se pudo aplicar el ajuste')
    }
  }

  async function onTransfer(draft: TransferDraft) {
    const p = transferFor.value
    if (!p || ctx.branchId.value == null) return
    try {
      await store.transferStock({
        fromBranchId: ctx.branchId.value,
        toBranchId: draft.toBranchId,
        productId: p.id,
        quantity: draft.quantity,
        reason: draft.reason,
      })
      toast.success(
        'Transferencia realizada',
        `${draft.quantity} u. de ${p.name} enviadas a otra sede.`,
      )
      transferFor.value = null
    } catch (e) {
      fail(e, 'No se pudo transferir')
    }
  }

  /** Abre la hoja de conteo con el stock de la sede recién recargado. */
  async function openCount() {
    await ctx.reloadStock()
    countOpen.value = true
  }

  async function onRecordCount(draft: CountDraft) {
    if (ctx.branchId.value == null) return
    try {
      const view = await store.recordCount({
        branchId: ctx.branchId.value,
        note: draft.note,
        lines: draft.lines,
      })
      toast.success(
        'Conteo aplicado',
        view.adjustedLines > 0
          ? `${view.adjustedLines} ajuste(s) generado(s) en ${ctx.branchName.value}.`
          : `Todo cuadra en ${ctx.branchName.value}: sin ajustes.`,
      )
      countOpen.value = false
    } catch (e) {
      fail(e, 'No se pudo registrar el conteo')
    }
  }

  async function onConsume(draft: ConsumeDraft) {
    const p = consumeFor.value
    if (!p || ctx.branchId.value == null) return
    try {
      await store.consumeStock({
        branchId: ctx.branchId.value,
        productId: p.id,
        quantity: draft.quantity,
        reason: draft.reason,
      })
      toast.success('Consumo registrado', `${draft.quantity} u. de ${p.name} aplicadas.`)
      consumeFor.value = null
    } catch (e) {
      fail(e, 'No se pudo registrar el consumo')
    }
  }

  /** Fija el mínimo de la sede activa al perder foco. */
  async function onMinStockCommit(p: ProductResponse, ev: Event) {
    if (ctx.branchId.value == null) return
    const value = Math.max(0, Math.floor(Number((ev.target as HTMLInputElement).value) || 0))
    if (value === ctx.minStockOf(p)) return
    try {
      await store.setMinStock(p.id, ctx.branchId.value, value)
      toast.success('Mínimo actualizado', `${p.name}: mínimo ${value} u.`)
    } catch (e) {
      fail(e, 'No se pudo fijar el mínimo')
      await ctx.reloadStock()
    }
  }

  /** Pausar = soft-delete (DELETE → enabled=false). Recuperable desde "Pausados". */
  async function onConfirmPause() {
    const t = pausing.value
    if (!t) return
    pausingBusy.value = true
    try {
      await store.removeProduct(t.id)
      toast.info(
        'Producto pausado',
        `${t.name} dejó de aparecer en el punto de venta. Puedes reactivarlo cuando quieras.`,
      )
      pausing.value = null
    } catch (e) {
      fail(e, 'No se pudo pausar el producto')
    } finally {
      pausingBusy.value = false
    }
  }

  async function onReactivate(p: ProductResponse) {
    try {
      await store.enableProduct(p.id)
      toast.success('Producto reactivado', `${p.name} volvió al catálogo activo.`)
    } catch (e) {
      fail(e, 'No se pudo reactivar el producto')
    }
  }

  async function onCategoryUpsert(p: {
    id: number | null
    name: string
    description: string
    version?: number
  }) {
    try {
      if (p.id) await store.updateProductCategory(p.id, p.name, p.description, p.version ?? 0)
      else await store.createProductCategory(p.name, p.description)
      toast.success('Categoría guardada')
    } catch (e) {
      fail(e, 'No se pudo guardar la categoría')
    }
  }

  async function onCategoryRemove(id: number) {
    try {
      await store.removeProductCategory(id)
      toast.info('Categoría eliminada')
    } catch (e) {
      fail(e, 'No se pudo eliminar la categoría')
    }
  }

  return {
    restockFor,
    adjustFor,
    transferFor,
    consumeFor,
    countOpen,
    pausing,
    pausingBusy,
    onReceive,
    onAdjust,
    onTransfer,
    openCount,
    onRecordCount,
    onConsume,
    onMinStockCommit,
    onConfirmPause,
    onReactivate,
    onCategoryUpsert,
    onCategoryRemove,
  }
}
