import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

/**
 * La geometría de una pantalla, medida dentro del navegador en UNA sola
 * `page.evaluate`. Cada apartado nombra el criterio que lo justifica; el
 * dictamen no se emite aquí, se emite con estos números delante.
 */

/** La escala de espaciado sale de `tokens.css`, no de la memoria de nadie. */
export function escalaDeEspaciado(raizRepo: string): number[] {
  const css = readFileSync(join(raizRepo, 'src/assets/styles/tokens.css'), 'utf8')
  const valores = new Set<number>([0])
  for (const [, px] of css.matchAll(/--space-[a-z0-9-]*:\s*([0-9.]+)px/g)) {
    valores.add(Number(px))
  }
  return [...valores].sort((a, b) => a - b)
}

export interface ElementoMedido {
  selector: string
  nombreAccesible?: string
  [extra: string]: unknown
}

export interface MetricasPantalla {
  documento: {
    scrollWidth: number
    innerWidth: number
    scrollHeight: number
    innerHeight: number
    desbordaHorizontal: boolean
  }
  culpablesDeDesborde: ElementoMedido[]
  scrollers: { alcanzables: string[]; fueraDePantalla: string[] }
  objetivosPequenos: ElementoMedido[]
  desalineaciones: ElementoMedido[]
  centradosRotos: ElementoMedido[]
  espaciadoFueraDeEscala: {
    total: number
    porValor: { valor: number; veces: number; ejemplo: string; propiedades: string[] }[]
  }
  textoTruncado: ElementoMedido[]
  solapamientos: ElementoMedido[]
  imagenes: ElementoMedido[]
  totales: { elementosVisibles: number; interactivosVisibles: number }
}

export async function medirPantalla(page: Page, escala: number[]): Promise<MetricasPantalla> {
  return page.evaluate((escalaPermitida) => {
    const TOPE = 30

    const clasesDe = (el: Element): string[] => {
      const raw = (el as HTMLElement).className
      if (typeof raw !== 'string') return []
      return raw.trim().split(/\s+/).filter(Boolean).slice(0, 3)
    }

    const selectorDe = (el: Element): string => {
      const tid = el.getAttribute('data-testid')
      const id = el.id ? `#${el.id}` : ''
      const clases = clasesDe(el)
      return `${el.tagName.toLowerCase()}${id}${tid ? `[data-testid="${tid}"]` : ''}${
        clases.length ? `.${clases.join('.')}` : ''
      }`
    }

    const nombreAccesible = (el: Element): string => {
      const aria = el.getAttribute('aria-label')
      if (aria) return aria.slice(0, 70)
      const alt = el.getAttribute('alt')
      if (alt) return alt.slice(0, 70)
      const titulo = el.getAttribute('title')
      if (titulo) return titulo.slice(0, 70)
      return (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 70)
    }

    const visible = (el: Element): boolean => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
      const cs = getComputedStyle(el)
      return cs.visibility !== 'hidden' && cs.opacity !== '0'
    }

    const todos = Array.from(document.querySelectorAll<HTMLElement>('body *'))
    const visibles = todos.filter(visible)

    // ── §Desbordamiento horizontal ──────────────────────────────────────────
    // El eje que no se puede recuperar: un `overflow-x` en el documento obliga a
    // desplazar la página entera de lado para leer una fila.
    const innerWidth = window.innerWidth
    const culpablesDeDesborde = visibles
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, TOPE)
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          selector: selectorDe(el),
          nombreAccesible: nombreAccesible(el),
          right: Math.round(r.right),
          exceso: Math.round(r.right - innerWidth),
          width: Math.round(r.width),
        }
      })

    // ── §Contenedores de scroll ─────────────────────────────────────────────
    // Mismo criterio que `scrollersVerticales()` de la consola: un scroller
    // fuera de pantalla es contenido que existe y nadie puede alcanzar.
    const alcanzable = (el: Element) => {
      if (el.closest('[inert]') !== null) return false
      const r = el.getBoundingClientRect()
      return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
    }
    const desplazables = todos.filter((el) => {
      const overflow = getComputedStyle(el).overflowY
      if (overflow !== 'auto' && overflow !== 'scroll') return false
      return el.scrollHeight - el.clientHeight > 1
    })
    const scrollers = {
      alcanzables: desplazables.filter(alcanzable).map(selectorDe).slice(0, TOPE),
      fueraDePantalla: desplazables
        .filter((el) => !alcanzable(el))
        .map(selectorDe)
        .slice(0, TOPE),
    }

    // ── §WCAG 2.2 2.5.8 Target Size (Minimum) ───────────────────────────────
    // 24×24 CSS px. `enLinea` marca el enlace dentro de un párrafo, que es la
    // excepción del criterio: se reporta para que el dictamen pueda descontarlo.
    const SELECTOR_INTERACTIVO = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="menuitem"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
    const interactivos = Array.from(
      document.querySelectorAll<HTMLElement>(SELECTOR_INTERACTIVO),
    ).filter(visible)
    const objetivosPequenos = interactivos
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width < 24 || r.height < 24
      })
      .slice(0, TOPE)
      .map((el) => {
        const r = el.getBoundingClientRect()
        const padre = el.parentElement
        const enLinea =
          el.tagName === 'A' &&
          padre !== null &&
          ['P', 'LI', 'SPAN', 'TD', 'DD', 'LABEL'].includes(padre.tagName)
        return {
          selector: selectorDe(el),
          nombreAccesible: nombreAccesible(el),
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          enLinea,
        }
      })

    // ── §Alineación de bordes izquierdos ────────────────────────────────────
    // Una diferencia de 1–6 px no se lee como jerarquía: se lee como descuido.
    // Por debajo de 1 px es redondeo; por encima de 6 px suele ser sangrado
    // deliberado.
    const contenedores = Array.from(
      document.querySelectorAll<HTMLElement>('main, form, section, [role="main"], .app-content'),
    ).filter(visible)
    const desalineaciones: { selector: string; [k: string]: unknown }[] = []
    for (const contenedor of contenedores) {
      const hijos = Array.from(contenedor.children).filter(
        (h): h is HTMLElement => h instanceof HTMLElement && visible(h),
      )
      const [primero] = hijos
      if (hijos.length < 2 || !primero) continue
      const base = primero.getBoundingClientRect().left
      for (const hijo of hijos.slice(1)) {
        const delta = Math.abs(hijo.getBoundingClientRect().left - base)
        if (delta > 1 && delta < 6) {
          desalineaciones.push({
            selector: selectorDe(hijo),
            contenedor: selectorDe(contenedor),
            desviacionPx: Math.round(delta * 10) / 10,
            referencia: selectorDe(primero),
          })
        }
      }
      if (desalineaciones.length >= TOPE) break
    }

    // ── §Centrado real, no declarado ────────────────────────────────────────
    // Un padding asimétrico en el padre descentra un hijo que el CSS declara
    // centrado. Es invisible leyendo la hoja y evidente en pantalla.
    const centroContenidoDe = (el: HTMLElement): number => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const izq = parseFloat(cs.paddingLeft) || 0
      const der = parseFloat(cs.paddingRight) || 0
      return r.left + izq + (r.width - izq - der) / 2
    }
    const centradosRotos: { selector: string; [k: string]: unknown }[] = []
    for (const el of visibles) {
      if (centradosRotos.length >= TOPE) break
      const cs = getComputedStyle(el)
      const padre = el.parentElement
      if (!padre || !(padre instanceof HTMLElement)) continue

      // `margin-inline: auto` sí centra la CAJA dentro del padre, así que el
      // centro propio contra el centro del contenido del padre es el test bueno.
      if (cs.marginInlineStart === 'auto' && cs.marginInlineEnd === 'auto') {
        const r = el.getBoundingClientRect()
        const delta = r.left + r.width / 2 - centroContenidoDe(padre)
        if (Math.abs(delta) > 1) {
          const csPadre = getComputedStyle(padre)
          centradosRotos.push({
            selector: selectorDe(el),
            padre: selectorDe(padre),
            motivo: 'margin-inline:auto',
            desviacionPx: Math.round(delta * 10) / 10,
            paddingPadre: `${csPadre.paddingLeft} / ${csPadre.paddingRight}`,
          })
          continue
        }
      }

      // `text-align: center` NO centra la caja: centra el contenido en línea
      // DENTRO de ella, y además se hereda, de modo que contrastarla con el padre
      // señala a cada `svg` y cada `span` de un botón centrado. Lo que un padding
      // asimétrico descentra es el texto respecto de su PROPIA caja de contenido,
      // y eso se mide con un `Range` sobre los nodos de texto.
      if (cs.textAlign === 'center' && cs.display !== 'inline') {
        const textos = [...el.childNodes].filter(
          (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0,
        )
        if (textos.length > 0) {
          const rango = document.createRange()
          rango.selectNodeContents(el)
          const rt = rango.getBoundingClientRect()
          rango.detach()
          if (rt.width > 0) {
            const delta = rt.left + rt.width / 2 - centroContenidoDe(el)
            if (Math.abs(delta) > 1) {
              centradosRotos.push({
                selector: selectorDe(el),
                padre: selectorDe(padre),
                motivo: 'text-align:center',
                desviacionPx: Math.round(delta * 10) / 10,
                paddingPropio: `${cs.paddingLeft} / ${cs.paddingRight}`,
              })
              continue
            }
          }
        }
      }

      if (cs.display.includes('flex') && cs.justifyContent === 'center') {
        // Solo los hijos que `justify-content` COLOCA. Uno absoluto —el rótulo
        // `.ds-sr-only` de un botón, un adorno— está fuera del flujo, así que
        // meterlo en los límites del grupo mide algo que la propiedad ni toca.
        const hijos = Array.from(el.children).filter((h): h is HTMLElement => {
          if (!(h instanceof HTMLElement) || !visible(h)) return false
          const pos = getComputedStyle(h).position
          return pos === 'static' || pos === 'relative'
        })
        if (hijos.length === 0) continue
        const izquierda = Math.min(...hijos.map((h) => h.getBoundingClientRect().left))
        const derecha = Math.max(...hijos.map((h) => h.getBoundingClientRect().right))
        const delta = (izquierda + derecha) / 2 - centroContenidoDe(el)
        if (Math.abs(delta) > 1) {
          centradosRotos.push({
            selector: selectorDe(el),
            padre: selectorDe(padre),
            motivo: 'justify-content:center',
            desviacionPx: Math.round(delta * 10) / 10,
            paddingPadre: `${cs.paddingLeft} / ${cs.paddingRight}`,
          })
        }
      }
    }

    // ── §Escala de espaciado ────────────────────────────────────────────────
    // Un valor fraccionario casi siempre viene de un porcentaje resuelto, no de
    // una constante tecleada: se marca aparte para no acusar a quien no fue.
    const PROPS = [
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'rowGap',
      'columnGap',
    ] as const
    const permitidos = new Set(escalaPermitida)
    const fuera = new Map<number, { veces: number; ejemplo: string; propiedades: Set<string> }>()
    let totalFuera = 0
    for (const el of visibles.slice(0, 4000)) {
      const cs = getComputedStyle(el)
      for (const prop of PROPS) {
        const bruto = cs[prop]
        if (!bruto.endsWith('px')) continue
        const px = parseFloat(bruto)
        if (!Number.isFinite(px) || px === 0) continue
        if (permitidos.has(px)) continue
        totalFuera++
        const entrada = fuera.get(px) ?? {
          veces: 0,
          ejemplo: selectorDe(el),
          propiedades: new Set(),
        }
        entrada.veces++
        entrada.propiedades.add(prop)
        fuera.set(px, entrada)
      }
    }
    const espaciadoFueraDeEscala = {
      total: totalFuera,
      porValor: [...fuera.entries()]
        .sort((a, b) => b[1].veces - a[1].veces)
        .slice(0, 20)
        .map(([valor, d]) => ({
          valor,
          veces: d.veces,
          ejemplo: d.ejemplo,
          propiedades: [...d.propiedades],
        })),
    }

    // ── §Texto truncado ─────────────────────────────────────────────────────
    // Con elipsis es una decisión; sin elipsis es texto que desaparece sin avisar.
    // Solo elementos con TEXTO PROPIO. Un armazón con `overflow: hidden` mide
    // `scrollWidth` mayor porque recorta un adorno absoluto que sobresale a
    // propósito —así es como evita el desbordamiento del documento—, y eso no es
    // texto que se pierda. Sin este filtro el hallazgo señala al contenedor y no
    // al texto, que es lo único que el lector echa de menos.
    const textoPropio = (el: Element) =>
      Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0,
      )
    const textoTruncado = visibles
      .filter((el) => {
        if (!textoPropio(el)) return false
        const horizontal = el.scrollWidth > el.clientWidth + 1
        const cs = getComputedStyle(el)
        const verticalOculto = cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1
        return horizontal || verticalOculto
      })
      .slice(0, TOPE)
      .map((el) => {
        const cs = getComputedStyle(el)
        return {
          selector: selectorDe(el),
          nombreAccesible: nombreAccesible(el),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          conElipsis: cs.textOverflow === 'ellipsis',
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
        }
      })

    // ── §Solapamientos entre hermanos ───────────────────────────────────────
    // Se descarta lo posicionado a propósito (absolute/fixed/sticky) y lo que
    // tiene relación de ancestro: ahí superponerse es la técnica, no el fallo.
    const solapamientos: { selector: string; [k: string]: unknown }[] = []
    const padres = new Set(visibles.map((el) => el.parentElement).filter(Boolean) as HTMLElement[])
    for (const padre of padres) {
      if (solapamientos.length >= TOPE) break
      const hijos = Array.from(padre.children).filter((h): h is HTMLElement => {
        if (!(h instanceof HTMLElement) || !visible(h)) return false
        const pos = getComputedStyle(h).position
        return pos === 'static' || pos === 'relative'
      })
      for (const [i, hijoA] of hijos.entries()) {
        if (solapamientos.length >= TOPE) break
        for (const hijoB of hijos.slice(i + 1)) {
          if (solapamientos.length >= TOPE) break
          const a = hijoA.getBoundingClientRect()
          const b = hijoB.getBoundingClientRect()
          const solapeX = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const solapeY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (solapeX > 2 && solapeY > 2) {
            solapamientos.push({
              selector: selectorDe(hijoA),
              contra: selectorDe(hijoB),
              solapeX: Math.round(solapeX),
              solapeY: Math.round(solapeY),
            })
          }
        }
      }
    }

    // ── §Imágenes y logos ───────────────────────────────────────────────────
    // Un logo estirado un 10 % es marca rota, y en el escaparate comercial es lo
    // primero que ve un desconocido.
    const imagenes = Array.from(document.querySelectorAll('img'))
      .slice(0, TOPE)
      .map((img) => {
        const r = img.getBoundingClientRect()
        const naturalAspecto = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0
        const pintadoAspecto = r.height > 0 ? r.width / r.height : 0
        const desviacion =
          naturalAspecto > 0 && pintadoAspecto > 0
            ? Math.abs(pintadoAspecto / naturalAspecto - 1)
            : 0
        return {
          selector: selectorDe(img),
          nombreAccesible: nombreAccesible(img),
          src: img.currentSrc.slice(-90),
          rota: img.naturalWidth === 0,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          width: Math.round(r.width),
          height: Math.round(r.height),
          deformada: desviacion > 0.1,
          desviacionAspecto: Math.round(desviacion * 1000) / 1000,
          sinAlt: !img.hasAttribute('alt'),
        }
      })
      .filter((i) => i.rota || i.deformada || i.sinAlt || i.width > 0)

    const raiz = document.documentElement
    return {
      documento: {
        scrollWidth: raiz.scrollWidth,
        innerWidth,
        scrollHeight: raiz.scrollHeight,
        innerHeight: window.innerHeight,
        desbordaHorizontal: raiz.scrollWidth > innerWidth + 1,
      },
      culpablesDeDesborde,
      scrollers,
      objetivosPequenos,
      desalineaciones: desalineaciones.slice(0, TOPE),
      centradosRotos,
      espaciadoFueraDeEscala,
      textoTruncado,
      solapamientos,
      imagenes,
      totales: {
        elementosVisibles: visibles.length,
        interactivosVisibles: interactivos.length,
      },
    }
  }, escala) as Promise<MetricasPantalla>
}
