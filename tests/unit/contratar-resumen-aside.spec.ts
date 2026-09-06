import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ContratarResumenAside from '@/features/contratacion/components/ContratarResumenAside.vue'
import { formatMoney } from '@/composables/money'
import type { LineaPrueba, ResumenPlan } from '@/features/contratacion/types/contratacion.types'

// El formateador de moneda separa el símbolo del importe con un espacio de ancho fijo (U+00A0),
// no el espacio normal que se escribe a mano: un literal escrito a mano pasaría en el editor y
// fallaría al ejecutar la prueba.
const CERO = formatMoney(0)
const TOTAL = formatMoney(224_910)

/**
 * «HOY PAGAS», CON WOMPI COBRANDO DE VERDAD.
 *
 * `SettleNewContractService` (backend) solo deja el contrato en `TRIALING` —y por tanto sin
 * cobro hoy— si TODAS las líneas contratadas tienen prueba. Con una sola línea `NEVER_FREE`
 * (`trialDays: null`, el ejemplo real del catálogo es `ELECTRONIC_INVOICING`) el contrato nace
 * `ACTIVE` y el primer periodo se cobra en el acto: «Hoy pagas $0» sería falso.
 */

function linea(over: Partial<LineaPrueba> = {}): LineaPrueba {
  return {
    code: 'CORE',
    name: 'Núcleo',
    trialEndDate: '2026-09-28',
    trialDays: 30,
    precioDespues: null,
    ...over,
  }
}

function resumen(lineasPrueba: LineaPrueba[], total: number | null = 224_910): ResumenPlan {
  return {
    origen: 'PLAN',
    empresaNombre: 'Clínica Norte',
    empresaIdentificador: '900123456',
    titulo: 'Pack Clínica',
    ciclo: 'MENSUAL',
    subtotal: 189_000,
    impuesto: 35_910,
    tasaImpuesto: 19,
    total,
    subtotalMensualEquivalente: 189_000,
    sinPrecio: [],
    lineasPrueba,
    estadoPlanActual: 'SIN_PLAN',
    planCode: 'PACK_CLINIC',
    modulos: [],
    lineas: [],
    sedes: 1,
    usuarios: 1,
  }
}

function montar(lineasPrueba: LineaPrueba[], primerCobro: string | null = '2026-09-29') {
  return mount(ContratarResumenAside, {
    props: { resumen: resumen(lineasPrueba), catalogo: null, primerCobro },
  })
}

describe('«Hoy pagas», según si TODO lo contratado tiene prueba', () => {
  it('con todas las líneas en prueba: sigue siendo $0, con el primer cobro anunciado', () => {
    const wrapper = montar([linea({ trialDays: 30 }), linea({ code: 'AGENDA', trialDays: 14 })])

    expect(wrapper.text()).toContain(`Hoy pagas ${CERO}.`)
    expect(wrapper.text()).toContain('El primer cobro sería el')
  })

  it('con UNA línea sin prueba (NEVER_FREE): cobra el total hoy, sin fecha de primer cobro', () => {
    const wrapper = montar([
      linea({ trialDays: 30 }),
      linea({
        code: 'ELECTRONIC_INVOICING',
        name: 'Facturación electrónica DIAN',
        trialDays: null,
      }),
    ])

    expect(wrapper.text()).toContain(`Hoy pagas ${TOTAL}.`)
    expect(wrapper.text()).not.toContain('El primer cobro sería el')
    // Y no queda ningún «$0» disfrazado: es EL total de la oferta, no un cero.
    expect(wrapper.text()).not.toContain(`Hoy pagas ${CERO}.`)
  })

  it('sin `total` (precio incompleto) y con una línea sin prueba: no inventa un cero', () => {
    const sinTotal = resumen([linea({ trialDays: null })], null)
    const wrapper = mount(ContratarResumenAside, {
      props: { resumen: sinTotal, catalogo: null, primerCobro: null },
    })

    expect(wrapper.text()).toContain('Hoy pagas —.')
  })
})
