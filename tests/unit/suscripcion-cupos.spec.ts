import { describe, expect, it } from 'vitest'
import {
  CUPOS_ILEGIBLES,
  avisoCupo,
  avisoTexto,
  consecuencia,
  medidorTexto,
  sinContadores,
  sustantivo,
  umbralAlcanzado,
} from '@/features/suscripcion/composables/cuposText'
import type { CompanyAccessResponse } from '@/features/suscripcion/types/cupos.types'

/**
 * Los cupos son el bloque donde una mentira sale más cara: si la pantalla dice «no tienes
 * topes» cuando sí los hay, la auxiliar se entera del tope a mitad de una consulta.
 */

describe('cuposText · el medidor nunca miente', () => {
  it('sin techo declarado dice «sin límite», no un límite de cero', () => {
    expect(medidorTexto(340, undefined, 'ANIMAL')).toBe('340 mascotas · sin límite')
  })

  it('con techo dice «340 de 500 mascotas», que es lo que se puede leer por teléfono', () => {
    expect(medidorTexto(340, 500, 'ANIMAL')).toBe('340 de 500 mascotas')
  })

  it('una dimensión desconocida cae al código en mayúsculas, NUNCA a undefined', () => {
    expect(sustantivo('APPOINTMENTS_PER_MONTH')).toBe('APPOINTMENTS_PER_MONTH')
    expect(medidorTexto(7, 10, 'ALGO_NUEVO')).toBe('7 de 10 ALGO_NUEVO')
    expect(medidorTexto(7, 10, undefined)).not.toContain('undefined')
  })
})

describe('cuposText · umbrales', () => {
  it('dispara uno solo, el más alto alcanzado', () => {
    expect(umbralAlcanzado(95, 100)).toBe(90)
    expect(umbralAlcanzado(85, 100)).toBe(80)
    expect(umbralAlcanzado(65, 100)).toBe(60)
    expect(umbralAlcanzado(50, 100)).toBeNull()
  })

  it('respeta el warnThreshold del contrato cuando es mayor que 60', () => {
    expect(umbralAlcanzado(70, 100, 70)).toBe(70)
    // Por debajo del suelo no se respeta: 60 sigue mandando.
    expect(umbralAlcanzado(65, 100, 40)).toBe(60)
  })

  it('sin techo no hay umbral posible', () => {
    expect(umbralAlcanzado(340, undefined)).toBeNull()
    expect(umbralAlcanzado(340, 0)).toBeNull()
  })
})

describe('cuposText · cada enforcement tiene su frase', () => {
  const agotado = { usedQuantity: 500, limitQuantity: 500, dimensionCode: 'ANIMAL' }

  it('WARN dice «puedes seguir registrando» — es la parte que no se puede recortar', () => {
    const aviso = avisoCupo(agotado, 'WARN')
    expect(aviso).not.toBeNull()
    expect(avisoTexto(aviso!)).toContain('Puedes seguir registrando')
    expect(aviso!.tono).toBe('warning')
  })

  it('BLOCK avisa de que no se podrá registrar más, y en tono de error', () => {
    const aviso = avisoCupo(agotado, 'BLOCK')
    expect(aviso!.tono).toBe('error')
    expect(avisoTexto(aviso!)).toContain('No podrás registrar más')
    expect(avisoTexto(aviso!)).toContain('Lo que ya tienes sigue funcionando')
  })

  it('OVERAGE dice que el exceso se cobra aparte', () => {
    expect(avisoTexto(avisoCupo(agotado, 'OVERAGE')!)).toContain('se cobra aparte')
  })

  it('READ_ONLY conserva la consulta y la impresión', () => {
    const aviso = avisoCupo(agotado, 'READ_ONLY')
    expect(aviso!.tono).toBe('error')
    expect(avisoTexto(aviso!)).toContain('consultar e imprimir')
  })

  it('sin modo conocido NO adivina: ni promete seguir ni amenaza con parar', () => {
    const texto = avisoTexto(avisoCupo(agotado, undefined)!)
    expect(texto).not.toContain('Puedes seguir registrando')
    expect(texto).not.toContain('No podrás registrar')
    expect(consecuencia(undefined)).toBeNull()
  })

  it('al 90 % nombra la consecuencia real, y la omite si no la conoce', () => {
    const casi = { usedQuantity: 95, limitQuantity: 100, dimensionCode: 'ANIMAL' }
    expect(avisoTexto(avisoCupo(casi, 'BLOCK')!)).toContain('Al agotarse no podrás registrar más')
    expect(avisoTexto(avisoCupo(casi, undefined)!)).not.toContain('Al agotarse')
  })
})

/**
 * §2.2 — el hueco que `MatchesContract` no ve. Es la comprobación más importante del bloque:
 * el comparador del contrato no baja a `capacities[]`, así que un renombrado en el backend lo
 * dejaría `undefined` sin romper la compilación.
 */
describe('CompanyAccessResponse · capacities ausente ≠ sin cupos', () => {
  /** Réplica de la rama del store, que es la que decide qué se pinta. */
  const legible = (a: CompanyAccessResponse) => Array.isArray(a.capacities)

  it('distingue «no pudimos leer» de «no tienes topes»', () => {
    expect(legible({ companyId: 1 })).toBe(false)
    expect(legible({ companyId: 1, capacities: [] })).toBe(true)
  })

  it('el texto del hueco no se parece al del plan sano', () => {
    expect(CUPOS_ILEGIBLES).toBe('No pudimos leer tus cupos.')
    expect(CUPOS_ILEGIBLES).not.toContain('no hay ningún tope')
    expect(sinContadores()).toContain('no hay ningún tope que te limite')
  })

  it('un array vacío sí es un plan sin contadores, y no es un error', () => {
    const acceso: CompanyAccessResponse = { companyId: 1, capacities: [] }
    expect(legible(acceso) && acceso.capacities!.length === 0).toBe(true)
  })
})
