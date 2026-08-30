import { describe, it, expect } from 'vitest'
import { buildDocumentReceiptTicket } from '@/composables/buildDocumentReceipt'
import type { ElectronicDocumentResponse } from '@/features/facturacion/types/facturacion'
import { elemento, exigir } from '../helpers/exigir'

/**
 * El recibo impreso. Es la fuente única del comprobante —lo usan el POS y el
 * cierre de cuenta—, y es el único artefacto de todo el sistema que el cliente
 * se lleva en la mano: si aquí falta el sello fiscal, sobra un IVA o el cambio
 * está mal, no hay forma de descubrirlo después.
 *
 * Todos los importes se muestran ya formateados a pesos enteros, así que las
 * pruebas comparan contra el texto que se imprime, que es lo que el cliente ve.
 */

const $ = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

type Recibo = ReturnType<typeof buildDocumentReceiptTicket>

/**
 * `ReceiptTicket` declara opcionales los bloques que este constructor SIEMPRE
 * rellena. Las pruebas los leían directamente y, cuando `tests/**` entró bajo
 * `vue-tsc`, cada acceso salió como «posiblemente undefined». No se tapan con
 * `!`: se exigen, de modo que un recibo al que le falte un bloque falle diciendo
 * cuál falta en vez de morir con un «cannot read properties of undefined».
 */
const pie = (t: Recibo) => exigir(t.footer, 'el pie del recibo')
const entrega = (t: Recibo, i: number) =>
  elemento(exigir(t.tender, 'el bloque de entrega/cambio'), i, 'el bloque de entrega/cambio')
const fiscal = (t: Recibo) => exigir(t.fiscal, 'el bloque fiscal del emisor')
const datos = (t: Recibo) => exigir(t.meta, 'el bloque de datos del recibo')
const linea = (t: Recibo, i: number) => elemento(t.lines, i, 'las líneas del recibo')

function doc(over: Partial<ElectronicDocumentResponse> = {}): ElectronicDocumentResponse {
  return {
    id: 42,
    companyId: 1,
    openAccountId: null,
    documentType: 'FE_VENTA',
    prefix: 'SETP',
    consecutive: 990_000_001,
    issueDate: '2026-08-08',
    issueTime: '14:35:22',
    cufe: null,
    cude: null,
    uuid: null,
    qrUrl: null,
    dianStatus: 'PENDIENTE',
    dianValidationDate: null,
    issuer: {
      legalName: 'Veterinaria Kefaro SAS',
      documentType: 'NIT',
      documentId: '901234567',
      verificationDigit: '8',
      taxRegime: 'COMUN',
      email: 'facturacion@kefaro.tech',
    } as ElectronicDocumentResponse['issuer'],
    customer: { name: 'Ana Pérez' } as ElectronicDocumentResponse['customer'],
    lineExtensionAmount: 100_000,
    taxExclusiveAmount: 100_000,
    taxInclusiveAmount: 119_000,
    payableAmount: 119_000,
    reteFuenteAmount: 0,
    reteIvaAmount: 0,
    reteIcaAmount: 0,
    netPayableAmount: 119_000,
    paymentForm: 'CONTADO',
    lines: [
      {
        description: 'Consulta general',
        quantity: 1,
        unitPrice: 119_000,
        totalAmount: 119_000,
      } as ElectronicDocumentResponse['lines'][number],
    ],
    payments: [{ paymentMeans: 'EFECTIVO' } as ElectronicDocumentResponse['payments'][number]],
    taxTotalsByRate: [],
    reference: null,
    noteReasonCode: null,
    noteReasonText: null,
    reversed: false,
    createdDate: '2026-08-08',
    enabled: true,
    ...over,
  }
}

/** Busca una fila de totales por etiqueta. */
function total(ticket: ReturnType<typeof buildDocumentReceiptTicket>, label: string) {
  return ticket.totals.find((t) => t.label === label)
}

describe('tipo de documento', () => {
  /**
   * El rótulo fiscal del recibo no lo comprobaba nadie, y el `doc()` de arriba
   * declaraba `documentType: 'FACTURA_VENTA'`, que NO es un
   * `ElectronicDocumentType` (`FE_VENTA` | `DOC_EQUIV_POS` | `NOTA_CREDITO` |
   * `NOTA_DEBITO`). Con ese valor, `DOC_TYPE_LABEL[doc.documentType]` fallaba y
   * `buildDocumentReceipt.ts` caía en su `?? 'Comprobante'`: TODAS las pruebas
   * de este fichero corrían sobre el rótulo genérico, nunca sobre uno real.
   */
  it('imprime el rótulo fiscal del tipo, no el genérico', () => {
    expect(buildDocumentReceiptTicket(doc(), { width: '80' }).docType).toBe('Factura electrónica')
  })

  it('cada tipo trae el suyo', () => {
    const rotulo = (t: ElectronicDocumentResponse['documentType']) =>
      buildDocumentReceiptTicket(doc({ documentType: t }), { width: '80' }).docType

    expect(rotulo('DOC_EQUIV_POS')).toBe('Documento POS')
    expect(rotulo('NOTA_CREDITO')).toBe('Nota crédito')
    expect(rotulo('NOTA_DEBITO')).toBe('Nota débito')
  })

  it('ante un tipo que todavía no conoce, imprime «Comprobante» en vez de quedarse en blanco', () => {
    // El `?? 'Comprobante'` de `buildDocumentReceipt.ts` es la red para el día en
    // que la DIAN añada un tipo y el backend lo emita antes de que este front lo
    // conozca. Bajo el tipo del contrato ese caso es inalcanzable, así que la
    // única forma de ejercitarlo es fabricar a mano lo que fabricaría el backend:
    // el `as` es el simulacro, y va aquí y en ningún otro sitio.
    const desconocido = 'FE_EXPORTACION' as ElectronicDocumentResponse['documentType']

    const ticket = buildDocumentReceiptTicket(doc({ documentType: desconocido }), { width: '80' })

    expect(ticket.docType).toBe('Comprobante')
  })
})

describe('numeración del documento', () => {
  it('imprime prefijo y consecutivo juntos', () => {
    expect(buildDocumentReceiptTicket(doc(), { width: '80' }).docNumber).toBe('SETP990000001')
  })

  it('sin consecutivo imprime el número interno y avisa de que falta emitir', () => {
    // Una venta registrada sin módulo de facturación queda PENDIENTE. El recibo
    // debe decirlo: si no, el cliente se lleva un papel que parece una factura.
    const ticket = buildDocumentReceiptTicket(doc({ consecutive: null, prefix: null }), {
      width: '80',
    })

    expect(ticket.docNumber).toBe('Interno 42')
    expect(pie(ticket).lines?.[0]).toContain('emisión a la DIAN pendiente')
  })

  it('con consecutivo no imprime el aviso de emisión pendiente', () => {
    expect(pie(buildDocumentReceiptTicket(doc(), { width: '80' })).lines).toBeUndefined()
  })

  it('tolera un prefijo nulo con consecutivo presente', () => {
    expect(buildDocumentReceiptTicket(doc({ prefix: null }), { width: '80' }).docNumber).toBe(
      '990000001',
    )
  })
})

describe('totales', () => {
  it('muestra base, IVA y total, y el IVA es la diferencia entre bruto y base', () => {
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80' })

    expect(total(ticket, 'Subtotal (base)')?.value).toBe($(100_000))
    expect(total(ticket, 'IVA')?.value).toBe($(19_000))
    expect(total(ticket, 'TOTAL')?.value).toBe($(119_000))
  })

  it('oculta la fila de IVA cuando el documento no lleva impuesto', () => {
    // Un carrito íntegramente excluido no debe imprimir "IVA $ 0": induce a
    // pensar que hubo un impuesto de cero cuando no hubo impuesto en absoluto.
    const ticket = buildDocumentReceiptTicket(
      doc({ taxExclusiveAmount: 50_000, taxInclusiveAmount: 50_000, payableAmount: 50_000 }),
      { width: '80' },
    )

    expect(total(ticket, 'IVA')).toBeUndefined()
    expect(total(ticket, 'TOTAL')?.value).toBe($(50_000))
  })

  it('el TOTAL sale de payableAmount, no de la suma de las líneas', () => {
    // Es el importe que el backend liquidó y el que va a la DIAN. Recalcularlo
    // en el front abriría la puerta a que el papel y la factura discrepen.
    const ticket = buildDocumentReceiptTicket(doc({ payableAmount: 111_111, lines: [] }), {
      width: '80',
    })

    expect(total(ticket, 'TOTAL')?.value).toBe($(111_111))
  })

  it('marca el TOTAL como fila principal y las demás como tenues', () => {
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80' })

    expect(total(ticket, 'TOTAL')?.kind).toBe('grand')
    expect(total(ticket, 'Subtotal (base)')?.kind).toBe('muted')
  })
})

describe('efectivo y cambio', () => {
  it('sin cambio declarado no imprime Recibido ni Cambio', () => {
    // Pago exacto o con tarjeta: esas filas no aplican.
    expect(buildDocumentReceiptTicket(doc(), { width: '80' }).tender).toEqual([])
  })

  it('Recibido es el total más el cambio devuelto', () => {
    // La identidad que el cliente comprueba de un vistazo: entregó 150.000,
    // pagó 119.000, le devuelven 31.000.
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80', change: 31_000 })

    expect(entrega(ticket, 0)).toEqual({ label: 'Recibido', value: $(150_000), kind: 'pay' })
    expect(entrega(ticket, 1)).toEqual({ label: 'Cambio', value: $(31_000), kind: 'change' })
  })

  it('un cambio de 0 sí se imprime: es un pago exacto en efectivo, no la ausencia de dato', () => {
    // `change: 0` y `change: null` son cosas distintas y el recibo las distingue.
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80', change: 0 })

    expect(ticket.tender).toHaveLength(2)
    expect(entrega(ticket, 0).value).toBe($(119_000))
    expect(entrega(ticket, 1).value).toBe($(0))
  })
})

describe('sello DIAN', () => {
  it('sin CUFE ni CUDE no imprime sello', () => {
    expect(buildDocumentReceiptTicket(doc(), { width: '80' }).dian).toBeUndefined()
  })

  it('imprime el CUFE de una factura validada', () => {
    const ticket = buildDocumentReceiptTicket(
      doc({ cufe: 'abc123', dianValidationDate: '2026-08-08T14:36:00.123' }),
      { width: '80' },
    )

    expect(ticket.dian?.sealLabel).toBe('CUFE')
    expect(ticket.dian?.seal).toBe('abc123')
    expect(ticket.dian?.info?.[0]).toBe('Validado DIAN 2026-08-08 14:36')
  })

  it('imprime el CUDE cuando el documento es equivalente o nota', () => {
    const ticket = buildDocumentReceiptTicket(doc({ cude: 'cude789' }), { width: '80' })

    expect(ticket.dian?.sealLabel).toBe('CUDE')
    expect(ticket.dian?.seal).toBe('cude789')
  })

  it('el CUFE manda cuando vienen los dos', () => {
    const ticket = buildDocumentReceiptTicket(doc({ cufe: 'f1', cude: 'd1' }), { width: '80' })

    expect(ticket.dian?.sealLabel).toBe('CUFE')
    expect(ticket.dian?.seal).toBe('f1')
  })

  it('no pierde el CUDE cuando el proveedor devuelve el CUFE como cadena vacía', () => {
    // `cufe ?? cude` solo cae al CUDE si el CUFE es null/undefined: una cadena
    // vacía lo satisface y deja el documento SIN sello impreso. Un proveedor que
    // devuelva "" en lugar de null borraría el sello fiscal del comprobante.
    const ticket = buildDocumentReceiptTicket(doc({ cufe: '', cude: 'cude789' }), { width: '80' })

    expect(ticket.dian?.seal).toBe('cude789')
    expect(ticket.dian?.sealLabel).toBe('CUDE')
  })

  it('sin fecha de validación no inventa la línea de validado', () => {
    const ticket = buildDocumentReceiptTicket(doc({ cufe: 'abc123' }), { width: '80' })

    expect(ticket.dian?.info).toBeUndefined()
  })

  it('arrastra la URL del QR cuando el proveedor la envía', () => {
    const ticket = buildDocumentReceiptTicket(
      doc({ cufe: 'abc', qrUrl: 'https://proveedor.example/qr/abc.png' }),
      { width: '80' },
    )

    expect(ticket.dian?.qrUrl).toBe('https://proveedor.example/qr/abc.png')
  })
})

describe('líneas', () => {
  it('imprime cantidad, descripción e importe de cada línea', () => {
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80' })

    expect(ticket.lines).toHaveLength(1)
    expect(linea(ticket, 0).qty).toBe('1×')
    expect(linea(ticket, 0).desc).toBe('Consulta general')
    expect(linea(ticket, 0).amount).toBe($(119_000))
  })

  it('añade el precio unitario solo cuando hay más de una unidad', () => {
    const una = buildDocumentReceiptTicket(doc(), { width: '80' })
    const varias = buildDocumentReceiptTicket(
      doc({
        lines: [
          {
            description: 'Vacuna',
            quantity: 3,
            unitPrice: 40_000,
            totalAmount: 120_000,
          } as ElectronicDocumentResponse['lines'][number],
        ],
      }),
      { width: '80' },
    )

    expect(linea(una, 0).sub).toBeUndefined()
    expect(linea(varias, 0).sub).toBe(`· ${$(40_000)} c/u`)
  })

  it('imprime todas las líneas, no solo la primera', () => {
    const ticket = buildDocumentReceiptTicket(
      doc({
        lines: [
          { description: 'A', quantity: 1, unitPrice: 1_000, totalAmount: 1_000 },
          { description: 'B', quantity: 1, unitPrice: 2_000, totalAmount: 2_000 },
          { description: 'C', quantity: 1, unitPrice: 3_000, totalAmount: 3_000 },
        ] as ElectronicDocumentResponse['lines'],
      }),
      { width: '80' },
    )

    expect(ticket.lines.map((l) => l.desc)).toEqual(['A', 'B', 'C'])
  })
})

describe('bloque fiscal del emisor', () => {
  it('compone NIT con dígito de verificación y régimen', () => {
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80' })

    expect(ticket.brand.name).toBe('Veterinaria Kefaro SAS')
    expect(elemento(fiscal(ticket), 0)).toContain('NIT 901234567-8')
    expect(ticket.fiscal).toContain('facturacion@kefaro.tech')
  })

  it('omite el guion cuando no hay dígito de verificación', () => {
    const ticket = buildDocumentReceiptTicket(
      doc({
        issuer: {
          legalName: 'Vet',
          documentType: 'CC',
          documentId: '123',
          verificationDigit: null,
          taxRegime: null,
          email: null,
        } as unknown as ElectronicDocumentResponse['issuer'],
      }),
      { width: '80' },
    )

    expect(elemento(fiscal(ticket), 0)).not.toContain('-')
  })

  it('cae a un nombre por defecto si el emisor no trae razón social', () => {
    const ticket = buildDocumentReceiptTicket(
      doc({ issuer: null as unknown as ElectronicDocumentResponse['issuer'] }),
      { width: '80' },
    )

    expect(ticket.brand.name).toBe('Vetrina')
    expect(ticket.fiscal).toEqual([])
  })
})

describe('cliente', () => {
  it('usa el nombre comercial y cae al nombre legal', () => {
    const conNombre = buildDocumentReceiptTicket(doc(), { width: '80' })
    const soloLegal = buildDocumentReceiptTicket(
      doc({
        customer: {
          name: '',
          legalName: 'Distribuciones SAS',
        } as ElectronicDocumentResponse['customer'],
      }),
      { width: '80' },
    )

    expect(datos(conNombre).find((m) => m.label === 'Cliente')?.value).toBe('Ana Pérez')
    expect(datos(soloLegal).find((m) => m.label === 'Cliente')?.value).toBe('Distribuciones SAS')
  })

  it('imprime el documento del cliente con su dígito de verificación', () => {
    // En una factura de venta el documento del adquiriente es obligatorio ante
    // la DIAN; el recibo tiene que reflejar el mismo que se transmitió.
    const ticket = buildDocumentReceiptTicket(
      doc({
        customer: {
          name: 'Distribuciones SAS',
          documentId: '900123456',
          verificationDigit: '7',
        } as ElectronicDocumentResponse['customer'],
      }),
      { width: '80' },
    )

    expect(datos(ticket).find((m) => m.label === 'Documento')?.value).toBe('900123456-7')
  })

  it('omite el guion cuando el documento no lleva dígito de verificación', () => {
    // Una cédula no tiene DV; imprimir "12345678-" ensucia el comprobante.
    const ticket = buildDocumentReceiptTicket(
      doc({
        customer: {
          name: 'Ana Pérez',
          documentId: '12345678',
          verificationDigit: null,
        } as unknown as ElectronicDocumentResponse['customer'],
      }),
      { width: '80' },
    )

    expect(datos(ticket).find((m) => m.label === 'Documento')?.value).toBe('12345678')
  })

  it('un consumidor final anónimo no imprime línea de cliente', () => {
    const ticket = buildDocumentReceiptTicket(
      doc({ customer: null as unknown as ElectronicDocumentResponse['customer'] }),
      { width: '80' },
    )

    expect(datos(ticket).find((m) => m.label === 'Cliente')).toBeUndefined()
    expect(datos(ticket).find((m) => m.label === 'Documento')).toBeUndefined()
  })

  it('imprime siempre la fecha, con la hora recortada a minutos', () => {
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80' })

    expect(elemento(datos(ticket), 0)).toEqual({ label: 'Fecha', value: '2026-08-08 14:35' })
  })
})

describe('medio y forma de pago', () => {
  it('limpia el código DIAN de la etiqueta del medio de pago', () => {
    // Las etiquetas llegan como "Efectivo (10)"; el código no le dice nada al
    // cliente y ocupa espacio en un ticket de 58 mm.
    const ticket = buildDocumentReceiptTicket(doc(), { width: '80' })

    expect(ticket.payPill).not.toMatch(/\(\d+\)/)
    expect(ticket.payPill).toContain('·')
  })

  it('sin pagos registrados no rompe: muestra una etiqueta genérica', () => {
    const ticket = buildDocumentReceiptTicket(doc({ payments: [] }), { width: '80' })

    expect(exigir(ticket.payPill, 'la pastilla de pago').startsWith('Pago')).toBe(true)
  })

  it('ante un medio o una forma de pago que no conoce, imprime el valor crudo', () => {
    // Si el backend añade un medio de pago DIAN, el recibo debe mostrar algo —
    // el código del enum— en lugar de "undefined" sobre un comprobante impreso.
    const ticket = buildDocumentReceiptTicket(
      doc({
        payments: [
          { paymentMeans: 'CRIPTO' } as unknown as ElectronicDocumentResponse['payments'][number],
        ],
        paymentForm: 'PERMUTA' as unknown as ElectronicDocumentResponse['paymentForm'],
      }),
      { width: '80' },
    )

    expect(ticket.payPill).toBe('CRIPTO · PERMUTA')
  })
})

describe('fecha', () => {
  it('sin hora de emisión imprime solo la fecha, sin espacio colgando', () => {
    const ticket = buildDocumentReceiptTicket(doc({ issueTime: null as unknown as string }), {
      width: '80',
    })

    expect(elemento(datos(ticket), 0)).toEqual({ label: 'Fecha', value: '2026-08-08' })
  })
})
