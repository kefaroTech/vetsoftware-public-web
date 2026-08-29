import { describe, expect, it } from 'vitest'
import {
  calcularEstimado,
  importeEstimado,
  subtotalMensualEquivalente,
  textoSinPrecio,
} from '@/features/landing/composables/planPricing'
import { PLANS_CONTENT } from '@/features/landing/content/plans.content'
import type { PlanCapacity, PublicPlan } from '@/features/landing/types/plans.types'

/**
 * El cálculo orientativo del catálogo público, y sobre todo **el hueco**.
 *
 * ── Qué se rompió y por qué esta prueba no existía antes ───────────────────
 * `PublicPlanCapacityResponse` traía un único `extraUnitAmount`, mensual sin
 * decirlo, y el ciclo anual se fabricaba multiplicándolo por diez —la proporción
 * del precio base, «2 meses gratis»—. El servidor nunca cobró así: liquida la
 * capacidad extra contra la escalera `ANNUAL` del propio artículo. La cifra que
 * veía el cliente al elegir el plan anual no era una aproximación del importe
 * anual, era un número sin relación con él, y ninguna prueba lo miraba.
 *
 * Hoy el contrato parte el precio en dos campos NULABLES, y `null` significa «esa
 * capacidad no se vende suelta en ese ciclo»: la contratación la rechaza. Estas
 * pruebas fijan las dos mitades del arreglo —cada ciclo lee SU precio, y el hueco
 * se propaga en vez de aplanarse a cero— porque las dos son invisibles en
 * pantalla hasta que alguien intenta comprar.
 */

const CAPACIDAD_BASE: Omit<PlanCapacity, 'monthlyExtraUnitAmount' | 'annualExtraUnitAmount'> = {
  code: 'BRANCH',
  name: 'Sedes',
  unit: 'BRANCH',
  included: 1,
}

/**
 * El eje de personas, con holgura, para los casos que solo miran las sedes.
 *
 * No es relleno: sin él el plan no vende `USER`, y el cálculo cuenta como
 * cobrable toda persona por encima de las cero incluidas —y sin precio publicado,
 * porque no hay fila—. Es decir, el propio comportamiento que otro caso de aquí
 * abajo fija a propósito. Se declara para que cada prueba mire un solo eje.
 */
const USUARIOS_HOLGADOS: PlanCapacity = {
  code: 'USER',
  name: 'Usuarios',
  unit: 'USER',
  included: 10,
  monthlyExtraUnitAmount: 5_000,
  annualExtraUnitAmount: 20_000,
}

/** Un plan mínimo, escrito a mano: las cifras se eligen para que ningún resultado sea ambiguo. */
function planCon(capacities: PlanCapacity[]): PublicPlan {
  const conUsuarios = capacities.some((c) => c.unit === 'USER')
    ? capacities
    : [...capacities, USUARIOS_HOLGADOS]
  return {
    code: 'PRUEBA',
    name: 'Prueba',
    tagline: 'Para la prueba',
    recommended: false,
    monthlyFromAmount: 100_000,
    annualFromAmount: 1_000_000,
    setupAmount: 0,
    taxRate: 19,
    taxTreatment: 'TAXED',
    includes: [],
    capacities: conUsuarios,
  }
}

describe('calcularEstimado · cada ciclo lee SU precio', () => {
  /**
   * El caso que justifica el cambio entero. El precio anual de la sede extra
   * (30.000) NO es diez mensualidades (90.000), y por eso las dos cifras se
   * eligen aquí de forma que no puedan confundirse: el resultado correcto son
   * 90.000 y el de la extrapolación serían 270.000.
   */
  it('el ciclo anual cobra el precio anual del artículo, no diez mensualidades', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: 9_000, annualExtraUnitAmount: 30_000 },
    ])

    const anual = calcularEstimado(plan, { ciclo: 'ANUAL', sedes: 4, usuarios: 1 })

    expect(anual.sedesCobradas).toBe(3)
    expect(anual.sedesExtra).toBe(90_000)
    // Lo que habría salido con el `× 10`: 9.000 × 3 × 10.
    expect(anual.sedesExtra).not.toBe(270_000)
    expect(anual.subtotal).toBe(1_090_000)
  })

  it('el ciclo mensual cobra el precio mensual', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: 9_000, annualExtraUnitAmount: 30_000 },
    ])

    const mensual = calcularEstimado(plan, { ciclo: 'MENSUAL', sedes: 4, usuarios: 1 })

    expect(mensual.sedesExtra).toBe(27_000)
    expect(mensual.subtotal).toBe(127_000)
    expect(mensual.impuesto).toBe(24_130)
    expect(mensual.total).toBe(151_130)
  })
})

describe('calcularEstimado · la capacidad sin precio en ese ciclo', () => {
  it('no inventa cero: deja el importe en null y nombra el eje', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: 9_000, annualExtraUnitAmount: null },
    ])

    const anual = calcularEstimado(plan, { ciclo: 'ANUAL', sedes: 4, usuarios: 1 })

    expect(anual.sedesExtra).toBeNull()
    expect(anual.sinPrecio).toEqual(['BRANCH'])
    // Y sobre todo: NO es cero. Un cero aquí se lee como «las sedes de más salen
    // gratis en el plan anual», que es la mentira más cara de esta pantalla.
    expect(anual.sedesExtra).not.toBe(0)
  })

  it('el subtotal, el IVA y el total caen con él: una suma a la que le falta un sumando no vale', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: 9_000, annualExtraUnitAmount: null },
    ])

    const anual = calcularEstimado(plan, { ciclo: 'ANUAL', sedes: 4, usuarios: 1 })

    expect(anual.subtotal).toBeNull()
    expect(anual.impuesto).toBeNull()
    expect(anual.total).toBeNull()
    // El precio de entrada SÍ se conoce, y se conserva: lo que falta es el extra.
    // Rellenar el subtotal con él daría un importe más bajo que el real.
    expect(anual.base).toBe(1_000_000)
  })

  it('la fila se sigue pudiendo pintar: se sabe CUÁNTAS se cobran aunque no a cuánto', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: null, annualExtraUnitAmount: null },
    ])

    const mensual = calcularEstimado(plan, { ciclo: 'MENSUAL', sedes: 3, usuarios: 1 })

    expect(mensual.sedesCobradas).toBe(2)
    expect(mensual.sedesExtra).toBeNull()
  })

  it('lo INCLUIDO sigue incluido: sin precio de unidad extra, pero sin cobrar de más', () => {
    // `included` es verdad en los dos ciclos aunque la unidad adicional no tenga
    // precio en uno. Con la selección dentro de lo incluido no falta nada que
    // calcular, así que el estimado es un número y no un hueco.
    const plan = planCon([
      {
        ...CAPACIDAD_BASE,
        included: 3,
        monthlyExtraUnitAmount: null,
        annualExtraUnitAmount: null,
      },
    ])

    const anual = calcularEstimado(plan, { ciclo: 'ANUAL', sedes: 3, usuarios: 1 })

    expect(anual.sedesCobradas).toBe(0)
    expect(anual.sedesExtra).toBe(0)
    expect(anual.sinPrecio).toEqual([])
    expect(anual.subtotal).toBe(1_000_000)
  })

  it('un eje sin precio arrastra el total aunque el otro sí lo tenga', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: 9_000, annualExtraUnitAmount: 30_000 },
      {
        code: 'USER',
        name: 'Usuarios',
        unit: 'USER',
        included: 2,
        monthlyExtraUnitAmount: 5_000,
        annualExtraUnitAmount: null,
      },
    ])

    const anual = calcularEstimado(plan, { ciclo: 'ANUAL', sedes: 2, usuarios: 5 })

    expect(anual.sedesExtra).toBe(30_000)
    expect(anual.usuariosExtra).toBeNull()
    expect(anual.sinPrecio).toEqual(['USER'])
    // Un subtotal con el eje que sí se conoce sería un precio más barato que el
    // real, presentado como el precio.
    expect(anual.subtotal).toBeNull()
  })

  it('un plan que no vende ese eje tampoco vale cero', () => {
    // Antes, `?? 0` colapsaba «no hay fila» en «no cuesta nada» y el desglose
    // pintaba «3 sede(s) adicional(es) — $ 0».
    const sinEjes: PublicPlan = { ...planCon([]), capacities: [] }
    const anual = calcularEstimado(sinEjes, { ciclo: 'ANUAL', sedes: 4, usuarios: 1 })

    expect(anual.sedesExtra).toBeNull()
    expect(anual.subtotal).toBeNull()
  })
})

describe('subtotalMensualEquivalente · lo que se guarda para detectar deriva', () => {
  it('normaliza a mes aunque se elija el ciclo anual', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: 9_000, annualExtraUnitAmount: 30_000 },
    ])

    // Mismo resultado con los dos ciclos: es lo que evita que cambiar de mensual
    // a anual entre sesiones se lea como una subida de precio del 900 %.
    expect(subtotalMensualEquivalente(plan, { ciclo: 'ANUAL', sedes: 4, usuarios: 1 })).toBe(
      127_000,
    )
    expect(subtotalMensualEquivalente(plan, { ciclo: 'MENSUAL', sedes: 4, usuarios: 1 })).toBe(
      127_000,
    )
  })

  it('es null cuando el ciclo MENSUAL no publica el precio de lo que se cobra', () => {
    const plan = planCon([
      { ...CAPACIDAD_BASE, monthlyExtraUnitAmount: null, annualExtraUnitAmount: 30_000 },
    ])

    // Y esto es lo que se guarda en la intención. Un cero aquí haría saltar el
    // aviso de deriva del paso 6 contra un importe que nadie vio nunca.
    expect(subtotalMensualEquivalente(plan, { ciclo: 'ANUAL', sedes: 4, usuarios: 1 })).toBeNull()
  })
})

describe('cómo se dice el hueco en pantalla', () => {
  it('el importe ausente se escribe con el marcador de «sin dato», nunca con un cero', () => {
    expect(importeEstimado(null)).toBe('—')
    expect(importeEstimado(0)).not.toBe('—')
    expect(importeEstimado(127_000)).toMatch(/127/)
  })

  it('la explicación nombra la unidad en español y no el enum', () => {
    const texto = textoSinPrecio(['BRANCH'], 'ANUAL') ?? ''

    expect(texto).toContain('sedes')
    expect(texto).not.toContain('BRANCH')
    // Dice en qué ciclo falta y ofrece la salida que de verdad existe.
    expect(texto).toContain('anual')
    expect(texto).toContain('no se puede contratar')
  })

  it('sin ejes sin precio no hay nada que explicar', () => {
    expect(textoSinPrecio([], 'ANUAL')).toBeNull()
  })
})

describe('el catálogo transcrito de hoy', () => {
  /**
   * `plans.content.ts` transcribe la lista `PUB-2026-COP`, de la que solo se
   * publicaron las cifras MENSUALES: la escalera `ANNUAL` de cada artículo no
   * está en ninguna fuente que este front pueda leer. Antes ese hueco no se veía
   * porque el `× 10` lo rellenaba con una cuenta.
   *
   * Esta prueba fija la consecuencia visible mientras el hueco siga ahí. Cuando
   * comercial publique las cifras anuales, se rellenan los seis `null` y esta
   * prueba se da la vuelta — que es exactamente lo que tiene que pasar.
   */
  it('no publica precio anual de unidad adicional, así que el anual con extras no tiene estimado', () => {
    const clinica = PLANS_CONTENT.plans.find((p) => p.code === 'CLINICA')
    expect(clinica).toBeDefined()

    const sedesIncluidas = clinica!.capacities.find((c) => c.unit === 'BRANCH')!.included
    const anual = calcularEstimado(clinica!, {
      ciclo: 'ANUAL',
      sedes: sedesIncluidas + 1,
      usuarios: 1,
    })

    expect(anual.sinPrecio).toContain('BRANCH')
    expect(anual.total).toBeNull()
  })

  it('el mensual sí tiene precio: lo transcrito no se perdió al partir el campo en dos', () => {
    const clinica = PLANS_CONTENT.plans.find((p) => p.code === 'CLINICA')!
    const sedesIncluidas = clinica.capacities.find((c) => c.unit === 'BRANCH')!.included

    const mensual = calcularEstimado(clinica, {
      ciclo: 'MENSUAL',
      sedes: sedesIncluidas + 1,
      usuarios: 1,
    })

    expect(mensual.sinPrecio).toEqual([])
    expect(mensual.sedesExtra).toBe(42_000)
    expect(mensual.subtotal).toBe(clinica.monthlyFromAmount + 42_000)
  })
})
