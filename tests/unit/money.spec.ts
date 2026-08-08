import { describe, it, expect } from 'vitest'
import {
  discountedUnitPrice,
  extractBase,
  extractTax,
  multiply,
  roundToUnit,
  scaled,
  sum,
} from '@/features/tienda/composables/money'

/**
 * El núcleo monetario del frontend, que es un puerto de `Money.java`. Estas
 * pruebas son deliberadamente las MISMAS que las de `MoneyTest` del backend, con
 * los mismos números: si las dos baterías pasan, front y servidor calculan
 * igual, y eso es lo único que garantiza que el ticket que ve el cajero
 * coincida con el documento que valida la DIAN.
 *
 * Los casos marcados «coma flotante» son los que fallaban antes del cambio. No
 * son teóricos: son la aritmética que hacía la pantalla que más dinero mueve.
 */

describe('scaled — escala monetaria de 2 decimales', () => {
  it.each([
    [10.005, 10.01],
    [10.004, 10.0],
    [10.015, 10.02],
  ])('redondea %d a %d con HALF_UP', (entrada, esperado) => {
    expect(scaled(entrada)).toBe(esperado)
  })

  it('en negativos redondea alejándose del cero', () => {
    expect(scaled(-10.005)).toBe(-10.01)
  })

  it('es idempotente', () => {
    const unaVez = scaled(1234.567)

    expect(scaled(unaVez)).toBe(unaVez)
  })

  it('un entero se queda igual', () => {
    expect(scaled(7)).toBe(7)
  })

  it('COMA FLOTANTE: 1,005 redondea a 1,01, no a 1,00', () => {
    // `Math.round(1.005 * 100) / 100` da 1 porque 1.005 · 100 vale
    // 100.49999999999999 en binario. El backend, con BigDecimal, da 1.01.
    expect(Math.round(1.005 * 100) / 100).toBe(1)
    expect(scaled(1.005)).toBe(1.01)
  })

  it('no lanza ante valores no finitos', () => {
    expect(scaled(Number.NaN)).toBe(0)
    expect(scaled(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('multiply — producto a escala monetaria', () => {
  it('producto de enteros', () => {
    expect(multiply(3, 1_500)).toBe(4_500)
  })

  it('redondea el producto con HALF_UP, no los operandos', () => {
    // 3 × 0,335 = 1,005 → 1,01. Si se redondearan los operandos primero
    // (0,335 → 0,34) saldría 1,02: un centavo de más por línea.
    expect(multiply(3, 0.335)).toBe(1.01)
  })

  it('cantidad fraccionaria por precio entero', () => {
    expect(multiply(12_500, 2.5)).toBe(31_250)
  })

  it('multiplicar por cero da cero', () => {
    expect(multiply(99_999.99, 0)).toBe(0)
  })

  it('conserva el signo', () => {
    expect(multiply(-1_500, 3)).toBe(-4_500)
  })
})

describe('extractBase — base gravable de un total con impuesto incluido', () => {
  it.each([
    ['IVA 19 %', 119_000, 19, 100_000],
    ['INC 8 %', 108_000, 8, 100_000],
    ['IVA 5 %', 105_000, 5, 100_000],
  ])('%s: %d → base %d', (_caso, total, pct, esperado) => {
    expect(extractBase(total, pct)).toBe(esperado)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['cero', 0],
  ])('sin porcentaje (%s) el total ya es la base', (_caso, pct) => {
    expect(extractBase(50_000, pct)).toBe(50_000)
  })

  it('DIVERGENCIA DELIBERADA: una tarifa negativa no produce una base mayor que el total', () => {
    // El backend documenta que `extractBase` solo cortocircuita ante null/0, así
    // que con -10 devuelve MÁS que el total. Aquí se corta: mostrarle al cajero
    // una base gravable por encima de lo que cobra sería peor que ignorar el
    // dato imposible.
    expect(extractBase(100, -10)).toBe(100)
  })
})

describe('extractTax', () => {
  it('el impuesto es la diferencia exacta entre bruto y base', () => {
    expect(extractTax(119_000, 19)).toBe(19_000)
  })

  it('sin tarifa no hay impuesto', () => {
    expect(extractTax(50_000, 0)).toBe(0)
  })

  it.each([1, 7, 999, 12_345, 99_999, 1_234_567, 8_888_888])(
    'base + impuesto reconstruyen %d EXACTAMENTE',
    (total) => {
      // El backend se conforma con "dentro de un peso" porque suma por líneas.
      // Aquí la reconstrucción es exacta al centavo, y debe seguir siéndolo: es
      // la propiedad que hace que el desglose del ticket cuadre consigo mismo.
      for (const pct of [5, 8, 19]) {
        expect(extractBase(total, pct) + extractTax(total, pct)).toBe(total)
      }
    },
  )

  it('una tarifa con decimales no rompe la reconstrucción', () => {
    expect(extractBase(100_000, 7.5) + extractTax(100_000, 7.5)).toBe(100_000)
  })
})

describe('sum — acumulación sin deriva', () => {
  it('suma exacta de importes con centavos', () => {
    // 0,1 + 0,2 en coma flotante da 0.30000000000000004. Repetido a lo largo de
    // un ticket, ese error es la deriva que describe FE-09.
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(sum([0.1, 0.2])).toBe(0.3)
  })

  it('cien líneas iguales suman exactamente cien veces una', () => {
    const linea = extractTax(33_333, 19)
    const cien = sum(Array.from({ length: 100 }, () => linea))

    expect(cien).toBe(scaled(linea * 100))
  })

  it('una lista vacía suma cero', () => {
    expect(sum([])).toBe(0)
  })

  it('el orden de los sumandos no cambia el resultado', () => {
    const importes = [0.01, 1234.56, 0.99, 7.07, 88_888.88]
    const alReves = [...importes].reverse()

    expect(sum(importes)).toBe(sum(alReves))
  })
})

describe('discountedUnitPrice — el precio de promoción', () => {
  it.each([
    ['un descuento redondo', 10_000, 20, 8_000],
    ['medio precio', 50_000, 50, 25_000],
    ['sin descuento', 10_000, 0, 10_000],
    ['descuento total', 10_000, 100, 0],
  ])('%s', (_caso, base, pct, esperado) => {
    expect(discountedUnitPrice(base, pct)).toBe(esperado)
  })

  it.each([
    [150, 33, 101],
    [250, 33, 168],
    [300, 66.5, 101],
    [350, 33, 235],
  ])(
    'COMA FLOTANTE: %d con %d %% de descuento vale %d, no un peso menos',
    (base, pct, esperado) => {
      // El valor exacto cae justo en el medio (100,5) y el binario lo deja
      // debajo: `1 − 33/100` vale 0,6699999999999999, así que 150 × eso da
      // 100,49999999999999 y `Math.round` baja a 100. El servidor, con
      // BigDecimal, fija 101.
      expect(discountedUnitPrice(base, pct)).toBe(esperado)
      expect(Math.round(base * (1 - pct / 100))).toBe(esperado - 1)
    },
  )

  it('coincide con el servidor en todo el espacio de precios de catálogo', () => {
    // Barrido contra una referencia decimal exacta. Antes de este cambio había
    // 2.796 desacuerdos de un peso en este mismo recorrido — justo lo que el
    // `PRICE_TOLERANCE` del servidor venía absorbiendo en silencio.
    const referencia = (base: number, pct: number) => {
      const numerador = BigInt(Math.round(base * 100)) * BigInt(Math.round((100 - pct) * 100))
      const denominador = 10_000n * 100n
      const cociente = numerador / denominador
      const resto = numerador % denominador
      return Number(resto * 2n >= denominador ? cociente + 1n : cociente)
    }

    const desacuerdos: string[] = []
    for (let base = 1; base <= 20_000; base += 1) {
      for (const pct of [5, 10, 12.5, 15, 33, 50, 66.5]) {
        const propio = discountedUnitPrice(base, pct)
        if (propio !== referencia(base, pct)) desacuerdos.push(`${base}@${pct}%`)
      }
    }

    expect(desacuerdos.slice(0, 5)).toEqual([])
  })
})

describe('roundToUnit — precio a peso entero', () => {
  it.each([
    [100.4, 100],
    [100.5, 101],
    [100.6, 101],
    [0, 0],
  ])('%d → %d con HALF_UP', (entrada, esperado) => {
    expect(roundToUnit(entrada)).toBe(esperado)
  })

  it('un valor que el binario deja bajo el medio se redondea igual que el servidor', () => {
    expect(Math.round(100.49999999999999)).toBe(100)
    expect(roundToUnit(100.49999999999999)).toBe(101)
  })
})

describe('paridad con PosSaleDocumentBuilder', () => {
  /**
   * Réplica de lo que hace el backend por línea:
   *   gross = Money.multiply(unitPrice, quantity)
   *   base  = rate > 0 ? Money.extractBase(gross, rate) : gross
   *   tax   = gross − base
   */
  it.each([
    [119_000, 1, 19],
    [33_333, 7, 19],
    [1_000, 13, 5],
    [12_500, 2, 8],
    [999, 3, 19],
    [45_900, 11, 19],
  ])('unitPrice %d × %d al %d %% cuadra línea a línea', (unitPrice, qty, rate) => {
    const gross = multiply(unitPrice, qty)
    const base = extractBase(gross, rate)
    const tax = extractTax(gross, rate)

    expect(base + tax).toBe(gross)
    expect(gross).toBe(unitPrice * qty)
  })
})
