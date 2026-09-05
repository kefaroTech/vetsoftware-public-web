import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TrialLinesTable from '@/features/contratacion/components/TrialLinesTable.vue'
import type { LineaPrueba } from '@/features/contratacion/types/contratacion.types'
import PasosEmbudo from '@/features/landing/components/PasosEmbudo.vue'
import PlanesCombinaciones from '@/features/landing/components/PlanesCombinaciones.vue'
import PlanesResumenAside from '@/features/landing/components/PlanesResumenAside.vue'
import { paqueteQueCoincide } from '@/features/landing/composables/cotizadorLineas'
import { PLANS_CONTENT } from '@/features/landing/content/plans.content'
import type { CotizacionPreview, LineaCotizacion } from '@/features/landing/types/cotizacion.types'
import { catalogoEmbudo } from '../helpers/catalogo-embudo'
import { exigir } from '../helpers/exigir'

/**
 * LO QUE `/planes` AFIRMA SOBRE EL DINERO Y SOBRE EL TIEMPO.
 *
 * ── Por qué a nivel de componente ──────────────────────────────────────────
 * Las tres afirmaciones que aquí se fijan son las que un cliente lee justo
 * antes de decidir una compra, y ninguna de las tres es comprobable desde una
 * función pura: viven en la plantilla.
 *
 *  1. El desglose enseña **una línea por módulo**. Un resumen que colapse la
 *     selección en un único importe deja al cliente sin poder verificar por qué
 *     paga lo que paga, que es justo lo que esta pantalla promete.
 *  2. `trialDays === null` **nunca** se rotula «0 días». Cero días y «sin
 *     prueba» son la misma realidad de cobro, pero «0 días» se lee como un
 *     plazo que se agotó y no como una política.
 *  3. La combinación marcada es la que reproduce EXACTAMENTE la selección. Un
 *     radio marcado sobre una selección que ya no coincide afirmaría un
 *     descuento que el servidor no va a aplicar.
 */

const CATALOGO = catalogoEmbudo()

function lineaCotizada(over: Partial<LineaCotizacion> = {}): LineaCotizacion {
  return {
    code: 'SCHEDULING',
    nombre: 'Agenda de citas',
    contratadas: 1,
    incluidas: 0,
    cobradas: 1,
    importeUnitario: 35_000,
    importe: 35_000,
    taxRate: 19,
    taxTreatment: 'TAXED',
    impuesto: 6650,
    total: 41_650,
    ...over,
  }
}

const COTIZACION: CotizacionPreview = {
  moneda: 'COP',
  ciclo: 'MENSUAL',
  lineas: [
    lineaCotizada({ code: 'CORE', nombre: 'Núcleo: clientes y mascotas', importe: 59_000 }),
    lineaCotizada(),
    lineaCotizada({
      code: 'CLINICAL_HISTORY',
      nombre: 'Historia clínica y consultas',
      importe: 39_000,
    }),
    lineaCotizada({
      code: 'EXTRA_USER',
      nombre: 'Usuario adicional',
      cobradas: 2,
      importe: 24_000,
    }),
  ],
  subtotal: 157_000,
  descuento: 0,
  impuesto: 29_830,
  total: 186_830,
}

type ResumenProps = InstanceType<typeof PlanesResumenAside>['$props']

const RESUMEN_PROPS: ResumenProps = {
  catalogo: CATALOGO,
  modulos: ['SCHEDULING', 'CLINICAL_HISTORY'],
  ciclo: 'MENSUAL',
  estado: 'LISTO',
  importe: '$ 157.000',
  cotizacion: COTIZACION,
  primerCobro: '2026-09-17',
  mensajeDeFallo: null,
  regionViva: '',
  puedeContinuar: true,
  cta: 'Crear mi cuenta',
}

const montarResumen = (over: Partial<ResumenProps> = {}) =>
  mount(PlanesResumenAside, {
    props: { ...RESUMEN_PROPS, ...over },
    global: { stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } } },
  })

describe('el desglose del resumen enseña qué se paga por cada cosa', () => {
  it('una fila por línea cotizada, y ninguna se colapsa', () => {
    const filas = montarResumen().findAll('.pra-linea')

    expect(filas).toHaveLength(COTIZACION.lineas.length)
    expect(filas.map((f) => f.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('Agenda')]),
    )
  })

  it('los módulos van con su rótulo CORTO y el núcleo con su nombre entero', () => {
    // Divergencia deliberada respecto del selector y de la tabla de pruebas,
    // que usan el nombre completo: en la columna del resumen no cabe.
    const texto = montarResumen()
      .findAll('.pra-linea')
      .map((f) => f.text())

    expect(texto[0]).toContain('Núcleo: clientes y mascotas')
    expect(texto[1]).toContain('Agenda')
    expect(texto[1], 'el rótulo corto, no el nombre completo').not.toContain('Agenda de citas')
    expect(texto[2]).toContain('Historia clínica')
  })

  it('una línea de varias unidades dice cuántas, y no un importe suelto sin cantidad', () => {
    const texto = montarResumen()
      .findAll('.pra-linea')
      .map((f) => f.text())

    expect(exigir(texto[3], 'la línea de personas adicionales')).toContain('2 ×')
  })

  it('«Hoy pagas» va aparte del desglose y es la última fila', () => {
    // Es un cero REAL —la prueba corre— y por eso aquí sí se escribe la cifra:
    // el guion es el marcador de «sin dato», no de «no cuesta nada hoy».
    const hoy = montarResumen().get('.pra-hoy').text()

    expect(hoy).toContain('Hoy pagas')
    expect(hoy).toMatch(/0/)
  })

  it('sin cotización todavía no hay desglose que enseñar', () => {
    // Pintar las filas con la cotización anterior mientras se recalcula sería
    // responder a una pregunta que ya no se hizo.
    const wrapper = montarResumen({ cotizacion: null, estado: 'CALCULANDO' })

    expect(wrapper.findAll('.pra-linea')).toHaveLength(0)
  })

  it('mientras el catálogo no llega, el botón dice por qué no se puede seguir', () => {
    // `aria-disabled` y no `disabled`: el botón sigue enfocable y el motivo es
    // visible, no sólo para el lector.
    //
    // Lo que ya NO bloquea es que la selección no reproduzca un paquete: eso se
    // contrata (issue #290). Lo que sigue bloqueando es no tener catálogo, porque
    // sin él no hay ni códigos de módulo que llevarse al paso siguiente.
    const wrapper = montarResumen({ puedeContinuar: false })
    const boton = wrapper.get('.pra-continuar')

    expect(boton.attributes('aria-disabled')).toBe('true')
    const motivo = wrapper.get('.pra-motivo')
    expect(boton.attributes('aria-describedby')).toBe(motivo.attributes('id'))
    expect(motivo.text()).toContain('catálogo')
    expect(wrapper.emitted('continuar')).toBeUndefined()
  })
})

describe('un módulo sin prueba no se rotula con un plazo', () => {
  const CORE: LineaPrueba = {
    code: 'CORE',
    name: 'Núcleo: clientes y mascotas',
    trialEndDate: '2026-10-02',
    trialDays: 30,
    precioDespues: null,
  }

  const DIAN: LineaPrueba = {
    code: 'ELECTRONIC_INVOICING',
    name: 'Facturación electrónica DIAN',
    // La fecha de alta, que es lo que devuelve el adaptador cuando no hay prueba.
    trialEndDate: '2026-09-02',
    trialDays: null,
    precioDespues: null,
  }

  function fila(lineas: LineaPrueba[], nombre: string): string {
    const wrapper = mount(TrialLinesTable, { props: { lineas } })
    const tr = wrapper.findAll('tbody tr').find((r) => r.text().includes(nombre))
    return exigir(tr, `la fila de «${nombre}»`).text()
  }

  it('dice «Sin prueba · se cobra desde el primer día», con la consecuencia dentro', () => {
    // «Sin prueba» a secas deja sin decir lo único accionable: que ese módulo se
    // cobra desde hoy. Es la política NEVER_FREE del catálogo.
    const texto = fila([CORE, DIAN], 'Facturación electrónica DIAN')

    expect(texto).toContain('Sin prueba · se cobra desde el primer día')
  })

  it('nunca «0 días», y nunca la fecha de alta disfrazada de plazo', () => {
    const texto = fila([CORE, { ...DIAN, trialDays: 0 }], 'Facturación electrónica DIAN')

    expect(texto).not.toContain('0 días')
    expect(texto, 'la fecha de alta NO puede aparecer en esa fila').not.toContain('2 de septiembre')
  })

  it('lo que sí tiene prueba conserva su fecha', () => {
    // El control que hace falsable lo de arriba: una tabla entera de «Sin
    // prueba» pasaría los dos casos anteriores.
    expect(fila([CORE, DIAN], 'Núcleo')).toContain('2 de octubre')
  })
})

describe('la combinación marcada es la que la selección reproduce', () => {
  const montarCombinaciones = (modulos: string[]) =>
    mount(PlanesCombinaciones, {
      props: {
        plans: PLANS_CONTENT.plans,
        catalogo: CATALOGO,
        ciclo: 'MENSUAL' as const,
        paqueteActual: paqueteQueCoincide(modulos, CATALOGO),
      },
    })

  /** Los códigos de las opciones marcadas, leídos del DOM y no del estado. */
  function marcadas(wrapper: ReturnType<typeof montarCombinaciones>): string[] {
    return wrapper
      .findAll('input[type="radio"]')
      .filter((i) => (i.element as HTMLInputElement).checked)
      .map((i) => i.attributes('value') ?? '')
  }

  it('con la selección exacta, esa y sólo esa queda marcada', () => {
    // `PACK_CLINIC` son CORE + estos dos; el núcleo no es una casilla y por eso
    // no entra en la comparación.
    expect(marcadas(montarCombinaciones(['SCHEDULING', 'CLINICAL_HISTORY']))).toEqual([
      'PACK_CLINIC',
    ])
  })

  it('al quitar una casilla ninguna queda marcada: el descuento se acaba de perder', () => {
    // Dejarla marcada afirmaría un precio de paquete que el servidor ya no va a
    // aplicar, que es el defecto que el modelo híbrido puede producir.
    expect(marcadas(montarCombinaciones(['SCHEDULING']))).toEqual([])
  })

  it('añadir un módulo de más tampoco cuenta como coincidencia', () => {
    expect(
      marcadas(montarCombinaciones(['SCHEDULING', 'CLINICAL_HISTORY', 'CASH_REGISTER'])),
    ).toEqual([])
  })

  it('son radios nativos, no botones que los imitan', () => {
    // Un `<button aria-pressed>` se anuncia como acción con efecto inmediato y
    // no se enumera en el modo de formularios del lector.
    const wrapper = montarCombinaciones(['SCHEDULING', 'CLINICAL_HISTORY'])

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(PLANS_CONTENT.plans.length)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe('el indicador de pasos del embudo', () => {
  it('tiene CUATRO pasos: la verificación de correo es uno propio', () => {
    expect(mount(PasosEmbudo, { props: { actual: 1 } }).findAll('li')).toHaveLength(4)
  })

  it('sólo el paso activo lleva `aria-current`, y su estado va también en texto', () => {
    const wrapper = mount(PasosEmbudo, { props: { actual: 2 } })
    const pasos = wrapper.findAll('li')

    expect(pasos.filter((p) => p.attributes('aria-current') === 'step')).toHaveLength(1)
    expect(exigir(pasos[1], 'el paso activo').text()).toContain('paso actual')
    // Y el anterior queda hecho, con el visto en lugar del número.
    expect(exigir(pasos[0], 'el primer paso').text()).toContain('completado')
  })
})
