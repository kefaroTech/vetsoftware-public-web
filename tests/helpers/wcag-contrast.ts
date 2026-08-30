/**
 * OKLCH → sRGB → contraste WCAG 2.x, sin dependencias.
 *
 * Los tokens de color del proyecto están escritos en `oklch()`, que ninguna
 * herramienta del repo sabe evaluar: `jsdom` no resuelve `color()`/`oklch()` ni
 * calcula contrastes, y añadir `culori` o `colorjs.io` solo para una prueba
 * mete una dependencia de producción en el árbol. La conversión es aritmética
 * cerrada y cabe aquí.
 *
 * Referencias:
 *  - Björn Ottosson, «A perceptual color space for image processing» (Oklab).
 *  - CSS Color 4 §12 (`oklch()` → Oklab → sRGB lineal, matriz XYZ D65).
 *  - WCAG 2.2, definición de «relative luminance» y «contrast ratio».
 */

import { elemento } from './exigir'

/** Canales sRGB con gamma, en [0, 1]. */
export type Srgb = readonly [number, number, number]

/** Color OKLCH tal y como se escribe en `tokens.css`. */
export interface Oklch {
  /** Luminosidad en [0, 1] (el CSS la escribe como porcentaje). */
  l: number
  /** Croma absoluto. */
  c: number
  /** Tono en grados. */
  h: number
}

/**
 * Convierte OKLCH a sRGB con gamma, recortando al gamut.
 *
 * El recorte es el mismo que hace el navegador al pintar un color fuera de
 * gamut en una pantalla sRGB, así que el contraste que sale de aquí es el que
 * ve el usuario, no el teórico.
 */
export function oklchToSrgb({ l: L, c: C, h }: Oklch): Srgb {
  const hRad = (h * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  const lCone = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mCone = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sCone = (L - 0.089484_1775 * a - 1.291485_548 * b) ** 3

  const linear = [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone,
  ]

  return linear.map((v) => {
    const clamped = Math.min(1, Math.max(0, v))
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
  }) as unknown as Srgb
}

/** Luminancia relativa WCAG 2.x de un color sRGB con gamma. */
export function relativeLuminance([r, g, b]: Srgb): number {
  const lin = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Razón de contraste WCAG 2.x entre dos colores sRGB (siempre ≥ 1). */
export function contrastRatio(a: Srgb, b: Srgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Blanco puro: el suelo del que sale cualquier superficie del producto. */
export const WHITE: Srgb = [1, 1, 1]

/**
 * Lee las declaraciones `--token: valor;` de una hoja CSS.
 *
 * Deliberadamente ingenuo: `tokens.css` es una lista plana de custom properties
 * y no tiene ni anidamiento ni `@supports`. Si algún día lo tuviera, esta
 * función devolvería la última declaración de cada nombre, que es también lo
 * que aplicaría la cascada dentro de un mismo `:root`.
 */
export function readCustomProperties(css: string): Map<string, string> {
  const out = new Map<string, string>()
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of sinComentarios.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const nombre = elemento(match, 1, 'el nombre de la propiedad personalizada')
    const valor = elemento(match, 2, 'el valor de la propiedad personalizada')
    out.set(nombre, valor.trim().replace(/\s+/g, ' '))
  }
  return out
}

/** Sustituye recursivamente los `var(--x)` de un valor por su declaración. */
export function resolveVars(value: string, props: Map<string, string>, depth = 0): string {
  if (depth > 10) throw new Error(`Ciclo de var() al resolver: ${value}`)
  if (!value.includes('var(')) return value
  const resuelto = value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (todo, nombre: string) => {
    const declarado = props.get(nombre)
    return declarado ?? todo
  })
  return resuelto === value ? value : resolveVars(resuelto, props, depth + 1)
}

/**
 * Extrae el `oklch(...)` de un valor ya resuelto. Devuelve `null` si el valor
 * no es un color OKLCH — que es en sí mismo un dato: significa que el token
 * cambió de espacio de color y la prueba que lo consume debe decirlo.
 */
export function parseOklch(value: string): Oklch | null {
  const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)/i.exec(value)
  if (!m) return null
  return { l: Number(m[1]) / 100, c: Number(m[2]), h: Number(m[3]) }
}
