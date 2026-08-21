import { describe, it, expect } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import PosTicket from '@/features/tienda/components/PosTicket.vue'
import AccountCartPanel from '@/features/cuentas/components/AccountCartPanel.vue'
import BillingChargeColumns from '@/features/cuentas/components/BillingChargeColumns.vue'
import LabResultsModal from '@/features/laboratorio/modals/LabResultsModal.vue'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import { adjuntarArchivos, fakeFile } from '../helpers/pick-files'

/**
 * GUARDA DE A11Y — el nombre accesible de un botón de fila lleva su SUJETO.
 *
 * Las cuatro listas editables del producto (ticket del POS, carrito de apertura
 * de cuenta, cargos nuevos de facturación y adjuntos de laboratorio) repetían
 * `aria-label="Quitar"` en todas sus filas. Un lector de pantalla recorriendo la
 * lista anunciaba «Quitar, botón» N veces seguidas, sin decir qué se quita: la
 * única forma de saberlo era abandonar el foco, leer la fila y volver. En la
 * práctica se borra a ciegas — y estas cuatro listas deciden lo que se cobra y lo
 * que se envía a validación.
 *
 * WCAG 2.2 §4.1.2 Name, Role, Value (A) exige que el control tenga un nombre;
 * §2.4.6 Headings and Labels (AA) exige que el nombre DESCRIBA su propósito. Un
 * nombre idéntico en N controles con N efectos distintos no lo describe.
 *
 * La aserción no es «existe `aria-label`» —el defecto también lo tenía— sino que
 * con DOS filas de nombre distinto los nombres accesibles salgan distintos, y que
 * ninguno se quede en el literal «Quitar». Esa es la propiedad; cualquier
 * redacción que la cumpla pasa.
 */

const FILA_A = 'Amoxicilina 500 mg'
const FILA_B = 'Baño medicado'

/**
 * Nombre accesible de cada `<button>` del árbol: `aria-label` si lo hay, y si no
 * su contenido de texto — que es el orden en el que lo resuelve el navegador
 * para los casos que aquí se dan (ninguno usa `aria-labelledby` ni `title`).
 */
function nombresDeBotones(wrapper: VueWrapper): string[] {
  return wrapper
    .findAll('button')
    .map((b) => (b.attributes('aria-label') ?? b.text()).replace(/\s+/g, ' ').trim())
}

/**
 * Las tres condiciones, juntas, sobre un componente ya montado con dos filas:
 * ningún nombre vacío, ninguno el literal «Quitar», y todos distintos entre sí.
 */
function afirmarNombresDistinguibles(wrapper: VueWrapper, componente: string) {
  const nombres = nombresDeBotones(wrapper)
  expect(nombres.length, `${componente} no renderizó botones`).toBeGreaterThan(0)

  for (const nombre of nombres) {
    expect(nombre, `${componente}: un botón sin nombre accesible`).not.toBe('')
    expect(
      nombre,
      `${componente}: «${nombre}» a secas se anuncia igual en todas las filas y no dice QUÉ se quita`,
    ).not.toBe('Quitar')
  }

  const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i)
  expect(
    repetidos,
    `${componente}: nombres accesibles repetidos entre filas — ${JSON.stringify(repetidos)}. ` +
      'Con dos filas de nombre distinto, sus controles deben anunciarse distinto.',
  ).toEqual([])

  // Y además: cada fila tiene al menos un control que la nombra.
  for (const fila of [FILA_A, FILA_B]) {
    expect(
      nombres.some((n) => n.includes(fila)),
      `${componente}: ningún botón menciona «${fila}»`,
    ).toBe(true)
  }
}

describe('PosTicket — líneas del ticket', () => {
  function montar() {
    return mount(PosTicket, {
      props: {
        lines: [
          {
            kind: 'product',
            id: 1,
            name: FILA_A,
            unitPrice: 12000,
            qty: 2,
            taxTreatment: 'TAXED',
            taxPercentage: 19,
          },
          {
            kind: 'service',
            id: 2,
            name: FILA_B,
            unitPrice: 45000,
            qty: 1,
            taxTreatment: 'TAXED',
            taxPercentage: 19,
          },
        ] as never,
        customer: null,
        grossSubtotal: 69000,
        promoSavings: 0,
        baseTotal: 57983,
        taxRows: [{ name: 'IVA 19%', amount: 11017 }],
        total: 69000,
        chargeDisabled: false,
      },
    })
  }

  it('los controles de cada línea se anuncian con el producto al que afectan', () => {
    afirmarNombresDistinguibles(montar(), 'PosTicket')
  })

  it('el botón de eliminar línea nombra la línea, no «Quitar» a secas', () => {
    const nombres = nombresDeBotones(montar())
    expect(nombres).toContain(`Quitar ${FILA_A} del ticket`)
    expect(nombres).toContain(`Quitar ${FILA_B} del ticket`)
  })
})

describe('AccountCartPanel — cargos a registrar', () => {
  function montar() {
    return mount(AccountCartPanel, {
      props: {
        lines: [
          {
            uid: 1,
            kind: 'service',
            refId: 10,
            name: FILA_A,
            unitPrice: 12000,
            qty: 1,
            animalId: 3,
            animalName: 'Nube',
          },
          {
            uid: 2,
            kind: 'product',
            refId: 11,
            name: FILA_B,
            unitPrice: 45000,
            qty: 2,
            animalId: 3,
            animalName: 'Nube',
          },
        ] as never,
        lineLabel: () => 'Nube',
      },
    })
  }

  it('los controles de cada cargo se anuncian con el cargo al que afectan', () => {
    afirmarNombresDistinguibles(montar(), 'AccountCartPanel')
  })

  it('el botón de eliminar cargo nombra el cargo', () => {
    const nombres = nombresDeBotones(montar())
    expect(nombres).toContain(`Quitar ${FILA_A} de los cargos a registrar`)
    expect(nombres).toContain(`Quitar ${FILA_B} de los cargos a registrar`)
  })
})

describe('BillingChargeColumns — cargos nuevos de facturación', () => {
  function montar() {
    return mount(BillingChargeColumns, {
      props: {
        tab: 'service',
        query: '',
        catalog: [
          { id: 10, name: 'Consulta general', price: 50000, soldOut: false, category: 'Clínica' },
          { id: 11, name: 'Ecografía', price: 90000, soldOut: false, category: 'Imágenes' },
        ],
        items: [
          { kind: 'service', id: 1, name: FILA_A, unitPrice: 12000, qty: 1 },
          { kind: 'product', id: 2, name: FILA_B, unitPrice: 45000, qty: 3 },
        ],
        existingCharges: [],
        showExisting: false,
        heading: 'Cargos nuevos',
        busy: false,
      },
    })
  }

  it('los controles de cada cargo se anuncian con el cargo al que afectan', () => {
    afirmarNombresDistinguibles(montar(), 'BillingChargeColumns')
  })

  it('el botón de eliminar cargo nombra el cargo', () => {
    const nombres = nombresDeBotones(montar())
    expect(nombres).toContain(`Quitar ${FILA_A} de los cargos nuevos`)
    expect(nombres).toContain(`Quitar ${FILA_B} de los cargos nuevos`)
  })
})

describe('LabResultsModal — adjuntos', () => {
  const TEST = {
    id: 77,
    date: '2026-08-20',
    testType: { id: 3, name: 'Hemograma completo' },
    animal: { id: 9, name: 'Nube' },
    consultation: null,
  } as unknown as LaboratoryTestResponse

  async function montar() {
    const wrapper = mount(LabResultsModal, {
      props: { open: true, test: TEST },
      // `ModalShell` teletransporta a `body`; sin este stub el contenido sale del wrapper.
      global: { stubs: { teleport: true } },
    })
    await flushPromises()
    await adjuntarArchivos(wrapper.find('input[type="file"]'), [
      fakeFile(`${FILA_A}.pdf`),
      fakeFile(`${FILA_B}.pdf`),
    ])
    await flushPromises()
    return wrapper
  }

  it('los botones de quitar adjunto se anuncian con el archivo al que afectan', async () => {
    afirmarNombresDistinguibles(await montar(), 'LabResultsModal')
  })

  it('el botón de quitar adjunto nombra el archivo', async () => {
    const nombres = nombresDeBotones(await montar())
    expect(nombres).toContain(`Quitar el adjunto ${FILA_A}.pdf`)
    expect(nombres).toContain(`Quitar el adjunto ${FILA_B}.pdf`)
  })
})
