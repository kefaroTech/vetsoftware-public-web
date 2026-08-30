import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TrialLinesTable from '@/features/contratacion/components/TrialLinesTable.vue'
import { lineasDePrueba } from '@/features/contratacion/api/contratacion.source'
import { PLANS_CONTENT } from '@/features/landing/content/plans.content'
import type { LineaPrueba } from '@/features/contratacion/types/contratacion.types'

/**
 * LO QUE LA TABLA DE PRUEBAS PROMETE, Y LO QUE NO PUEDE PROMETER.
 *
 * ── Por qué hace falta a nivel de componente ───────────────────────────────
 * `lineasDePrueba` ya está cubierta como función pura: sabe que
 * `ELECTRONIC_INVOICING` llega con `trialDays: null`. Lo que no comprobaba nadie
 * es que la TABLA haga algo distinto con ese `null`. Y ahí está el defecto real:
 * `trialEndDate` de un módulo sin prueba es el propio día de alta, así que una
 * plantilla que pinte la fecha sin mirar `trialDays` rotula «gratis hasta el 29
 * de agosto» sobre algo que se cobra desde el primer día. La función devolvía el
 * dato correcto y la pantalla seguía mintiendo.
 *
 * <p>Se monta el componente en vez de leer la plantilla porque la afirmación es
 * sobre lo que el cliente LEE, y esta pantalla es donde decide una compra.
 */

const CORE: LineaPrueba = {
  code: 'CORE',
  name: 'Núcleo: clientes y mascotas',
  trialEndDate: '2026-09-28',
  trialDays: 30,
  precioDespues: null,
}

const CAJA: LineaPrueba = {
  code: 'CASH_REGISTER',
  name: 'Caja y punto de venta',
  trialEndDate: '2026-09-12',
  trialDays: 14,
  precioDespues: null,
}

const DIAN: LineaPrueba = {
  code: 'ELECTRONIC_INVOICING',
  name: 'Facturación electrónica DIAN',
  // La fecha de alta, que es lo que devuelve el adaptador cuando no hay prueba.
  trialEndDate: '2026-08-29',
  trialDays: null,
  precioDespues: null,
}

const montar = (lineas: LineaPrueba[]) => mount(TrialLinesTable, { props: { lineas } })

/** El texto de la fila de un módulo, buscado por su nombre y no por su posición. */
function fila(wrapper: ReturnType<typeof montar>, nombre: string): string {
  const tr = wrapper.findAll('tbody tr').find((r) => r.text().includes(nombre))
  if (!tr) throw new Error(`No hay fila para «${nombre}»`)
  return tr.text()
}

describe('un módulo NEVER_FREE no lleva fecha', () => {
  it('rotula «Sin prueba» y no la fecha de alta', () => {
    // La regresión con nombre propio: «Facturación electrónica DIAN — gratis
    // hasta el 29 de agosto de 2026» sobre un módulo que se cobra desde el
    // primer día. Es una prueba de un día que nadie concedió.
    const texto = fila(montar([CORE, CAJA, DIAN]), 'Facturación electrónica DIAN')

    expect(texto).toContain('Sin prueba')
    expect(texto, 'la fecha de alta NO puede aparecer en esa fila').not.toContain('29 de agosto')
  })

  it('cero días también es «sin prueba», no una prueba que acaba hoy', () => {
    // `trialDays: 0` y `trialDays: null` se leen igual en pantalla, y tienen que
    // hacerlo: los dos significan que se cobra desde el primer día.
    const texto = fila(montar([CORE, { ...DIAN, trialDays: 0 }]), 'Facturación electrónica DIAN')

    expect(texto).toContain('Sin prueba')
  })

  it('se saca de la frase de arriba, que habla de pruebas', () => {
    // Mezclarlo con los que sí tienen prueba invita a leerlo como un plazo más
    // corto en vez de como la ausencia de plazo.
    const wrapper = montar([CORE, CAJA, DIAN])
    const cabecera = wrapper.findAll('.trial-lead').map((p) => p.text())

    const frasePruebas = cabecera.find((t) => t.includes('termina antes'))
    expect(frasePruebas, 'la frase de las pruebas escalonadas').toBeDefined()
    expect(frasePruebas).not.toContain('Facturación electrónica DIAN')

    // Y su propia frase, en singular porque es uno solo.
    const fraseSinPrueba = cabecera.find((t) => t.includes('no tiene'))
    expect(fraseSinPrueba).toContain('Facturación electrónica DIAN')
    expect(fraseSinPrueba).toContain('se cobra desde el primer día')
  })

  it('con varios sin prueba la frase concuerda en plural', () => {
    const wrapper = montar([CORE, DIAN, { ...DIAN, code: 'OTRO', name: 'Otro módulo' }])
    const frase = wrapper.findAll('.trial-lead').find((p) => p.text().includes('no tienen'))

    expect(frase, 'plural cuando hay más de uno').toBeDefined()
    expect(frase!.text()).toContain('se cobran desde el primer día')
  })
})

describe('lo que sí tiene prueba se rotula con su fecha', () => {
  it('la fecha del último día, en formato largo y sin el ISO crudo', () => {
    const texto = fila(montar([CORE, CAJA]), 'Caja y punto de venta')

    expect(texto).toContain('12 de septiembre')
    expect(texto, 'nunca el ISO crudo en pantalla').not.toContain('2026-09-12')
  })

  it('la columna «Después» dice que se cobra, sin inventar un precio por módulo', () => {
    // No hay precio POR MÓDULO en ninguna fuente. «Incluido en tu plan» se leía
    // como «gratis para siempre», que es lo contrario de lo que dice la columna.
    const texto = fila(montar([CORE]), 'Núcleo')

    expect(texto).toContain('Se cobra dentro del total del plan')
    expect(texto).not.toContain('Incluido en tu plan')
  })
})

describe('el plan real, tal como llega del adaptador', () => {
  it('PACK_FULL pinta una sola fila «Sin prueba», y es la de la DIAN', () => {
    // Extremo a extremo con el contenido de verdad: si mañana el catálogo marca
    // otro artículo como NEVER_FREE, este caso lo cuenta en vez de dejarlo pasar.
    const full = PLANS_CONTENT.plans.find((p) => p.code === 'PACK_FULL')!
    const wrapper = montar(lineasDePrueba(full, '2026-08-29'))

    const sinPrueba = wrapper
      .findAll('tbody tr')
      .filter((r) => r.text().includes('Sin prueba'))
      .map((r) => r.text())

    expect(sinPrueba).toHaveLength(1)
    expect(sinPrueba[0]).toContain('Facturación electrónica DIAN')
    // Y todas las demás filas llevan fecha: una tabla entera de «Sin prueba»
    // pasaría el caso de arriba si alguien invirtiera la condición.
    expect(wrapper.findAll('tbody tr').length).toBe(full.includes.length)
  })

  it('sin líneas no pinta nada: un encabezado vacío promete una tabla que no hay', () => {
    expect(montar([]).find('table').exists()).toBe(false)
  })
})
