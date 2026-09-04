import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ContratarResumenTabla from '@/features/contratacion/components/ContratarResumenTabla.vue'
import type {
  ResumenPlan,
  ResumenPropuesta,
} from '@/features/contratacion/types/contratacion.types'
import { elemento } from '../helpers/exigir'

/**
 * LO QUE LA TABLA DEL PASO VINCULANTE PUEDE AFIRMAR.
 *
 * ── El hueco que cierra ─────────────────────────────────────────────────────
 * La tabla pintaba «Sedes 3 / Personas 8» en las DOS ramas, y en la de la
 * propuesta esas dos cifras no correspondían a nada de la oferta: los números
 * salían del control de `PropuestaCapacidades`, que no sale a la red, mientras
 * `lineasDePropuesta` mandaba las líneas del servidor con SUS cantidades. Un
 * prospecto que escribía 8 personas veía «Personas 8» bajo el rótulo «Lo que vas
 * a contratar» y firmaba una oferta de `EXTRA_USER × 3`, con un enlace
 * «Cambiar el número de personas» que no cambiaba nada cobrable.
 *
 * <p>Hoy `ResumenPropuesta` ya no declara esos campos, así que reponer las filas
 * no compila; esto afirma además lo que se ve, que es lo que el compilador no
 * mira: que la capacidad cotizada sigue estando —como línea del servidor, con su
 * cantidad— y que en la rama del plan las dos filas se quedan, porque ahí sí son
 * lo que viaja en la oferta.
 */

vi.mock('vue-router', () => ({
  // `ContratarResumenTabla` importa `RouterLink` del módulo, no del registro
  // global: sin este doble el componente no resuelve y la tabla no pinta.
  RouterLink: { props: ['to'], template: '<a :href="JSON.stringify(to)"><slot /></a>' },
}))

const COMUN: Omit<
  ResumenPlan,
  'origen' | 'titulo' | 'planCode' | 'sedes' | 'usuarios' | 'modulos'
> = {
  empresaNombre: 'Clínica de prueba',
  empresaIdentificador: '900123456-7',
  ciclo: 'MENSUAL',
  subtotal: 100_000,
  impuesto: 19_000,
  tasaImpuesto: 19,
  total: 119_000,
  subtotalMensualEquivalente: 100_000,
  sinPrecio: [],
  lineas: [],
  lineasPrueba: [],
  estadoPlanActual: 'SIN_PLAN',
}

const PLAN: ResumenPlan = {
  ...COMUN,
  origen: 'PLAN',
  titulo: 'Pack Clínica',
  planCode: 'PACK_CLINIC',
  modulos: [],
  sedes: 3,
  usuarios: 8,
}

const PROPUESTA: ResumenPropuesta = {
  ...COMUN,
  origen: 'PROPUESTA',
  titulo: 'Tu propuesta a medida',
  propuestaId: 'p-1',
  version: 2,
  lineas: [
    {
      code: 'CORE',
      nombre: 'Núcleo: clientes y mascotas',
      tipo: 'MODULE',
      cantidad: 1,
      importe: 0,
    },
    {
      code: 'EXTRA_USER',
      nombre: 'Usuario adicional',
      tipo: 'CAPACITY',
      cantidad: 3,
      importe: 12_000,
    },
  ],
}

/** Los rótulos de la primera tabla, que es la de «Lo que vas a contratar». */
function rotulos(resumen: ResumenPlan | ResumenPropuesta): string[] {
  const wrapper = mount(ContratarResumenTabla, { props: { resumen } })
  return elemento(wrapper.findAll('table'), 0, 'las tablas del resumen')
    .findAll('th[scope="row"]')
    .map((th) => th.text())
}

describe('ContratarResumenTabla · qué se afirma como contratado', () => {
  it('la propuesta NO lista sedes ni personas: no hay línea de oferta que las respalde', () => {
    const filas = rotulos(PROPUESTA)

    expect(filas).not.toContain('Sedes')
    expect(filas).not.toContain('Personas')
  })

  it('pero la capacidad que sí se cotiza sigue estando, con su cantidad', () => {
    const texto = mount(ContratarResumenTabla, { props: { resumen: PROPUESTA } }).text()

    // Es la cifra que viaja como `quantity` en la oferta: si desapareciera, el
    // paso vinculante no diría cuántas plazas se están comprando.
    expect(texto).toContain('Usuario adicional (capacidad)')
    expect(texto).toContain('3 ×')
  })

  it('ningún «Cambiar» de la propuesta lleva sedes ni personas en la vuelta', () => {
    const wrapper = mount(ContratarResumenTabla, { props: { resumen: PROPUESTA } })

    for (const enlace of wrapper.findAll('a')) {
      const destino = enlace.attributes('href') ?? ''
      expect(destino).not.toContain('sedes')
      expect(destino).not.toContain('usuarios')
    }
  })

  it('en la rama del plan las dos filas se quedan: ahí sí son lo que se contrata', () => {
    const filas = rotulos(PLAN)

    expect(filas).toEqual(['Plan', 'Ciclo de pago', 'Sedes', 'Personas'])
    // El nombre accesible del enlace viaja partido —«Cambiar» visible + el resto
    // en `.ds-sr-only`—, así que se afirma la mitad que distingue a los cuatro.
    expect(mount(ContratarResumenTabla, { props: { resumen: PLAN } }).text()).toContain(
      'el número de personas',
    )
  })
})

/** Los rótulos de la segunda tabla, que es la de los importes. */
function rotulosImportes(resumen: ResumenPlan | ResumenPropuesta): string[] {
  const wrapper = mount(ContratarResumenTabla, { props: { resumen } })
  return elemento(wrapper.findAll('table'), 1, 'las tablas del resumen')
    .findAll('th[scope="row"]')
    .map((th) => th.text().replace(/\s+/g, ' ').trim())
}

describe('ContratarResumenTabla · el desglose con IVA incluido', () => {
  it('las tres filas siguen ahí: colapsarlas borraría la base gravable de la pantalla', () => {
    expect(rotulosImportes(PLAN)).toEqual([
      'Subtotal',
      'IVA incluido (19 %)',
      'Total al mes, cuando termine la prueba',
      'Lo que se te cobra hoy',
    ])
  })

  it('sin tasa publicada se escribe «IVA» a secas, nunca un porcentaje deducido', () => {
    const rotulos = rotulosImportes({ ...PROPUESTA, tasaImpuesto: null })

    expect(rotulos).toContain('IVA')
    expect(
      rotulos.join(' '),
      'un 19 % deducido es equivocarse por un factor de cien',
    ).not.toContain('%')
  })

  it('en el ciclo anual el total se rotula «al año», y conserva la coletilla de la prueba', () => {
    expect(rotulosImportes({ ...PLAN, ciclo: 'ANUAL' })).toContain(
      'Total al año, cuando termine la prueba',
    )
  })
})
