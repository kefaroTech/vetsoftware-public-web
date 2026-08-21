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

/**
 * GUARDA DE A11Y-02 — el texto secundario se lee.
 *
 * `--text-subtle` cuelga de `--warm-500`, y de él cuelgan a su vez `.ds-hint`,
 * `.ds-meta`, `.ds-icon-muted` y las decenas de `<span>` de apoyo que la
 * auditoría FE-08 unificó. Es decir: NO es un token decorativo, es el color de
 * casi todo el texto de apoyo del producto — la unidad de una dosis, la fecha de
 * una vacuna, el nombre del archivo adjunto.
 *
 * A 58 % de luminosidad daba 4,17:1 sobre `--warm-50`, por debajo del 4,5:1 que
 * WCAG 2.2 §1.4.3 Contrast (Minimum) (AA) exige para texto normal — y este texto
 * es de 12-13 px, es decir, nunca «texto grande». Bajarlo a 55 % lo cruza.
 *
 * Igual que la guarda del anillo, esta NO fija el nombre ni el valor del token:
 * fija la propiedad. Cualquier tono que cumpla pasa; volver a subirlo falla.
 */

const PRIMITIVES_CSS = resolve(import.meta.dirname, '../../src/assets/styles/primitives.css')
const primitives = readFileSync(PRIMITIVES_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const MINIMO_TEXTO_WCAG = 4.5

describe('texto secundario — contraste (A11Y-02)', () => {
  const superficie = color('--warm-50')
  const subtle = color('--text-subtle')

  it(`--text-subtle contrasta ≥ ${MINIMO_TEXTO_WCAG}:1 contra --warm-50`, () => {
    const ratio = contrastRatio(subtle, superficie)
    expect(
      Number(ratio.toFixed(3)),
      `--text-subtle da ${ratio.toFixed(3)}:1 sobre --warm-50. WCAG 2.2 §1.4.3 (AA) exige ` +
        `${MINIMO_TEXTO_WCAG}:1 para texto normal, y todo lo que cuelga de este token ` +
        `(.ds-hint, .ds-meta, .ds-meta--caption) se pinta a 11-13 px: nunca es «texto grande». ` +
        `Oscurece --warm-500.`,
    ).toBeGreaterThanOrEqual(MINIMO_TEXTO_WCAG)
  })

  it(`--text-subtle contrasta ≥ ${MINIMO_TEXTO_WCAG}:1 contra blanco`, () => {
    const ratio = contrastRatio(subtle, WHITE)
    expect(
      Number(ratio.toFixed(3)),
      `--text-subtle da ${ratio.toFixed(3)}:1 sobre blanco (#fff). Los modales y las tarjetas ` +
        `no pintan --warm-50, pintan blanco, y ahí vive la mitad de este texto.`,
    ).toBeGreaterThanOrEqual(MINIMO_TEXTO_WCAG)
  })

  it('--text-subtle sigue derivando de --warm-500, que es lo que le da el alcance', () => {
    // Si alguien lo desengancha y le pone un color propio, las dos aserciones de
    // arriba seguirían pasando pero `.ds-hint`/`.ds-meta` —que leen `--warm-500`
    // directamente— se quedarían sin guarda. Esto lo detecta.
    expect(props.get('--text-subtle')).toBe('var(--warm-500)')
    expect(contrastRatio(color('--warm-500'), superficie)).toBeGreaterThanOrEqual(MINIMO_TEXTO_WCAG)
  })

  it('la guarda mide de verdad: el 58 % anterior a la auditoría no la pasaría', () => {
    // Mismo croma y mismo tono, solo la luminosidad de antes. Sin esto, un error en
    // la conversión OKLCH → sRGB dejaría la prueba verde para cualquier entrada.
    const antes = oklchToSrgb({ l: 0.58, c: 0.012, h: 60 })
    const ratio = contrastRatio(antes, superficie)
    expect(Number(ratio.toFixed(2))).toBe(4.17)
    expect(ratio).toBeLessThan(MINIMO_TEXTO_WCAG)
  })
})

/**
 * `.ds-field-invalid-focus` es el foco sobre un campo en error — cinco copias
 * (BaseInput, BaseSelect, BaseTextarea, OwnerSearchAutocomplete, DateInput).
 * Tenía su propio `box-shadow: 0 0 0 3px var(--danger-200)` escrito a mano:
 * 1,29:1, el mismo defecto que A11Y-01 corrigió en `--ring-danger`, pero por la
 * puerta de al lado y sin guarda. Ahora hereda el token, y esto lo sujeta: si
 * alguien vuelve a escribir el anillo a mano aquí, la prueba lo dice.
 */
describe('.ds-field-invalid-focus — hereda el anillo de peligro (A11Y-02)', () => {
  const regla = /\.ds-field-invalid-focus\s*\{([^}]*)\}/.exec(primitives)?.[1] ?? ''

  it('existe y define su foco con box-shadow', () => {
    expect(regla, 'primitives.css ya no declara .ds-field-invalid-focus').not.toBe('')
    expect(regla).toMatch(/box-shadow\s*:/)
  })

  it('su box-shadow es el token --ring-danger y no un valor escrito a mano', () => {
    const boxShadow = /box-shadow\s*:\s*([^;]+);/.exec(regla)?.[1]?.trim()
    expect(
      boxShadow,
      `.ds-field-invalid-focus declara «${boxShadow}». Debe consumir var(--ring-danger): un ` +
        `anillo escrito a mano aquí queda fuera de la guarda de A11Y-01 y puede volver a ` +
        `caer por debajo de 3:1 sin que nada lo note.`,
    ).toBe('var(--ring-danger)')
  })

  it(`el anillo que hereda mantiene ≥ ${MINIMO_WCAG}:1 sobre --warm-50 y sobre blanco`, () => {
    const anillo = colorDelAnillo('--ring-danger')
    expect(contrastRatio(anillo.srgb, color('--warm-50'))).toBeGreaterThanOrEqual(MINIMO_WCAG)
    expect(contrastRatio(anillo.srgb, WHITE)).toBeGreaterThanOrEqual(MINIMO_WCAG)
  })
})
