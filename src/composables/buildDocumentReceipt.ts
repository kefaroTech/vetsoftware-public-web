// Constructor del tiquete a partir de un documento electrónico (ElectronicDocumentResponse).
// Fuente ÚNICA del recibo de venta: lo usan tanto el POS (ReceiptModal) como el cierre de cuenta
// (CloseAccountModal), así ambos imprimen exactamente el mismo recibo.

import { formatMoney } from '@/features/tienda/composables/pricing'
import {
  COMPANY_DOCTYPE_LABEL,
  DOC_TYPE_LABEL,
  PAYMENT_FORM_LABEL,
  PAYMENT_MEANS_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type ElectronicDocumentResponse,
  type TaxRegime,
} from '@/features/facturacion/types/facturacion'
import type {
  ReceiptLine,
  ReceiptTicket,
  ReceiptTotalRow,
  ReceiptWidth,
} from '@/composables/useReceiptPrint'

/** Quita el código DIAN entre paréntesis de las etiquetas (p.ej. "Efectivo (10)" → "Efectivo"). */
const cleanLabel = (s: string) => s.replace(/\s*\(\d+\)\s*$/, '')

export interface DocumentReceiptOptions {
  width: ReceiptWidth
  /** Efectivo recibido del comprador: muestra Recibido/Cambio. Null/omitido = pago exacto (sin esas filas). */
  change?: number | null
}

export function buildDocumentReceiptTicket(
  doc: ElectronicDocumentResponse,
  opts: DocumentReceiptOptions,
): ReceiptTicket {
  const issuer = doc.issuer
  const total = doc.payableAmount
  const hasNumber = doc.consecutive != null
  const docNumber = hasNumber ? `${doc.prefix ?? ''}${doc.consecutive}` : `Interno ${doc.id}`

  // Bloque fiscal del emisor.
  const fiscal: string[] = []
  if (issuer) {
    const docTypeShort = cleanLabel(
      COMPANY_DOCTYPE_LABEL[issuer.documentType as CompanyDocumentType] ?? issuer.documentType,
    )
    const taxId = `${docTypeShort} ${issuer.documentId}${issuer.verificationDigit ? `-${issuer.verificationDigit}` : ''}`
    const regime = issuer.taxRegime
      ? (TAX_REGIME_LABEL[issuer.taxRegime as TaxRegime] ?? issuer.taxRegime)
      : null
    fiscal.push(regime ? `${taxId} · ${regime}` : taxId)
    if (issuer.email) fiscal.push(issuer.email)
  }

  // Datos del documento.
  const meta: { label: string; value: string }[] = [
    { label: 'Fecha', value: `${doc.issueDate} ${(doc.issueTime ?? '').slice(0, 5)}`.trim() },
  ]
  const cust = doc.customer
  const custName = cust?.name || cust?.legalName
  if (custName) meta.push({ label: 'Cliente', value: custName })
  if (cust?.documentId) {
    meta.push({
      label: 'Documento',
      value: `${cust.documentId}${cust.verificationDigit ? `-${cust.verificationDigit}` : ''}`,
    })
  }

  const lines: ReceiptLine[] = doc.lines.map((l) => ({
    qty: `${l.quantity}×`,
    desc: l.description,
    sub: l.quantity > 1 ? `· ${formatMoney(l.unitPrice)} c/u` : undefined,
    amount: formatMoney(l.totalAmount),
  }))

  // El IVA va incluido en los precios; se muestra extraído.
  const iva = doc.taxInclusiveAmount - doc.taxExclusiveAmount
  const base = doc.taxExclusiveAmount
  const totals: ReceiptTotalRow[] = [
    { label: 'Subtotal (base)', value: formatMoney(base), kind: 'muted' },
    ...(iva > 0 ? [{ label: 'IVA', value: formatMoney(iva), kind: 'muted' as const }] : []),
    { label: 'TOTAL', value: formatMoney(total), kind: 'grand' as const },
  ]

  const meansLabel = doc.payments.length
    ? cleanLabel(PAYMENT_MEANS_LABEL[doc.payments[0].paymentMeans] ?? doc.payments[0].paymentMeans)
    : 'Pago'
  const formLabel = PAYMENT_FORM_LABEL[doc.paymentForm] ?? doc.paymentForm

  const tender: ReceiptTotalRow[] = []
  if (opts.change != null) {
    tender.push({ label: 'Recibido', value: formatMoney(total + opts.change), kind: 'pay' })
    tender.push({ label: 'Cambio', value: formatMoney(opts.change), kind: 'change' })
  }

  // Sello DIAN: solo cuando el documento ya fue validado (tiene CUFE/CUDE).
  // `||` y no `??`: el backend no normaliza el blanco a null —`MatiasInvoiceProvider.text()`
  // devuelve tal cual lo que manda el proveedor—, así que un CUFE de cadena vacía
  // satisface a `??` y dejaría el comprobante SIN sello, tapando un CUDE válido.
  const seal = doc.cufe || doc.cude || null
  const dian = seal
    ? {
        sealLabel: doc.cufe ? 'CUFE' : 'CUDE',
        seal,
        qrUrl: doc.qrUrl ?? undefined,
        info: doc.dianValidationDate
          ? [`Validado DIAN ${doc.dianValidationDate.slice(0, 16).replace('T', ' ')}`]
          : undefined,
      }
    : undefined

  return {
    width: opts.width,
    brand: { name: issuer?.legalName || 'Vetrina' },
    fiscal,
    docType: DOC_TYPE_LABEL[doc.documentType] ?? 'Comprobante',
    docNumber,
    meta,
    lines,
    totals,
    payPill: `${meansLabel} · ${formLabel}`,
    tender,
    dian,
    footer: {
      thanks: 'Gracias por su compra, vuelva pronto',
      lines: hasNumber ? undefined : ['Comprobante de venta · emisión a la DIAN pendiente'],
    },
  }
}
