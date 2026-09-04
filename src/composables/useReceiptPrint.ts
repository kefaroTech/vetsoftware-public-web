// Impresión de recibos en impresora térmica (rollo 58 / 80mm) vía el diálogo de
// impresión del navegador. PublicFront es una SPA pura (sin Electron), así que
// no hay acceso nativo al puerto: armamos el HTML del ticket y lo mandamos a
// imprimir desde un <iframe> oculto. El iframe evita el bloqueo de popups y
// aísla el ticket del CSS global de la app (Vuetify, overlays, loader, etc.).
//
// El diseño replica el handoff "Recibo Vetrina": marca, bloque fiscal del emisor,
// tipo + número de documento, datos, detalle, totales, medio de pago, sello DIAN
// (CUFE/CUDE) y pie. El ancho (58/80mm) lo decide el llamador (preferencia del
// dispositivo); no es autodetectable desde el navegador.
//
// Estos recibos son COMPROBANTES de venta/pago; el sello DIAN solo aparece cuando
// el documento ya fue validado (tiene CUFE/CUDE).

export type ReceiptWidth = '58' | '80'

export interface ReceiptLine {
  /** Cantidad ya formateada, p.ej. "1×". */
  qty?: string
  desc: string
  /** Subtexto tenue, p.ej. "· Servicio" o "· 12.000 c/u" (se oculta en 58mm). */
  sub?: string
  /** Importe ya formateado. */
  amount: string
}

export interface ReceiptTotalRow {
  label: string
  /** Valor ya formateado. */
  value: string
  /** Estilo de la fila. */
  kind?: 'grand' | 'pay' | 'change' | 'muted'
}

export interface ReceiptDian {
  /** "CUFE" o "CUDE". */
  sealLabel: string
  seal: string
  /** URL pública de la imagen del QR DIAN (la que devuelve el proveedor). Se imprime sobre el CUFE/CUDE. */
  qrUrl?: string
  /** Líneas extra: "Validado DIAN ...", "Ambiente: Producción". */
  info?: string[]
}

export interface ReceiptTicket {
  /** Ancho del rollo; por defecto 80mm. */
  width?: ReceiptWidth
  brand: {
    name: string
    tagline?: string
    /** Inicial del cuadro de marca; por defecto la primera letra de `name`. */
    mark?: string
  }
  /** Líneas del bloque fiscal del emisor (mono, centrado). */
  fiscal?: string[]
  docType: string
  docNumber: string
  /** Datos del documento (Fecha, Cliente, …). */
  meta?: { label: string; value: string }[]
  sectionLabel?: string
  lines: ReceiptLine[]
  /** Desglose de totales (subtotal, IVA, TOTAL…). */
  totals: ReceiptTotalRow[]
  /** Texto del pill de medio de pago, p.ej. "Efectivo · Contado". */
  payPill?: string
  /** Filas de pago recibido / cambio. */
  tender?: ReceiptTotalRow[]
  /** Sello DIAN (solo si el documento está validado). */
  dian?: ReceiptDian
  footer?: {
    thanks?: string
    lines?: string[]
    web?: string
  }
}

/** CSS del ticket, embebido en el iframe (no hereda los estilos de la app). */
const TICKET_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  body {
    font-family: var(--sans); color: var(--ink); font-size: 10px;
    font-variant-numeric: tabular-nums;
    /* Cualquier token largo (email, CUFE) parte de línea en vez de empujar hacia la derecha. */
    overflow-wrap: anywhere; word-break: break-word;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  :root {
    /* Paleta optimizada para impresión TÉRMICA: tinta negra sólida. El cabezal solo
       imprime negro; los grises y el color del handoff salen casi invisibles, así que
       el handoff es la guía de ESTRUCTURA, no de color. */
    --amatista-100: #fff; --amatista-600: #000; --amatista-700: #000;
    --ink: #000; --ink-soft: #000; --ink-faint: #000; --line: #000;
    --mono: 'Courier New', ui-monospace, monospace;
    --sans: Arial, system-ui, sans-serif;
  }
  /* Trazo grueso: en térmica la fuente fina sale muy clara. */
  body { font-weight: 700; line-height: 1.3; }
  /* OJO: sin 'width' aquí — lo fija el <style> dinámico al área imprimible (48/72mm).
     Si se pusiera width:100% sobreescribiría ese ancho y el ticket saldría cortado. */
  .receipt { padding: 2mm 0; max-width: 100%; overflow: hidden; }

  .r-center { text-align: center; }

  .r-brand { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 9px; }
  .r-mark { width: 34px; height: 34px; border-radius: 8px; background: #fff; color: #000; border: 2px solid #000;
            display: grid; place-items: center; font-weight: 800; font-size: 18px; }
  .r-clinic { font-size: 13px; font-weight: 700; text-align: center; }
  .r-tagline { font-size: 10px; color: var(--ink-faint); text-align: center; }
  .r-fiscal { font-family: var(--mono); font-size: 9px; color: var(--ink-soft); line-height: 1.6; text-align: center; }

  .r-sep { border: none; border-top: 1px dashed var(--line); margin: 10px 0; }
  .r-sep.solid { border-top: 1px solid var(--line); }

  .r-doctype { text-align: center; font-family: var(--mono); font-size: 10.5px; font-weight: 700;
               letter-spacing: .03em; color: var(--amatista-700); text-transform: uppercase; }
  .r-docno { text-align: center; font-family: var(--mono); font-size: 15px; font-weight: 700; margin-top: 1px; }

  .r-meta { font-family: var(--mono); font-size: 9.5px; color: var(--ink-soft); line-height: 1.8; }
  .r-meta .row { display: flex; justify-content: space-between; gap: 10px; }
  .r-meta .row b { color: var(--ink); font-weight: 700; text-align: right; }

  .r-sectlabel { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
                 color: var(--ink-faint); text-align: center; margin: 2px 0 7px; }

  .r-line { display: flex; gap: 6px; font-family: var(--mono); font-size: 10px; line-height: 1.45; padding: 2px 0; }
  .r-line .qty { width: 20px; flex-shrink: 0; color: var(--ink-soft); }
  .r-line .desc { flex: 1; min-width: 0; word-break: break-word; }
  .r-line .desc .sub { color: var(--ink-faint); font-size: 10px; }
  .r-line .amt { text-align: right; white-space: nowrap; font-weight: 700; }

  .r-tot { font-family: var(--mono); font-size: 10.5px; line-height: 1.8; }
  .r-tot .row { display: flex; justify-content: space-between; gap: 10px; color: var(--ink-soft); }
  .r-tot .row.grand { font-size: 13px; font-weight: 700; color: var(--ink); padding-top: 4px; }
  .r-tot .row.pay { color: var(--ink); }
  .r-tot .row.change { color: var(--amatista-700); font-weight: 600; }

  .r-pay-pill { display: inline-flex; align-items: center; gap: 5px; margin: 0 auto;
                background: #fff; color: #000; border: 1px solid #000;
                font-size: 10.5px; font-weight: 700; padding: 3px 11px; border-radius: 999px; }

  .r-dian { padding: 4px 0; }
  .r-qr-wrap { text-align: center; margin-bottom: 6px; }
  .r-qr { width: 36mm; height: 36mm; image-rendering: pixelated; }
  .r-dian-info { font-family: var(--mono); font-size: 8.5px; color: var(--ink-soft); line-height: 1.5; text-align: center; }
  .r-dian-info b { color: var(--ink); display: block; font-size: 9px; letter-spacing: .04em; }
  .r-cufe { word-break: break-all; }

  .r-foot { text-align: center; font-size: 10.5px; color: var(--ink-soft); line-height: 1.7; }
  .r-foot .thanks { font-weight: 600; color: var(--ink); font-size: 12px; }
  .r-foot .web { font-family: var(--mono); font-size: 10px; color: var(--amatista-700); margin-top: 3px; }
  .r-stars { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .14em;
             text-align: center; overflow: hidden; white-space: nowrap; margin-top: 6px; }

  /* Variante 58mm: tipografía más compacta y se ocultan los subtextos. */
  .w58 .r-clinic { font-size: 12px; }
  .w58 .r-fiscal { font-size: 8px; }
  .w58 .r-docno { font-size: 13px; }
  .w58 .r-meta, .w58 .r-line, .w58 .r-tot { font-size: 9px; }
  .w58 .r-tot .row.grand { font-size: 11px; }
  .w58 .r-line .qty { width: 16px; }
  .w58 .r-line .desc .sub { display: none; }
  .w58 .r-qr { width: 30mm; height: 30mm; }
`

/** Escapa texto para insertarlo de forma segura en el HTML del ticket. */
function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function totalsBlock(rows: ReceiptTotalRow[]): string {
  const body = rows
    .map(
      (r) =>
        `<div class="row ${r.kind ?? ''}"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`,
    )
    .join('')
  return `<div class="r-tot">${body}</div>`
}

function buildHtml(t: ReceiptTicket): string {
  const width: ReceiptWidth = t.width === '58' ? '58' : '80'
  const mark = (t.brand.mark ?? (t.brand.name.trim().charAt(0) || 'L')).toUpperCase()

  const fiscal = (t.fiscal ?? []).length
    ? `<div class="r-fiscal">${(t.fiscal ?? []).map(esc).join('<br />')}</div>`
    : ''

  const meta = (t.meta ?? []).length
    ? `<hr class="r-sep" /><div class="r-meta">${(t.meta ?? [])
        .map((m) => `<div class="row"><span>${esc(m.label)}</span><b>${esc(m.value)}</b></div>`)
        .join('')}</div>`
    : ''

  const lines = t.lines
    .map(
      (l) =>
        `<div class="r-line"><span class="qty">${esc(l.qty ?? '')}</span>` +
        `<span class="desc">${esc(l.desc)}${l.sub ? `<span class="sub"> ${esc(l.sub)}</span>` : ''}</span>` +
        `<span class="amt">${esc(l.amount)}</span></div>`,
    )
    .join('')

  const detail = lines
    ? `<hr class="r-sep" /><div class="r-sectlabel">${esc(t.sectionLabel ?? 'Detalle')}</div>${lines}`
    : ''

  const payBlock = t.payPill
    ? `<hr class="r-sep" /><div class="r-center"><span class="r-pay-pill">● ${esc(t.payPill)}</span></div>` +
      (t.tender && t.tender.length ? totalsBlock(t.tender) : '')
    : ''

  const dian = t.dian
    ? `<hr class="r-sep" /><div class="r-dian">` +
      (t.dian.qrUrl
        ? `<div class="r-qr-wrap"><img class="r-qr" src="${esc(t.dian.qrUrl)}" alt="QR DIAN" /></div>`
        : '') +
      `<div class="r-dian-info"><b>${esc(t.dian.sealLabel)}</b>` +
      `<span class="r-cufe">${esc(t.dian.seal)}</span>` +
      (t.dian.info && t.dian.info.length
        ? `<div style="margin-top:3px">${t.dian.info.map(esc).join('<br />')}</div>`
        : '') +
      `</div></div>`
    : ''

  // La atribución no es opcional ni depende del llamador: la cabecera del ticket
  // es la clínica emisora, así que este pie es el único sitio del papel donde
  // aparece quién fabrica el software.
  const foot =
    `<hr class="r-sep" /><div class="r-foot">` +
    (t.footer?.thanks ? `<div class="thanks">${esc(t.footer.thanks)}</div>` : '') +
    (t.footer?.lines?.length ? t.footer.lines.map(esc).join('<br />') : '') +
    (t.footer?.web ? `<div class="web">${esc(t.footer.web)}</div>` : '') +
    `<div class="web">Emitido con Lumbre</div>` +
    `</div>`

  // Ancho del CONTENIDO = área imprimible del cabezal (no el ancho del papel): un rollo de
  // 58mm imprime ~48mm y uno de 80mm ~72mm. Y se ALINEA A LA IZQUIERDA (margin:0): la térmica
  // imprime desde el borde izquierdo; centrar lo empuja a la derecha (el driver asume una página
  // más ancha que el área imprimible) y recorta el final de las líneas largas.
  const contentWidth = width === '58' ? '44mm' : '72mm'
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <title>Recibo</title>
    <style>@page { size: ${width}mm auto; margin: 0; } html, body { margin: 0; padding: 0; } .receipt { width: ${contentWidth}; margin: 0; }</style>
    <style>${TICKET_STYLES}</style></head>
    <body>
    <div class="receipt ${width === '58' ? 'w58' : ''}">
      <div class="r-brand">
        <div class="r-mark">${esc(mark)}</div>
        <div class="r-clinic">${esc(t.brand.name)}</div>
        ${t.brand.tagline ? `<div class="r-tagline">${esc(t.brand.tagline)}</div>` : ''}
      </div>
      ${fiscal}
      <hr class="r-sep solid" />
      <div class="r-doctype">${esc(t.docType)}</div>
      <div class="r-docno">${esc(t.docNumber)}</div>
      ${meta}
      ${detail}
      <hr class="r-sep" />
      ${totalsBlock(t.totals)}
      ${payBlock}
      ${dian}
      ${foot}
      <div class="r-stars">${'✦ '.repeat(16).trim()}</div>
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
      const doPrint = () => {
        win.onafterprint = cleanup
        win.focus()
        win.print()
      }
      // Espera a que las imágenes (p.ej. el QR DIAN remoto) terminen de cargar; si no,
      // el navegador imprime el ticket antes de bajar la imagen y el QR sale en blanco.
      const pending = Array.from(win.document.images).filter((img) => !img.complete)
      if (pending.length === 0) {
        doPrint()
        return
      }
      let fired = false
      const fire = () => {
        if (fired) return
        fired = true
        doPrint()
      }
      let remaining = pending.length
      const onSettled = () => {
        remaining -= 1
        if (remaining === 0) fire()
      }
      pending.forEach((img) => {
        img.addEventListener('load', onSettled)
        img.addEventListener('error', onSettled)
      })
      // Tope de seguridad: no esperar indefinidamente si la imagen no responde.
      win.setTimeout(fire, 1500)
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
