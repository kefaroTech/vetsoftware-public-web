import { computed, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useFeUvt } from '@/features/facturacion/composables/useFeUvt'
import { posSaleApi, type PosSaleLineKind } from '../api/posSale.api'
import { appliesIva, lineGross, taxByRate, type TotalsBreakdown } from './pricing'
import { scaled as scaledMoney, sum as sumMoney } from './money'
import type { CatalogCard } from '../components/PosCatalog.vue'
import type { SaleLine } from '../types/tienda'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type {
  ElectronicDocumentResponse,
  PaymentMeans,
} from '@/features/facturacion/types/facturacion'

/** Método de pago del POS → medio de pago DIAN. */
const MEANS_BY_METHOD: Record<string, PaymentMeans> = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA_CREDITO',
  TRANSFERENCIA: 'TRANSFERENCIA',
}

export interface PosReceipt {
  lines: SaleLine[]
  totals: TotalsBreakdown
  method: string
  change: number | null
  document: ElectronicDocumentResponse | null
}

/**
 * Ticket del punto de venta: líneas, totales y registro de la venta.
 *
 * Sale de `POSView`. Dos reglas que conviene no perder al tocarlo:
 * - El POS **permite vender sin existencias** (stock negativo): agotado solo
 *   avisa, nunca bloquea ni topa la cantidad.
 * - `saleRequestId` se genera una vez al abrir el cobro y se reusa en los
 *   reintentos, porque el modal queda abierto tras un fallo. Así un reintento
 *   tras perder la respuesta no registra una segunda venta.
 */
export function usePosSale() {
  const toast = useToast()
  const { isOverThreshold } = useFeUvt()

  const lines = ref<SaleLine[]>([])
  const customer = ref<OwnerResponse | null>(null)
  const payOpen = ref(false)
  const paying = ref(false)
  const receiptOpen = ref(false)
  const receipt = ref<PosReceipt | null>(null)

  const saleRequestId = ref('')
  watch(payOpen, (open) => {
    if (open) saleRequestId.value = crypto.randomUUID()
  })

  function addToTicket(card: CatalogCard) {
    const kind = card.isService ? 'service' : 'product'
    const existing = lines.value.find((l) => l.kind === kind && l.id === card.id)
    if (existing) {
      existing.qty += 1
      return
    }
    lines.value.push({
      kind,
      id: card.id,
      name: card.name,
      unitPrice: card.price,
      qty: 1,
      taxTreatment: card.taxTreatment,
      taxPercentage: card.taxPercentage,
      taxName: card.taxName,
      promoName: card.promoName ?? undefined,
      originalUnitPrice: card.promoName ? card.basePrice : undefined,
    })
  }

  function inc(line: SaleLine) {
    line.qty += 1
  }
  function dec(line: SaleLine) {
    line.qty -= 1
    if (line.qty <= 0) removeLine(line)
  }
  function removeLine(line: SaleLine) {
    lines.value = lines.value.filter((l) => !(l.kind === line.kind && l.id === line.id))
  }

  // Subtotal BRUTO (IVA incluido), tras promo. No hay descuento manual: el
  // servidor valida cada unitPrice contra el catálogo (precio de lista +
  // promoción activa), así que solo las promociones reducen el precio.
  const grossSubtotal = computed(() =>
    sumMoney(lines.value.map((l) => lineGross(l.unitPrice, l.qty))),
  )
  const promoSavings = computed(() =>
    sumMoney(
      lines.value.map((l) =>
        l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice
          ? lineGross(l.originalUnitPrice - l.unitPrice, l.qty)
          : 0,
      ),
    ),
  )

  // IVA contenido por tasa, EXTRAÍDO del bruto. El agrupado vive en `pricing`
  // porque el cierre de cuenta calcula exactamente lo mismo: dos copias de una
  // regla fiscal es una de más.
  const taxRows = computed(() =>
    taxByRate(
      lines.value.map((l) => ({
        gross: lineGross(l.unitPrice, l.qty),
        ratePct: appliesIva(l.taxTreatment) ? l.taxPercentage : 0,
        label: l.taxName,
      })),
    ),
  )
  const taxTotal = computed(() => sumMoney(taxRows.value.map((g) => g.amount)))
  const total = computed(() => grossSubtotal.value)
  const baseTotal = computed(() => scaledMoney(grossSubtotal.value - taxTotal.value))
  const isEmpty = computed(() => lines.value.length === 0)

  async function confirmPay(method: string, received: number | null, blocked: boolean) {
    if (paying.value || blocked) return
    const totalNow = total.value
    const totals: TotalsBreakdown = {
      net: baseTotal.value,
      tax: taxTotal.value,
      total: totalNow,
      promoSavings: promoSavings.value,
    }
    // Cada unitPrice ya viene con la promoción aplicada (entero) por applyPromo;
    // se manda tal cual. El servidor lo valida contra el catálogo (lista + promo)
    // y extrae base/IVA.
    const saleLines = lines.value.map((l) => ({
      kind: (l.kind === 'service' ? 'SERVICE' : 'PRODUCT') as PosSaleLineKind,
      refId: l.id,
      quantity: l.qty,
      unitPrice: l.unitPrice,
    }))
    const snapshot = lines.value.map((l) => ({ ...l }))

    paying.value = true
    try {
      // > 5 UVT: la DIAN obliga a Factura electrónica (no POS) con cliente identificado.
      const electronic = isOverThreshold(totalNow)
      const document = await posSaleApi.register({
        documentType: electronic ? 'FE_VENTA' : 'DOC_EQUIV_POS',
        finalConsumer: electronic ? false : !customer.value,
        customerOwnerId: customer.value?.id ?? null,
        lines: saleLines,
        payments: [{ means: MEANS_BY_METHOD[method] ?? 'EFECTIVO', amount: totalNow }],
        clientRequestId: saleRequestId.value,
      })
      receipt.value = {
        lines: snapshot,
        totals,
        method,
        change: received != null ? Math.max(0, received - totalNow) : null,
        document,
      }
      payOpen.value = false
      receiptOpen.value = true
      lines.value = []
      customer.value = null
      if (document.dianStatus === 'VALIDADO') {
        toast.success('Venta registrada', 'Factura validada por la DIAN.')
      } else if (document.dianStatus === 'PENDIENTE') {
        toast.success('Venta registrada', 'Documento guardado · emisión a la DIAN pendiente.')
      } else {
        toast.success('Venta registrada', 'Documento generado.')
      }
    } catch (e) {
      // Se mantiene el ticket y el modal de cobro abiertos para reintentar.
      toast.errorFrom('No se pudo registrar la venta', e)
    } finally {
      paying.value = false
    }
  }

  return {
    lines,
    customer,
    payOpen,
    paying,
    receiptOpen,
    receipt,
    grossSubtotal,
    promoSavings,
    taxRows,
    total,
    baseTotal,
    isEmpty,
    addToTicket,
    inc,
    dec,
    removeLine,
    confirmPay,
  }
}
