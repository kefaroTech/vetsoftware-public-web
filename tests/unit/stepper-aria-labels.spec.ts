import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountCartPanel from '@/features/cuentas/components/AccountCartPanel.vue'
import BillingChargeColumns from '@/features/cuentas/components/BillingChargeColumns.vue'
import PosTicket from '@/features/tienda/components/PosTicket.vue'
import type { CartLine } from '@/features/cuentas/composables/useOpenAccountCart'
import type { BillingCartLine } from '@/features/cuentas/composables/useConsultaBilling'
import type { SaleLine } from '@/features/tienda/types/tienda'

/**
 * Los steppers de cantidad son tres botones idénticos por fila: `−`, la
 * cantidad, `+`. Sin etiqueta accesible, un lector de pantalla anuncia
 * «botón, botón, botón» tantas veces como líneas tenga el carrito, y no hay
 * forma de saber a qué producto pertenece cada uno.
 *
 * **La aserción tiene que atar la etiqueta al comportamiento.** Comprobar que
 * el `aria-label` existe, o que su texto es el esperado, deja pasar el error
 * que de verdad ocurre: copiar la fila entera para el segundo producto y
 * dejarse el nombre del primero, o pegar la etiqueta de «quitar» en el botón
 * de «añadir». Por eso aquí se busca el control POR SU ETIQUETA, se pulsa, y
 * se comprueba que lo que emite es la operación anunciada sobre ESA línea.
 *
 * Con dos líneas en el carrito, una etiqueta copiada al botón equivocado
 * emite el `Meloxicam` cuando el test pidió el `Amoxicilina`, y falla.
 */

const AMOXICILINA = 'Amoxicilina'
const MELOXICAM = 'Meloxicam'

/** Busca un control por su etiqueta accesible exacta. */
const porEtiqueta = (wrapper: ReturnType<typeof mount>, etiqueta: string) => {
  const el = wrapper.find(`[aria-label="${etiqueta}"]`)
  expect(el.exists(), `Ningún control lleva aria-label="${etiqueta}"`).toBe(true)
  return el
}

describe('AccountCartPanel — stepper de los cargos de una cuenta', () => {
  const linea = (over: Partial<CartLine> = {}): CartLine => ({
    uid: 1,
    kind: 'product',
    refId: 10,
    name: AMOXICILINA,
    unitPrice: 12_000,
    qty: 3,
    animalId: 7,
    animalName: 'Luna',
    ...over,
  })

  const amoxi = linea()
  const melox = linea({ uid: 2, refId: 11, name: MELOXICAM, qty: 5 })

  const montar = () =>
    mount(AccountCartPanel, {
      props: { lines: [amoxi, melox], lineLabel: (l: CartLine) => l.animalName ?? 'General' },
    })

  it('«Quitar una unidad de Amoxicilina» baja la cantidad DE ESA línea', async () => {
    const wrapper = montar()

    await porEtiqueta(wrapper, `Quitar una unidad de ${AMOXICILINA}`).trigger('click')

    expect(wrapper.emitted('setQty')).toEqual([[amoxi, 2]])
  })

  it('«Quitar una unidad de Meloxicam» toca la otra línea, no la primera', async () => {
    // Éste es el aserto que caza la etiqueta copiada: si las dos filas
    // anunciaran «Amoxicilina», este `find` traería el botón de la primera y
    // saldría `[amoxi, 2]` en vez de `[melox, 4]`.
    const wrapper = montar()

    await porEtiqueta(wrapper, `Quitar una unidad de ${MELOXICAM}`).trigger('click')

    expect(wrapper.emitted('setQty')).toEqual([[melox, 4]])
  })

  it('«Añadir una unidad de Amoxicilina» sube, no baja', async () => {
    // Y éste caza el par intercambiado: `−` con la etiqueta de `+`.
    const wrapper = montar()

    await porEtiqueta(wrapper, `Añadir una unidad de ${AMOXICILINA}`).trigger('click')

    expect(wrapper.emitted('setQty')).toEqual([[amoxi, 4]])
  })

  it('el campo de cantidad se anuncia con el nombre de su producto', async () => {
    const wrapper = montar()

    await porEtiqueta(wrapper, `Cantidad de ${MELOXICAM}`).setValue('9')

    expect(wrapper.emitted('setQty')).toEqual([[melox, 9]])
  })
})

describe('BillingChargeColumns — stepper del modal de facturación', () => {
  const amoxi: BillingCartLine = {
    kind: 'product',
    id: 10,
    name: AMOXICILINA,
    unitPrice: 12_000,
    qty: 3,
  }
  const melox: BillingCartLine = {
    kind: 'service',
    id: 11,
    name: MELOXICAM,
    unitPrice: 8_000,
    qty: 5,
  }

  const montar = () =>
    mount(BillingChargeColumns, {
      props: {
        tab: 'product',
        query: '',
        catalog: [
          { id: 10, name: AMOXICILINA, price: 12_000, soldOut: false, category: 'Antibióticos' },
        ],
        items: [amoxi, melox],
        existingCharges: [],
        showExisting: false,
        heading: 'Cargos nuevos',
        busy: false,
      },
    })

  it('«Quitar una unidad de Meloxicam» baja la cantidad de esa línea', async () => {
    const wrapper = montar()

    await porEtiqueta(wrapper, `Quitar una unidad de ${MELOXICAM}`).trigger('click')

    expect(wrapper.emitted('setQty')).toEqual([[melox, 4]])
  })

  it('«Añadir una unidad de Amoxicilina» sube la de la suya', async () => {
    const wrapper = montar()

    await porEtiqueta(wrapper, `Añadir una unidad de ${AMOXICILINA}`).trigger('click')

    expect(wrapper.emitted('setQty')).toEqual([[amoxi, 4]])
  })

  it('el botón del catálogo dice a qué ítem agrega, y agrega ese', async () => {
    // El `+` del catálogo y el `+` del stepper son el mismo glifo en la misma
    // pantalla: sin etiqueta son indistinguibles al oído.
    const wrapper = montar()

    await porEtiqueta(wrapper, `Agregar ${AMOXICILINA} a los cargos`).trigger('click')

    expect(wrapper.emitted('add')?.[0]?.[0]).toMatchObject({ id: 10, name: AMOXICILINA })
    expect(wrapper.emitted('setQty')).toBeUndefined()
  })
})

describe('PosTicket — stepper del ticket de venta', () => {
  const linea = (over: Partial<SaleLine> = {}): SaleLine => ({
    kind: 'product',
    id: 10,
    name: AMOXICILINA,
    unitPrice: 12_000,
    qty: 3,
    taxTreatment: 'GRAVADO',
    taxPercentage: 19,
    ...over,
  })

  const amoxi = linea()
  const melox = linea({ id: 11, name: MELOXICAM, qty: 5 })

  const montar = () =>
    mount(PosTicket, {
      props: {
        lines: [amoxi, melox],
        customer: null,
        grossSubtotal: 76_000,
        promoSavings: 0,
        baseTotal: 63_866,
        taxRows: [{ name: 'IVA 19 %', amount: 12_134 }],
        total: 76_000,
        chargeDisabled: false,
      },
    })

  it('«Quitar una unidad de Amoxicilina» emite dec con ESA línea', async () => {
    const wrapper = montar()

    await porEtiqueta(wrapper, `Quitar una unidad de ${AMOXICILINA}`).trigger('click')

    expect(wrapper.emitted('dec')).toEqual([[amoxi]])
    expect(wrapper.emitted('inc')).toBeUndefined()
  })

  it('«Añadir una unidad de Meloxicam» emite inc con la otra', async () => {
    const wrapper = montar()

    await porEtiqueta(wrapper, `Añadir una unidad de ${MELOXICAM}`).trigger('click')

    expect(wrapper.emitted('inc')).toEqual([[melox]])
    expect(wrapper.emitted('dec')).toBeUndefined()
  })
})
