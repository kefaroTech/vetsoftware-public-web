import { describe, expect, it } from 'vitest'
import {
  ctaCompra,
  cuerpoTrial,
  esComprable,
  estadoPill,
  notaCobroPrevio,
  sufijoEje,
  textoConfirmacion,
} from '@/features/suscripcion/composables/modulosText'

const HOY = '2026-08-28'

describe('modulosText · píldora de estado', () => {
  it('las cinco variantes de BaseChip, una por estado del backend', () => {
    expect(estadoPill('TRIAL')).toEqual({ variant: 'accent', texto: 'En prueba' })
    expect(estadoPill('FREE_LIMITED')).toEqual({ variant: 'success', texto: 'Gratis con techo' })
    expect(estadoPill('EXPIRED_READ_ONLY')).toEqual({ variant: 'warn', texto: 'Solo lectura' })
    expect(estadoPill('PAID')).toEqual({ variant: 'neutral', texto: 'Activo' })
    expect(estadoPill('NEVER_FREE')).toEqual({ variant: 'warn', texto: 'Nunca gratis' })
  })

  it('un estado que el front no conoce se dice feo a propósito, nunca undefined', () => {
    expect(estadoPill('ALGO_NUEVO')).toEqual({ variant: 'neutral', texto: 'ALGO_NUEVO' })
    expect(estadoPill(undefined)).toEqual({ variant: 'neutral', texto: '—' })
  })
})

describe('modulosText · cuerpo de EN_PRUEBA', () => {
  it('añade "no se corta nada" dentro de los 7 días, y no antes', () => {
    expect(cuerpoTrial('2026-08-30', HOY)).toContain('No se corta nada por sí solo.')
    expect(cuerpoTrial('2026-12-30', HOY)).not.toContain('No se corta nada por sí solo.')
  })

  it('dice la fecha de fin y los días restantes', () => {
    expect(cuerpoTrial('2026-08-30', HOY)).toContain('Quedan 2 días.')
  })
})

describe('modulosText · GRATIS_CON_TECHO, eje mensual vs. acumulado', () => {
  it('FLOW dice "este mes"; cualquier otro eje dice "en total"', () => {
    expect(sufijoEje('FLOW')).toBe('este mes')
    expect(sufijoEje('CUMULATIVE')).toBe('en total')
    expect(sufijoEje('STOCK')).toBe('en total')
    expect(sufijoEje(undefined)).toBe('en total')
  })
})

describe('modulosText · qué es comprable hoy', () => {
  it('EN_PRUEBA, SOLO_LECTURA y NUNCA_GRATIS son comprables si `purchasable`', () => {
    expect(esComprable('TRIAL', true)).toBe(true)
    expect(esComprable('EXPIRED_READ_ONLY', true)).toBe(true)
    expect(esComprable('NEVER_FREE', true)).toBe(true)
  })

  it('GRATIS_CON_TECHO nunca es comprable hoy: no existe el artículo de ampliación', () => {
    expect(esComprable('FREE_LIMITED', true)).toBe(false)
  })

  it('DE_PAGO_ACTIVO y NO_INCLUIDO nunca son comprables', () => {
    expect(esComprable('PAID', true)).toBe(false)
    expect(esComprable('NOT_INCLUDED', true)).toBe(false)
  })

  it('sin `purchasable` no hay nada que comprar, aunque el estado lo permita', () => {
    expect(esComprable('TRIAL', false)).toBe(false)
    expect(esComprable('TRIAL', undefined)).toBe(false)
  })

  it('el CTA solo tiene rótulo en los estados comprables', () => {
    expect(ctaCompra('TRIAL')).toBe('Comprar')
    expect(ctaCompra('EXPIRED_READ_ONLY')).toBe('Comprar')
    expect(ctaCompra('NEVER_FREE')).toBe('Comprar')
    expect(ctaCompra('FREE_LIMITED')).toBe('')
    expect(ctaCompra('PAID')).toBe('')
  })
})

describe('modulosText · confirmación de compra: nunca "se cobra hoy" salvo que el servidor lo diga', () => {
  it('con `chargedNow`, dice que se cobró hoy', () => {
    expect(textoConfirmacion({ chargedNow: true }, 'Agenda')).toBe('Agenda: se cobró hoy.')
  })

  it('sin `chargedNow`, usa la fecha exacta de `firstChargeDate`', () => {
    expect(textoConfirmacion({ chargedNow: false, firstChargeDate: '2026-09-30' }, 'Agenda')).toBe(
      'Agenda: el primer cobro es el 30 de septiembre, 2026.',
    )
  })

  it('sin ninguno de los dos, no inventa una fecha', () => {
    expect(textoConfirmacion({}, 'Agenda')).toBe('Agenda: ya está activo.')
  })
})

describe('modulosText · nota de cobro previo', () => {
  it('avisa del caso especial de facturación electrónica cuando está en la selección', () => {
    expect(notaCobroPrevio(true)).toContain('Facturación electrónica se cobra desde hoy')
  })

  it('sin facturación electrónica, no la menciona', () => {
    expect(notaCobroPrevio(false)).not.toContain('Facturación electrónica')
  })
})
