import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  contrastRatio,
  oklchToSrgb,
  parseOklch,
  readCustomProperties,
  resolveVars,
  WHITE,
  type Srgb,
} from '../helpers/wcag-contrast'

/**
 * GUARDA DE A11Y-01 — el anillo de foco tiene que verse.
 *
 * `.ds-btn` hace `outline: none` y sustituye el foco del navegador por
 * `box-shadow: var(--ring)`. Eso convierte a `--ring` en el ÚNICO indicador de
 * foco de todos los botones del producto: si su color no contrasta contra la
 * superficie, quien navega con teclado deja de saber dónde está — no «se ve
 * peor», deja de poder usar la aplicación.
 *
 * WCAG 2.2 §2.4.7 Focus Visible (AA) obliga a que exista un indicador de foco
 * visible, y §1.4.11 Non-text Contrast (AA) es el que fija el 3:1 entre ese
 * indicador y lo que hay debajo — ese 3:1 es el umbral de esta guarda.
 * (§2.4.13 Focus Appearance, que detalla además tamaño y forma, es AAA y no
 * es el nivel exigible aquí.) Los valores anteriores a la auditoría eran
 * `--amatista-50` (1,06:1) y `--danger-200` (1,29:1): un anillo invisible.
 *
 * Esta prueba NO comprueba «que el token siga siendo `--amatista-500`». Fijar
 * el nombre impediría cambiar de paleta y no probaría nada: comprueba la
 * propiedad que importa —el contraste real, calculado OKLCH → sRGB →
 * luminancia relativa— de modo que cualquier color que cumpla pasa y volver a
 * un tono claro falla, se llame como se llame.
 */

const TOKENS_CSS = resolve(import.meta.dirname, '../../src/assets/styles/tokens.css')
const MINIMO_WCAG = 3

const props = readCustomProperties(readFileSync(TOKENS_CSS, 'utf8'))

/** Resuelve un token de color a sRGB, fallando con su nombre si no se puede. */
function color(token: string): Srgb {
  const declarado = props.get(token)
  expect(declarado, `tokens.css ya no declara ${token}`).toBeDefined()
  const oklch = parseOklch(resolveVars(declarado!, props))
  expect(
    oklch,
    `${token} dejó de ser un color OKLCH (${declarado}); revisa esta guarda antes de tocar nada más`,
  ).not.toBeNull()
  return oklchToSrgb(oklch!)
}

/**
 * Color del anillo: la ÚLTIMA capa del `box-shadow`. Las dos capas no son
 * decorativas — la primera repite la superficie para despegar el anillo del
 * borde del control y la segunda es la que aporta el contraste, así que la que
 * hay que medir es la segunda.
 */
function colorDelAnillo(token: string): { nombre: string; srgb: Srgb } {
  const declarado = props.get(token)
  expect(declarado, `tokens.css ya no declara ${token}`).toBeDefined()

  const capas = [...declarado!.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]!)
  expect(
    capas.length,
    `${token} debería llevar dos capas (superficie + color de contraste); se leyó: ${declarado}`,
  ).toBeGreaterThanOrEqual(2)

  const nombre = capas.at(-1)!
  return { nombre, srgb: color(nombre) }
}

describe('anillo de foco — contraste (A11Y-01)', () => {
  const superficie = color('--warm-50')

  for (const token of ['--ring', '--ring-danger'] as const) {
    describe(token, () => {
      const anillo = colorDelAnillo(token)

      it(`contrasta ≥ ${MINIMO_WCAG}:1 contra --warm-50, la superficie del producto`, () => {
        const ratio = contrastRatio(anillo.srgb, superficie)
        expect(
          Number(ratio.toFixed(2)),
          `${token} usa ${anillo.nombre}, que da ${ratio.toFixed(2)}:1 sobre --warm-50. ` +
            `WCAG 2.2 §1.4.11 Non-text Contrast (AA) exige ${MINIMO_WCAG}:1 para un indicador ` +
            `no textual, y §2.4.7 Focus Visible (AA) obliga a que el foco se vea: este anillo ` +
            `es el único indicador de foco de .ds-btn (que hace outline:none). ` +
            `Elige un tono más oscuro.`,
        ).toBeGreaterThanOrEqual(MINIMO_WCAG)
      })

      it(`contrasta ≥ ${MINIMO_WCAG}:1 contra blanco, para los controles sobre blanco puro`, () => {
        const ratio = contrastRatio(anillo.srgb, WHITE)
        expect(
          Number(ratio.toFixed(2)),
          `${token} usa ${anillo.nombre}, que da ${ratio.toFixed(2)}:1 sobre blanco (#fff). ` +
            `No toda superficie es --warm-50: modales y tarjetas pintan blanco.`,
        ).toBeGreaterThanOrEqual(MINIMO_WCAG)
      })
    })
  }

  it('la guarda mide de verdad: el color anterior a la auditoría no la pasaría', () => {
    // Sin esto, un error en la conversión OKLCH → sRGB dejaría la prueba en
    // verde para cualquier entrada y la guarda no guardaría nada.
    const antes = contrastRatio(color('--amatista-50'), superficie)

    expect(Number(antes.toFixed(2))).toBe(1.06)
    expect(antes).toBeLessThan(MINIMO_WCAG)
  })
})
