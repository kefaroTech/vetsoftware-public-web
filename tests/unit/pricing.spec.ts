import { describe, it, expect } from 'vitest'
import {
  appliesIva,
  applyPromo,
  computeTotals,
  effectiveTaxRate,
  formatMoney,
  formatMoneyExact,
  lineGross,
  promoStatus,
  splitGross,
  stockState,
  taxByRate,
  taxTreatmentLabel,
} from '@/features/tienda/composables/pricing'
import type {
  ProductResponse,
  PromotionResponse,
  SaleLine,
  TaxTreatment,
} from '@/features/tienda/types/tienda'

/**
 * La aritmética del POS. Es la pantalla que más dinero mueve y la única del
 * frontend que calcula base gravable e IVA por su cuenta.
 *
 * Estas pruebas se escriben contra el CONTRATO DEL BACKEND, no contra lo que
 * hoy devuelve el front. El backend es la autoridad fiscal —`Money.java`, que
 * usa `BigDecimal`, escala 2 y `HALF_UP`, con escala intermedia de 6 decimales
 * para el factor `(1 + pct/100)`— y lo que el cajero ve en pantalla debe
 * cuadrar con lo que la DIAN acaba recibiendo. Cuando una prueba documenta una
 * divergencia en vez de exigir el valor correcto, lo dice explícitamente y
 * remite a FE-09.
 *
 * Los importes son en pesos colombianos. El formateador de la aplicación
 * redondea a pesos enteros, así que cualquier deriva de centavos es INVISIBLE
 * en pantalla: el único sitio donde puede detectarse es aquí.
 */

/** Línea de venta con lo mínimo que mira el cálculo. */
function line(over: Partial<SaleLine> = {}): SaleLine {
  return {
    kind: 'product',
    id: 1,
    name: 'Producto',
    unitPrice: 10_000,
    qty: 1,
    taxTreatment: 'GRAVADO',
    taxPercentage: 19,
    ...over,
  }
}

/**
 * Réplica exacta de `Money.extractBase` del backend: factor a 6 decimales
 * HALF_UP, división a 2 decimales HALF_UP. Es la referencia contra la que se
 * contrasta el cálculo del front.
 */
function backendExtractBase(total: number, percentage: number): number {
  const factor = roundHalfUp(1 + percentage / 100, 6)
  return roundHalfUp(total / factor, 2)
}

/** HALF_UP a N decimales, evitando el sesgo a par de `toFixed`/`Math.round`. */
function roundHalfUp(value: number, decimals: number): number {
  const shifted = Number(`${value}e${decimals}`)
  const rounded = Math.sign(shifted) * Math.round(Math.abs(shifted))
  return Number(`${rounded}e-${decimals}`)
}

describe('effectiveTaxRate', () => {
  it('devuelve el porcentaje cuando el ítem es gravado', () => {
    expect(effectiveTaxRate(true, 19)).toBe(19)
  })

  it.each([
    ['no aplica IVA', false, 19],
    ['el porcentaje es null', true, null],
    ['el porcentaje es undefined', true, undefined],
  ])('devuelve 0 cuando %s', (_caso, aplica, pct) => {
    expect(effectiveTaxRate(aplica, pct)).toBe(0)
  })

  it('no reinterpreta un 0 explícito como "sin dato"', () => {
    // Un ítem gravado al 0 % existe (exento con tarifa cero declarada). Debe dar
    // 0 igual que "sin impuesto", pero por la razón correcta.
    expect(effectiveTaxRate(true, 0)).toBe(0)
  })
})

describe('appliesIva', () => {
  it.each([
    ['GRAVADO', true],
    ['EXENTO', false],
    ['EXCLUIDO', false],
    ['INC', false],
  ] as [TaxTreatment, boolean][])('%s → %s', (treatment, esperado) => {
    expect(appliesIva(treatment)).toBe(esperado)
  })

  it('solo GRAVADO extrae IVA: INC y EXENTO no son lo mismo pero aquí coinciden', () => {
    // INC (impuesto al consumo) no es IVA y no se extrae del bruto. Si alguien
    // "arreglara" esto tratando INC como gravado, el POS restaría un impuesto
    // que la factura no lleva.
    expect(appliesIva('INC')).toBe(false)
  })
})

describe('taxTreatmentLabel', () => {
  it('traduce las cuatro clasificaciones', () => {
    expect(taxTreatmentLabel('GRAVADO')).toBe('Gravado')
    expect(taxTreatmentLabel('EXENTO')).toBe('Exento (0%)')
    expect(taxTreatmentLabel('EXCLUIDO')).toBe('Excluido')
    expect(taxTreatmentLabel('INC')).toBe('INC')
  })

  it('devuelve el valor crudo ante una clasificación que no conoce', () => {
    // Si el backend añade una clasificación, la pantalla muestra el enum en vez
    // de un hueco vacío.
    expect(taxTreatmentLabel('NUEVO' as TaxTreatment)).toBe('NUEVO')
  })
})

describe('formatMoney', () => {
  it('formatea en pesos colombianos sin decimales', () => {
    // Se normalizan los espacios: Intl usa NBSP/NNBSP según plataforma.
    expect(formatMoney(1_234_567).replace(/\s/g, ' ')).toMatch(/^\$\s?1\.234\.567$/)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('muestra 0 ante %s en vez de "NaN" en la pantalla de cobro', (_caso, valor) => {
    expect(formatMoney(valor).replace(/\s/g, ' ')).toMatch(/^\$\s?0$/)
  })

  it('OCULTA los centavos: es la razón de que una deriva no se vea', () => {
    // Documenta el mecanismo de FE-09. Dos importes que difieren en 49 centavos
    // se muestran idénticos, así que ningún cajero puede detectar el descuadre.
    expect(formatMoney(10_000)).toBe(formatMoney(10_000.49))
  })
})

describe('formatMoneyExact', () => {
  it('muestra siempre los dos decimales', () => {
    // En los desgloses fiscales el centavo es el dato: ocultarlo es lo que hacía
    // invisible cualquier descuadre.
    expect(formatMoneyExact(19_000).replace(/\s/g, ' ')).toMatch(/^\$\s?19\.000,00$/)
    expect(formatMoneyExact(19_000.5).replace(/\s/g, ' ')).toMatch(/^\$\s?19\.000,50$/)
  })

  it('no imprime NaN sobre un desglose', () => {
    expect(formatMoneyExact(Number.NaN).replace(/\s/g, ' ')).toMatch(/^\$\s?0,00$/)
  })
})

describe('lineGross', () => {
  it('es el producto a escala monetaria, como Money.multiply del backend', () => {
    expect(lineGross(12_500, 3)).toBe(37_500)
  })

  it('una cantidad fraccionaria no arrastra decimales de más', () => {
    expect(lineGross(12_500, 2.5)).toBe(31_250)
  })
})

describe('taxByRate', () => {
  it('agrupa el impuesto por tarifa', () => {
    const filas = taxByRate([
      { gross: 119_000, ratePct: 19 },
      { gross: 238_000, ratePct: 19 },
      { gross: 105_000, ratePct: 5 },
    ])

    expect(filas).toEqual([
      { name: 'IVA 19%', amount: 57_000 },
      { name: 'IVA 5%', amount: 5_000 },
    ])
  })

  it('ignora las líneas sin tarifa', () => {
    expect(taxByRate([{ gross: 50_000, ratePct: 0 }])).toEqual([])
  })

  it('respeta la etiqueta del catálogo cuando la hay', () => {
    // El nombre del impuesto lo define la empresa; inventarlo aquí produciría
    // dos nombres distintos para la misma tarifa en el mismo ticket.
    const filas = taxByRate([{ gross: 119_000, ratePct: 19, label: 'IVA general' }])

    expect(filas[0].name).toBe('IVA general')
  })

  it('acumula sin deriva sobre muchas líneas', () => {
    // Veinte líneas idénticas: la suma tiene que ser exactamente veinte veces
    // una, no veinte veces una más el error de coma flotante.
    const unaLinea = { gross: 33_333, ratePct: 19 }
    const filas = taxByRate(Array.from({ length: 20 }, () => unaLinea))

    expect(filas[0].amount).toBe(splitGross(33_333, true, 19).tax * 20)
  })

  it('el mismo carrito da el mismo desglose en el POS y en el cierre de cuenta', () => {
    // Antes cada pantalla tenía su propio bucle. Esta prueba fija que hay una
    // sola regla: si alguien vuelve a duplicarla, dejará de cumplirse.
    const carrito = [
      { gross: 119_000, ratePct: 19 },
      { gross: 47_600, ratePct: 19 },
      { gross: 105_000, ratePct: 5 },
      { gross: 30_000, ratePct: 0 },
    ]

    expect(taxByRate(carrito)).toEqual(taxByRate([...carrito].reverse()).reverse())
  })
})

describe('splitGross', () => {
  it('no extrae nada cuando el ítem no es gravado', () => {
    expect(splitGross(10_000, false, 19)).toEqual({ base: 10_000, tax: 0 })
  })

  it('no extrae nada cuando la tasa es 0', () => {
    expect(splitGross(10_000, true, 0)).toEqual({ base: 10_000, tax: 0 })
  })

  it('base + impuesto reconstruyen exactamente el bruto', () => {
    // Invariante irrenunciable: lo que el cliente paga es lo que se desglosa. Si
    // esto fallara, la factura no cuadraría consigo misma.
    for (const gross of [1, 999, 10_000, 33_333, 119_000, 1_234_567]) {
      const { base, tax } = splitGross(gross, true, 19)
      expect(base + tax).toBeCloseTo(gross, 6)
    }
  })

  it('coincide con Money.extractBase del backend en importes redondos', () => {
    // 119.000 con IVA del 19 % → base exacta 100.000. Si el front y el backend
    // divergieran aquí, divergirían en el caso más fácil de todos.
    expect(splitGross(119_000, true, 19).base).toBe(backendExtractBase(119_000, 19))
    expect(splitGross(119_000, true, 19).base).toBe(100_000)
  })

  it.each([
    [1, 19],
    [7, 19],
    [999, 19],
    [12_345, 19],
    [99_999, 19],
    [1_234_567, 19],
    [10_000, 5],
    [10_000, 8],
  ])('coincide con el backend para %i al %i %%', (gross, pct) => {
    expect(splitGross(gross, true, pct).base).toBeCloseTo(backendExtractBase(gross, pct), 2)
  })

  it('el impuesto de una sola línea nunca supera al bruto', () => {
    for (const pct of [5, 8, 19]) {
      const { tax } = splitGross(50_000, true, pct)
      expect(tax).toBeGreaterThan(0)
      expect(tax).toBeLessThan(50_000)
    }
  })

  it('un bruto de 0 no produce impuesto ni base negativa', () => {
    expect(splitGross(0, true, 19)).toEqual({ base: 0, tax: 0 })
  })
})

describe('computeTotals', () => {
  it('un carrito vacío no produce NaN', () => {
    // El POS arranca vacío. Un NaN aquí se propaga al formateador y a la
    // petición de venta.
    expect(computeTotals([])).toEqual({ net: 0, tax: 0, total: 0, promoSavings: 0 })
  })

  it('suma el bruto de todas las líneas, no solo de la primera', () => {
    // Mismo error de clase que BE-01 en el backend: iterar y quedarse con el
    // primer elemento. Aquí se fija que las tres líneas cuentan.
    const totals = computeTotals([
      line({ id: 1, unitPrice: 10_000, qty: 1 }),
      line({ id: 2, unitPrice: 20_000, qty: 2 }),
      line({ id: 3, unitPrice: 5_000, qty: 3 }),
    ])

    expect(totals.total).toBe(10_000 + 40_000 + 15_000)
  })

  it('multiplica por la cantidad', () => {
    expect(computeTotals([line({ unitPrice: 3_500, qty: 4 })]).total).toBe(14_000)
  })

  it('extrae el IVA del bruto, no lo suma encima', () => {
    // El modelo del backend es precio BRUTO con impuesto incluido. Si el front
    // sumara el IVA, el cliente pagaría un 19 % de más.
    const totals = computeTotals([line({ unitPrice: 119_000, qty: 1 })])

    expect(totals.total).toBe(119_000)
    expect(totals.tax).toBeCloseTo(19_000, 2)
    expect(totals.net).toBeCloseTo(100_000, 2)
  })

  it('base + impuesto reconstruyen el total en un carrito mixto', () => {
    const totals = computeTotals([
      line({ id: 1, unitPrice: 119_000, taxTreatment: 'GRAVADO', taxPercentage: 19 }),
      line({ id: 2, unitPrice: 50_000, taxTreatment: 'EXCLUIDO', taxPercentage: 0 }),
      line({ id: 3, unitPrice: 21_400, taxTreatment: 'GRAVADO', taxPercentage: 7, qty: 2 }),
    ])

    expect(totals.net + totals.tax).toBeCloseTo(totals.total, 6)
  })

  it('no cobra impuesto por las líneas excluidas ni exentas', () => {
    const totals = computeTotals([
      line({ id: 1, unitPrice: 50_000, taxTreatment: 'EXCLUIDO' }),
      line({ id: 2, unitPrice: 30_000, taxTreatment: 'EXENTO' }),
    ])

    expect(totals.tax).toBe(0)
    expect(totals.net).toBe(80_000)
  })

  it('aplica el descuento manual sobre el bruto', () => {
    const totals = computeTotals([line({ unitPrice: 100_000 })], 20_000)

    expect(totals.total).toBe(80_000)
  })

  it('reduce el impuesto proporcionalmente al descuento manual', () => {
    // El descuento no puede reducir el total sin reducir el IVA: se estaría
    // liquidando impuesto sobre dinero que nadie cobró.
    const sinDescuento = computeTotals([line({ unitPrice: 119_000 })])
    const conDescuento = computeTotals([line({ unitPrice: 119_000 })], 59_500)

    expect(conDescuento.total).toBe(59_500)
    expect(conDescuento.tax).toBeCloseTo(sinDescuento.tax / 2, 2)
  })

  it('un descuento mayor que el carrito no deja el total en negativo', () => {
    const totals = computeTotals([line({ unitPrice: 10_000 })], 999_999)

    expect(totals.total).toBe(0)
    expect(totals.tax).toBe(0)
    expect(totals.net).toBe(0)
  })

  it('acumula el ahorro por promoción y le suma el descuento manual', () => {
    const totals = computeTotals(
      [
        line({ id: 1, unitPrice: 8_000, originalUnitPrice: 10_000, qty: 2 }),
        line({ id: 2, unitPrice: 5_000, originalUnitPrice: 5_000 }),
      ],
      1_000,
    )

    expect(totals.promoSavings).toBe(2_000 * 2 + 1_000)
  })

  it('ignora un originalUnitPrice menor que el precio aplicado', () => {
    // Un "ahorro" negativo sería un recargo presentado como descuento.
    const totals = computeTotals([line({ unitPrice: 10_000, originalUnitPrice: 8_000 })])

    expect(totals.promoSavings).toBe(0)
  })

  it('el total nunca es negativo aunque las líneas lleguen con precio negativo', () => {
    // Defensa de entrada: una devolución mal modelada no debe producir un cobro
    // negativo silencioso.
    const totals = computeTotals([line({ unitPrice: -5_000 })])

    expect(totals.total).toBeGreaterThanOrEqual(0)
  })

  /**
   * FE-09. Estas dos pruebas NO exigen el resultado correcto: documentan con
   * números la deriva que hoy existe, para que el día que se migre a aritmética
   * entera o decimal quede constancia de qué se estaba arreglando.
   */
  describe('deriva en coma flotante (FE-09)', () => {
    it('el impuesto de N líneas iguales no es N veces el de una', () => {
      const una = computeTotals([line({ unitPrice: 33_333, qty: 1 })])
      const cien = computeTotals(
        Array.from({ length: 100 }, (_, i) => line({ id: i, unitPrice: 33_333 })),
      )

      const derivaEnCentavos = Math.abs(cien.tax - una.tax * 100) * 100

      // Hoy la deriva existe pero se mantiene por debajo del peso, así que la
      // factura cuadra. Si esta cota se rompiera, el descuadre llegaría a la DIAN.
      expect(derivaEnCentavos).toBeLessThan(100)
    })

    it('el desglose sigue cuadrando pese al factor de descuento sin escala fija', () => {
      // El factor `discountedGross / gross` es un number sin escala; el backend
      // usa BigDecimal a 6 decimales. Mientras base + IVA reconstruyan el total,
      // el documento es consistente aunque los centavos no coincidan con el
      // backend al centavo.
      const totals = computeTotals(
        [
          line({ id: 1, unitPrice: 3_333, qty: 7 }),
          line({ id: 2, unitPrice: 11_111, qty: 3 }),
          line({ id: 3, unitPrice: 777, qty: 13 }),
        ],
        1_777,
      )

      expect(totals.net + totals.tax).toBeCloseTo(totals.total, 6)
      expect(totals.total).toBeGreaterThan(0)
    })
  })
})

describe('promoStatus', () => {
  function promo(over: Partial<PromotionResponse> = {}): PromotionResponse {
    return {
      id: 1,
      name: 'Promo',
      promotionType: 'DISCOUNT',
      applicationType: 'PRODUCT',
      applicationItem: 1,
      valueType: 'PERCENTAGE',
      value: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      promotionStatus: 'ACTIVE',
      company: { id: 1, name: 'Vet' } as PromotionResponse['company'],
      createdDate: '2026-01-01',
      enabled: true,
      ...over,
    }
  }

  it('una promoción desactivada lo está aunque las fechas la cubran', () => {
    expect(promoStatus(promo({ promotionStatus: 'INACTIVE' }), '2026-06-01')).toBe('INACTIVA')
  })

  it('antes del inicio está programada', () => {
    expect(promoStatus(promo(), '2025-12-31')).toBe('PROGRAMADA')
  })

  it('después del fin está vencida', () => {
    expect(promoStatus(promo(), '2027-01-01')).toBe('VENCIDA')
  })

  it.each([
    ['el primer día', '2026-01-01'],
    ['un día intermedio', '2026-06-15'],
    ['el último día', '2026-12-31'],
  ])('está activa %s del rango, extremos incluidos', (_caso, hoy) => {
    // Los extremos son inclusivos: una promoción que caduca "el 31" vale el 31.
    expect(promoStatus(promo(), hoy)).toBe('ACTIVA')
  })

  it('tolera fechas con hora, quedándose con el día', () => {
    expect(promoStatus(promo({ startDate: '2026-01-01T10:30:00' }), '2026-01-01')).toBe('ACTIVA')
  })

  it('sin fechas se considera activa', () => {
    expect(promoStatus(promo({ startDate: '', endDate: '' }), '2026-06-01')).toBe('ACTIVA')
  })

  it('tolera fechas nulas sin lanzar', () => {
    // El backend las declara `string`, pero una promoción sin vigencia definida
    // llega con null. Si `slice` reventara aquí, se caería la pantalla entera de
    // promociones, no solo esa fila.
    const sinFechas = promo({
      startDate: null as unknown as string,
      endDate: null as unknown as string,
    })

    expect(() => promoStatus(sinFechas, '2026-06-01')).not.toThrow()
    expect(promoStatus(sinFechas, '2026-06-01')).toBe('ACTIVA')
  })
})

describe('applyPromo', () => {
  const item = { id: 7 } as ProductResponse
  const HOY = '2026-06-01'

  function promo(over: Partial<PromotionResponse> = {}): PromotionResponse {
    return {
      id: 1,
      name: 'Promo',
      promotionType: 'DISCOUNT',
      applicationType: 'PRODUCT',
      applicationItem: 7,
      valueType: 'PERCENTAGE',
      value: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      promotionStatus: 'ACTIVE',
      company: { id: 1, name: 'Vet' } as PromotionResponse['company'],
      createdDate: '2026-01-01',
      enabled: true,
      ...over,
    }
  }

  it('sin promociones deja el precio base', () => {
    expect(applyPromo(item, 'product', 10_000, 3, [], HOY)).toEqual({
      unitPrice: 10_000,
      original: 10_000,
      promo: null,
    })
  })

  it('aplica un descuento porcentual', () => {
    const { unitPrice } = applyPromo(item, 'product', 10_000, 3, [promo({ value: 20 })], HOY)

    expect(unitPrice).toBe(8_000)
  })

  it('aplica un descuento de importe fijo', () => {
    const p = promo({ valueType: 'AMOUNT', value: 1_500 })

    expect(applyPromo(item, 'product', 10_000, 3, [p], HOY).unitPrice).toBe(8_500)
  })

  it('un descuento fijo mayor que el precio no produce un precio negativo', () => {
    const p = promo({ valueType: 'AMOUNT', value: 99_999 })

    expect(applyPromo(item, 'product', 10_000, 3, [p], HOY).unitPrice).toBe(0)
  })

  it('aplica un precio especial', () => {
    const p = promo({ promotionType: 'SPECIAL_PRICE', value: 6_500 })

    expect(applyPromo(item, 'product', 10_000, 3, [p], HOY).unitPrice).toBe(6_500)
  })

  it('elige la más barata cuando varias aplican', () => {
    const resultado = applyPromo(
      item,
      'product',
      10_000,
      3,
      [
        promo({ id: 1, value: 10 }),
        promo({ id: 2, promotionType: 'SPECIAL_PRICE', value: 7_000 }),
        promo({ id: 3, value: 25 }),
      ],
      HOY,
    )

    expect(resultado.unitPrice).toBe(7_000)
    expect(resultado.promo?.id).toBe(2)
  })

  it('ignora una promoción que no aplica por fecha', () => {
    const vencida = promo({ endDate: '2026-01-31', value: 90 })

    expect(applyPromo(item, 'product', 10_000, 3, [vencida], HOY).unitPrice).toBe(10_000)
  })

  it('ignora una promoción desactivada aunque sea la más barata', () => {
    const p = promo({ promotionStatus: 'INACTIVE', promotionType: 'SPECIAL_PRICE', value: 1 })

    expect(applyPromo(item, 'product', 10_000, 3, [p], HOY).unitPrice).toBe(10_000)
  })

  it('no aplica la promoción de otro producto', () => {
    const otra = promo({ applicationItem: 999, value: 50 })

    expect(applyPromo(item, 'product', 10_000, 3, [otra], HOY).unitPrice).toBe(10_000)
  })

  it('no aplica una promoción de servicio a un producto del mismo id', () => {
    // El id 7 existe como producto Y como servicio: son espacios distintos.
    // Cruzarlos regalaría descuentos que nadie configuró.
    const deServicio = promo({ applicationType: 'SERVICE', applicationItem: 7, value: 50 })

    expect(applyPromo(item, 'product', 10_000, 3, [deServicio], HOY).unitPrice).toBe(10_000)
  })

  it('aplica la promoción de servicio a un servicio', () => {
    // La contraparte del caso anterior: el mismo id, pero como servicio, sí
    // recibe la promoción de servicio.
    const deServicio = promo({ applicationType: 'SERVICE', applicationItem: 7, value: 50 })

    expect(applyPromo(item, 'service', 10_000, 3, [deServicio], HOY).unitPrice).toBe(5_000)
  })

  it('ignora un tipo de promoción que no sabe aplicar', () => {
    // El backend admite tipos que este cálculo no implementa (p. ej. paquetes).
    // Ante uno desconocido debe dejar el precio base, no un precio a medias.
    const desconocida = promo({ promotionType: 'PAQUETE' as never, value: 1 })

    expect(applyPromo(item, 'product', 10_000, 3, [desconocida], HOY).unitPrice).toBe(10_000)
  })

  it('aplica la promoción por categoría', () => {
    const porCategoria = promo({ applicationType: 'CATEGORY', applicationItem: 3, value: 50 })

    expect(applyPromo(item, 'product', 10_000, 3, [porCategoria], HOY).unitPrice).toBe(5_000)
  })

  it('nunca sube el precio: una promoción más cara que el base se ignora', () => {
    const cara = promo({ promotionType: 'SPECIAL_PRICE', value: 15_000 })

    expect(applyPromo(item, 'product', 10_000, 3, [cara], HOY).unitPrice).toBe(10_000)
  })

  it('devuelve el precio redondeado a pesos enteros', () => {
    // El backend guarda el precio del cargo en enteros; dejar decimales aquí
    // produciría un desajuste entre lo mostrado y lo cobrado.
    const { unitPrice } = applyPromo(item, 'product', 10_000, 3, [promo({ value: 33 })], HOY)

    expect(Number.isInteger(unitPrice)).toBe(true)
    expect(unitPrice).toBe(6_700)
  })

  it('conserva el precio original para poder mostrar el ahorro', () => {
    const { original } = applyPromo(item, 'product', 10_000, 3, [promo({ value: 20 })], HOY)

    expect(original).toBe(10_000)
  })
})

describe('stockState', () => {
  it.each([
    ['agotado en 0', 0, 5, 'AGOTADO'],
    ['agotado en negativo', -3, 5, 'AGOTADO'],
    ['bajo en el mínimo exacto', 5, 5, 'BAJO'],
    ['bajo por debajo del mínimo', 2, 5, 'BAJO'],
    ['ok por encima', 6, 5, 'OK'],
    ['ok con mínimo 0', 1, 0, 'OK'],
  ])('%s', (_caso, cantidad, minimo, esperado) => {
    expect(stockState(cantidad, minimo)).toBe(esperado)
  })

  it('agotado gana a bajo cuando el mínimo es 0 y no hay stock', () => {
    expect(stockState(0, 0)).toBe('AGOTADO')
  })
})
