import { computed, ref } from 'vue'
import { nextRowUid } from '@/composables/rowUid'
import { useToast } from '@/composables/useToast'
import { useCuentas } from './useCuentas'
import type { CreateGeneralChargePayload, OpenAccountResponse } from '../types/cuentas'

export type CartKind = 'service' | 'product' | 'general'

export interface CartLine {
  /** Clave estable de la fila mientras el carrito esta abierto. Ver `rowUid`.
   *  No puede derivarse del contenido: dos cargos generales del mismo importe
   *  son dos cargos distintos y colisionarian. */
  uid: number
  kind: CartKind
  /** id del catálogo (service/product); null para general. */
  refId: number | null
  name: string
  unitPrice: number
  qty: number
  /** animalId destino (service/product); null para general. */
  animalId: number | null
  animalName: string | null
  /** Solo para general. */
  taxId?: number | null
  hasTax?: boolean
}

type ChargeOp =
  | { type: 'product' | 'service'; animalId: number; refId: number; reqId: string; done: boolean }
  | {
      type: 'general'
      payload: Omit<CreateGeneralChargePayload, 'openAccountId'>
      reqId: string
      done: boolean
    }

/**
 * Carrito de cargos de "Abrir cuenta" y su persistencia idempotente.
 *
 * Sale de `OpenAccountModal` porque eran ~130 líneas con una responsabilidad
 * propia. Lo importante al tocarlo es el contrato de reintento: la cuenta se
 * crea **una sola vez** (`createdAccount`) y el carrito se aplana **una sola
 * vez** a operaciones (`pendingOps`), cada una con su `reqId` estable. Si un
 * POST falla a mitad, los marcadores sobreviven y reintentar salta lo ya hecho
 * reusando la misma clave — el backend no duplica ni aunque se pierda la
 * respuesta.
 */
export function useOpenAccountCart() {
  const store = useCuentas()
  const toast = useToast()

  const cart = ref<CartLine[]>([])
  const busy = ref(false)
  const createdAccount = ref<OpenAccountResponse | null>(null)
  const pendingOps = ref<ChargeOp[]>([])

  const total = computed(() => cart.value.reduce((sum, l) => sum + l.unitPrice * l.qty, 0))

  /** Hubo una creación parcial: la cuenta existe pero faltan cargos por persistir. */
  const retryHint = computed(
    () => !busy.value && !!createdAccount.value && pendingOps.value.some((o) => !o.done),
  )

  function addCatalogItem(
    item: { id: number; name: string; price: number; soldOut: boolean },
    kind: Exclude<CartKind, 'general'>,
    animalId: number,
    animalName: string | null,
  ) {
    if (item.soldOut) return
    const line = cart.value.find(
      (l) => l.kind === kind && l.refId === item.id && l.animalId === animalId,
    )
    if (line) line.qty += 1
    else
      cart.value.push({
        uid: nextRowUid(),
        kind,
        refId: item.id,
        name: item.name,
        unitPrice: item.price,
        qty: 1,
        animalId,
        animalName,
      })
  }

  function addGeneral(line: Omit<CartLine, 'uid' | 'kind' | 'refId' | 'animalId' | 'animalName'>) {
    cart.value.push({
      ...line,
      uid: nextRowUid(),
      kind: 'general',
      refId: null,
      animalId: null,
      animalName: null,
    })
  }

  function lineLabel(line: CartLine): string {
    return line.kind === 'general' ? 'General' : (line.animalName ?? 'Mascota')
  }

  function setQty(line: CartLine, n: number) {
    const q = Math.max(0, Math.floor(n) || 0)
    if (q <= 0) cart.value = cart.value.filter((l) => l !== line)
    else line.qty = q
  }

  function removeLine(line: CartLine) {
    cart.value = cart.value.filter((l) => l !== line)
  }

  function reset() {
    cart.value = []
    busy.value = false
    createdAccount.value = null
    pendingOps.value = []
  }

  /** Aplana el carrito a POSTs individuales (1 cargo por unidad); base de la idempotencia. */
  function buildOps(): ChargeOp[] {
    const ops: ChargeOp[] = []
    for (const l of cart.value) {
      if (l.kind === 'general') {
        ops.push({
          type: 'general',
          payload: {
            name: l.name,
            unitAmount: l.unitPrice,
            quantity: l.qty,
            taxId: l.taxId ? Number(l.taxId) : null,
            hasTax: !!l.hasTax,
          },
          // Clave estable por op: un reintento tras fallo parcial la reusa → el backend no duplica.
          reqId: crypto.randomUUID(),
          done: false,
        })
      } else if (l.refId != null && l.animalId != null) {
        for (let i = 0; i < l.qty; i++) {
          ops.push({
            type: l.kind,
            animalId: l.animalId,
            refId: l.refId,
            reqId: crypto.randomUUID(),
            done: false,
          })
        }
      }
    }
    return ops
  }

  /** Crea la cuenta y persiste los cargos. Devuelve la cuenta fresca, o null si falló. */
  async function confirm(owner: { id: number; name: string }): Promise<OpenAccountResponse | null> {
    busy.value = true
    try {
      // 1. Crear la cuenta una sola vez (idempotente en reintento tras fallo parcial).
      if (!createdAccount.value) createdAccount.value = await store.openAccount(owner.id)
      const accountId = createdAccount.value.id

      // 2. Aplanar el carrito una sola vez; cada op se marca al persistirse.
      if (pendingOps.value.length === 0) pendingOps.value = buildOps()
      for (const op of pendingOps.value) {
        if (op.done) continue
        if (op.type === 'general') {
          await store.addGeneralChargeNoRefresh({
            ...op.payload,
            openAccountId: accountId,
            clientRequestId: op.reqId,
          })
        } else {
          await store.addChargeUnit(accountId, op.animalId, op.type, op.refId, op.reqId)
        }
        op.done = true
      }

      // 3. Refrescar una sola vez al final.
      await store.refreshAccount(accountId)
      const fresh = store.accounts.value.find((a) => a.id === accountId) ?? createdAccount.value
      const count = pendingOps.value.length
      toast.success('Cuenta abierta', `${owner.name} con ${count} cargo${count === 1 ? '' : 's'}.`)
      return fresh
    } catch (e) {
      // Los marcadores (createdAccount + ops.done) persisten → el reintento salta lo ya guardado.
      toast.errorFrom('Ocurrió un error', e, 'No se pudo abrir la cuenta')
      return null
    } finally {
      busy.value = false
    }
  }

  return {
    cart,
    busy,
    total,
    createdAccount,
    pendingOps,
    retryHint,
    addCatalogItem,
    addGeneral,
    lineLabel,
    setQty,
    removeLine,
    reset,
    confirm,
  }
}
