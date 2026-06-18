// Impresión de recibos en impresora térmica (rollo 58/80mm) vía el diálogo de
// impresión del navegador. PublicFront es una SPA pura (sin Electron), así que
// no hay acceso nativo al puerto: armamos el HTML del ticket y lo mandamos a
// imprimir desde un <iframe> oculto. El iframe evita el bloqueo de popups y
// aísla el ticket del CSS global de la app (Vuetify, overlays, loader, etc.).
//
// El diseño imita el tiquete térmico clásico de POS: encabezado centrado con la
// identidad fiscal del emisor, bloque de datos del documento, detalle con
// columnas, medio de pago, totales (consumo/total/pago/cambio) y pie centrado.
//
// Estos recibos son COMPROBANTES de venta/pago. Cuando el documento DIAN está
// VALIDADO llevan su número fiscal; mientras esté PENDIENTE se imprime el aviso.

export interface ReceiptLine {
  name: string
  qty?: number
  /** Importe ya formateado (p.ej. `formatMoney(...)`). */
  amount: string
}

export interface ReceiptKeyValue {
  label: string
  /** Valor ya formateado. */
  value: string
  /** Resalta la fila (negrita + tamaño mayor); úsalo para el total. */
  emphasis?: boolean
}

export interface ReceiptTicket {
  header: {
    /** Razón social del emisor (línea grande). */
    legalName: string
    /** Nombre comercial, si difiere de la razón social. */
    commercialName?: string
    /** Documento fiscal ya formateado, p.ej. "NIT 901477435-6". */
    taxId?: string
    /** Régimen / responsabilidad, p.ej. "No responsable de IVA". */
    taxRegime?: string
    address?: string
    /** Ciudad - departamento. */
    city?: string
    phone?: string
  }
  /** Bloque de datos del documento (izquierda): tipo, número, fecha, forma de pago. */
  meta?: ReceiptKeyValue[]
  lines: ReceiptLine[]
  /** Total de las líneas del detalle (VLR TOTAL). */
  linesTotal?: ReceiptKeyValue
  /** Sección "Medio de pago". */
  payments?: ReceiptKeyValue[]
  /** Totales finales (Total consumo / Total / Pago / Cambio). */
  totals: ReceiptKeyValue[]
  /** Líneas de pie centradas (vendedor, software, etc.). */
  footerLines?: string[]
  /** Mensaje de agradecimiento centrado. */
  thanks?: string
  /** Nota legal pequeña (estado DIAN / comprobante). */
  note?: string
}

/** CSS del ticket, embebido en el iframe (no hereda los estilos de la app). */
const TICKET_STYLES = `
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 58mm; background: #fff; }
  body {
    width: 100%; margin: 0; padding: 2mm 1.5mm;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 9.5px; line-height: 1.3; color: #000;
    /* Negrita por defecto: en térmica el trazo fino sale muy claro. */
    font-weight: 700;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .hdr { text-align: center; }
  .hdr .name { font-size: 12px; text-transform: uppercase; }
  .hdr .sub { font-size: 9px; }
  .hdr .meta { font-size: 8.5px; }
  .hdr .regime { font-size: 8.5px; text-transform: uppercase; }

  /* Divisor de sección con etiqueta centrada (imita ====LABEL====). */
  .sec { display: flex; align-items: center; gap: 5px; margin: 4px 0;
         font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  .sec::before, .sec::after { content: ''; flex: 1; border-top: 3px double #000; }
  /* Doble línea sólida (imita la fila de ===). */
  .rule { border-top: 3px double #000; margin: 4px 0; }
  .dash { border-top: 1px dashed #000; margin: 3px 0; }

  .info div { display: block; }
  .info .k { font-size: 9px; }

  .row { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; }
  .row .r { text-align: right; white-space: nowrap; }
  .colhead { font-size: 8.5px; text-transform: uppercase; }
  .line .nm { flex: 1; word-break: break-word; }
  .emph { font-size: 11px; }

  .ftr { text-align: center; margin-top: 4px; font-size: 8.5px; }
  .ftr .thanks { margin-top: 3px; }
  .ftr .stars { letter-spacing: 1px; word-break: break-all; }
  .ftr .note { margin-top: 3px; font-size: 8px; }
`

/** Escapa texto para insertarlo de forma segura en el HTML del ticket. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function kvRow(kv: ReceiptKeyValue): string {
  return `<div class="row ${kv.emphasis ? 'emph' : ''}"><span>${esc(kv.label)}</span><span class="r">${esc(kv.value)}</span></div>`
}

function buildHtml(t: ReceiptTicket): string {
  const h = t.header
  const headerMeta = [
    h.taxId ? `<div class="meta">${esc(h.taxId)}</div>` : '',
    h.taxRegime ? `<div class="regime">${esc(h.taxRegime)}</div>` : '',
    h.address ? `<div class="meta">${esc(h.address)}</div>` : '',
    h.city ? `<div class="meta">${esc(h.city)}</div>` : '',
    h.phone ? `<div class="meta">Tel: ${esc(h.phone)}</div>` : '',
  ]
    .filter(Boolean)
    .join('')

  const info = (t.meta ?? [])
    .map((m) => `<div class="k">${esc(m.label)}${m.value ? `: ${esc(m.value)}` : ''}</div>`)
    .join('')

  const lines = t.lines
    .map((l) => {
      const qty = l.qty != null ? `${l.qty} ` : ''
      return `<div class="row line"><span class="nm">${esc(qty)}${esc(l.name)}</span><span class="r">${esc(l.amount)}</span></div>`
    })
    .join('')

  const payments = (t.payments ?? []).map(kvRow).join('')
  const totals = t.totals.map(kvRow).join('')

  const footerLines = (t.footerLines ?? [])
    .map((f) => `<div>${esc(f)}</div>`)
    .join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <title>Recibo</title><style>${TICKET_STYLES}</style></head><body>
    <div class="hdr">
      <div class="name">${esc(h.legalName)}</div>
      ${h.commercialName ? `<div class="sub">${esc(h.commercialName)}</div>` : ''}
      ${headerMeta}
    </div>
    ${info ? `<div class="rule"></div><div class="info">${info}</div>` : ''}
    ${
      lines
        ? `<div class="sec">Detalle</div>` +
          `<div class="row colhead"><span class="nm">Cant · Artículo</span><span class="r">Total</span></div>` +
          `<div class="dash"></div>${lines}` +
          (t.linesTotal ? `<div class="dash"></div>${kvRow(t.linesTotal)}` : '')
        : ''
    }
    ${payments ? `<div class="sec">Medio de pago</div>${payments}` : ''}
    <div class="rule"></div>
    ${totals}
    <div class="rule"></div>
    <div class="ftr">
      ${footerLines}
      ${t.thanks ? `<div class="thanks">${esc(t.thanks)}</div>` : ''}
      <div class="stars">${'*'.repeat(32)}</div>
      ${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}
    </div>
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
