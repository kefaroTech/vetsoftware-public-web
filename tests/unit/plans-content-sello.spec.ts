import { describe, expect, it } from 'vitest'
import { PLANS_CONTENT, SELLO, SELLO_MAX_DIAS } from '@/features/landing/content/plans.content'
import { CAPACITY_UNIT_LABEL } from '@/features/landing/types/plans.types'

/**
 * El sello del catálogo transcrito.
 *
 * `plans.content.ts` no es contrato: es una **transcripción manual** de la lista
 * de precio publicada, porque hoy no existe ningún endpoint público que la
 * sirva. El riesgo de una transcripción es exactamente uno —que se quede vieja y
 * nadie se entere—, y esta prueba es el único mecanismo que lo hace ruidoso.
 *
 * Cuando falle, la reparación NO es mover la fecha: es volver a mirar la lista
 * de precio, corregir lo que haya cambiado y **entonces** sellar. Mover la fecha
 * sin mirar convierte esta prueba en un trámite y devuelve el riesgo entero.
 */
describe('plans.content · el sello', () => {
  it('no lleva más de 90 días sin revisar', () => {
    const revisado = Date.parse(`${SELLO.revisadoEl}T00:00:00Z`)
    expect(Number.isNaN(revisado), `«${SELLO.revisadoEl}» no es una fecha ISO`).toBe(false)

    const dias = Math.floor((Date.now() - revisado) / 86_400_000)
    expect(
      dias,
      `El catálogo se revisó hace ${dias} días. Vuelve a mirar la lista de precio ` +
        `${SELLO.listaDePrecioCodigo} y sella DESPUÉS de corregir, no antes.`,
    ).toBeLessThanOrEqual(SELLO_MAX_DIAS)
  })

  it('no está sellado en el futuro', () => {
    // Un sello adelantado compra silencio sin haber mirado nada.
    expect(Date.parse(`${SELLO.revisadoEl}T00:00:00Z`)).toBeLessThanOrEqual(Date.now() + 86_400_000)
  })

  it('declara quién y contra qué lista', () => {
    expect(SELLO.listaDePrecioCodigo).toMatch(/\S/)
    expect(SELLO.revisadoPor).toMatch(/\S/)
  })
})

describe('plans.content · la forma que las pantallas dan por hecha', () => {
  it('tiene tres planes con código único y exactamente uno recomendado', () => {
    const codigos = PLANS_CONTENT.plans.map((p) => p.code)
    expect(codigos).toHaveLength(3)
    expect(new Set(codigos).size, 'dos planes con el mismo código').toBe(3)
    expect(PLANS_CONTENT.plans.filter((p) => p.recommended)).toHaveLength(1)
  })

  it('el anual sale más barato que doce mensualidades, o el rótulo de ahorro miente', () => {
    for (const plan of PLANS_CONTENT.plans) {
      expect(
        plan.annualFromAmount,
        `${plan.code}: la tarjeta promete «ahorras X» y el ahorro sería negativo`,
      ).toBeLessThan(plan.monthlyFromAmount * 12)
    }
  })

  it('cada unidad de capacidad tiene rótulo: nada de «3 undefined incluidas»', () => {
    for (const plan of PLANS_CONTENT.plans) {
      for (const capacidad of plan.capacities) {
        expect(
          CAPACITY_UNIT_LABEL[capacidad.unit],
          `${plan.code}/${capacidad.unit} no tiene rótulo en CAPACITY_UNIT_LABEL`,
        ).toBeTruthy()
      }
    }
  })

  it('los días de prueba son positivos y no todos iguales', () => {
    // La prueba vence POR LÍNEA, y esa es la mitad del valor del paso 7. Si
    // alguien aplanara todo a 30, la pantalla dejaría de tener nada que contar
    // y el día 14 se cobraría Caja sin aviso.
    // `trialDays` es NULABLE en el tipo —el contrato declara opcional
    // `default_trial_days`—, así que se afirma sobre los que hay, no sobre un
    // valor supuesto: un `null` aquí significa «este módulo no tiene prueba», y
    // eso es legítimo, no un cero.
    const dias = PLANS_CONTENT.plans.flatMap((p) =>
      p.includes.map((i) => i.trialDays).filter((d): d is number => d != null),
    )
    expect(dias.length, 'ningún módulo declara prueba').toBeGreaterThan(0)
    expect(dias.every((d) => d > 0)).toBe(true)
    expect(new Set(dias).size, 'ninguna prueba escalonada: revisa `trialDays`').toBeGreaterThan(1)
  })
})
