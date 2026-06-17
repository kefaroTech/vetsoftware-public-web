// Impresión de recibos en impresora térmica (rollo 80mm) vía el diálogo de
// impresión del navegador. PublicFront es una SPA pura (sin Electron), así que
// no hay acceso nativo al puerto: armamos el HTML del ticket y lo mandamos a
// imprimir desde un <iframe> oculto. El iframe evita el bloqueo de popups y
// aísla el ticket del CSS global de la app (Vuetify, overlays, loader, etc.).
//
// Estos recibos son COMPROBANTES INTERNOS de venta/pago, no la representación
// gráfica fiscal DIAN (esa lleva CUFE/QR y se imprime aparte cuando el documento
// está VALIDADO).

export interface ReceiptLine {
  name: string
  qty?: number
  /** Importe ya formateado (p.ej. `formatMoney(...)`). */
  amount: string
}

export interface ReceiptSummaryRow {
  label: string
  /** Valor ya formateado. */
  value: string
  /** Resalta la fila (negrita + separador); úsalo para el total. */
  emphasis?: boolean
}

export interface ReceiptTicket {
  header: {
    companyName: string
    /** Identificador / NIT, si está disponible. */
    nit?: string
    address?: string
    /** Fecha/hora ya formateada, p.ej. "17 jun 2026, 15:18". */
    dateTime: string
    /** Cajero / quien atiende. */
    cashier?: string
  }
  /** Título del comprobante, p.ej. "Recibo de venta". */
  title?: string
  lines: ReceiptLine[]
  summary: ReceiptSummaryRow[]
  payment?: { method: string; change?: string }
  /** Pie de página, p.ej. "Comprobante de venta — no válido como factura". */
  footer?: string
}

/** CSS del ticket, embebido en el iframe (no hereda los estilos de la app). */
const TICKET_STYLES = `
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 58mm; background: #fff; }
  body {
    width: 100%; margin: 0; padding: 2mm 1.5mm;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 9.5px; line-height: 1.32; color: #000;
    /* Negrita por defecto: en térmica el trazo fino sale muy claro. */
    font-weight: 700;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .hdr { text-align: center; margin-bottom: 3px; }
  .hdr .name { font-size: 12px; }
  .hdr .meta { font-size: 8.5px; }
  .title { text-align: center; margin: 3px 0; text-transform: uppercase; font-size: 10px; }
  .row { display: flex; justify-content: space-between; gap: 4px; }
  .row .r { text-align: right; white-space: nowrap; }
  .line .nm { flex: 1; word-break: break-word; }
  .total { font-size: 11px; }
  .ftr { text-align: center; margin-top: 4px; font-size: 8.5px; }
  hr { border: 0; border-top: 1px solid #000; margin: 3px 0; }
`

/** Escapa texto para insertarlo de forma segura en el HTML del ticket. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHtml(t: ReceiptTicket): string {
  const h = t.header
  const headerMeta = [h.nit ? `NIT ${esc(h.nit)}` : '', h.address ? esc(h.address) : '']
    .filter(Boolean)
    .map((m) => `<div class="meta">${m}</div>`)
    .join('')

  const lines = t.lines
    .map((l) => {
      const qty = l.qty != null && l.qty !== 1 ? ` x${l.qty}` : ''
      return `<div class="row line"><span class="nm">${esc(l.name)}${qty}</span><span class="r">${esc(l.amount)}</span></div>`
    })
    .join('')

  const summary = t.summary
    .map(
      (s) =>
        `<div class="row ${s.emphasis ? 'total' : ''}"><span>${esc(s.label)}</span><span class="r">${esc(s.value)}</span></div>`,
    )
    .join('')

  const payment = t.payment
    ? `<hr /><div class="row"><span>Método</span><span class="r emph">${esc(t.payment.method)}</span></div>` +
      (t.payment.change != null
        ? `<div class="row"><span>Cambio</span><span class="r">${esc(t.payment.change)}</span></div>`
        : '')
    : ''

  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <title>Recibo</title><style>${TICKET_STYLES}</style></head><body>
    <div class="hdr">
      <div class="name">${esc(h.companyName)}</div>
      ${headerMeta}
      <div class="meta">${esc(h.dateTime)}</div>
      ${h.cashier ? `<div class="meta">Atiende: ${esc(h.cashier)}</div>` : ''}
    </div>
    ${t.title ? `<div class="title">${esc(t.title)}</div>` : ''}
    <hr />
    ${lines}
    ${lines ? '<hr />' : ''}
    ${summary}
    ${payment}
    ${t.footer ? `<div class="ftr">${esc(t.footer)}</div>` : ''}
  </body></html>`
}

export function useReceiptPrint() {
  function printReceipt(ticket: ReceiptTicket): void {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const cleanup = () => {
      // Demoramos la remoción: algunos navegadores siguen usando el iframe
      // mientras el diálogo de impresión está abierto.
      window.setTimeout(() => iframe.remove(), 1000)
    }

    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) {
        cleanup()
        return
      }
      win.onafterprint = cleanup
      win.focus()
      win.print()
    }

    const doc = iframe.contentWindow?.document
    if (!doc) {
      iframe.remove()
      return
    }
    doc.open()
    doc.write(buildHtml(ticket))
    doc.close()
  }

  return { printReceipt }
}
