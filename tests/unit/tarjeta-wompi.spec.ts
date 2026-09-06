import { describe, expect, it } from 'vitest'
import {
  luhnValido,
  validarCorreoAceptante,
  validarCvc,
  validarNumeroTarjeta,
  validarTitular,
  validarVencimiento,
} from '@/features/suscripcion/composables/tarjetaWompi'

/**
 * LOS VALIDADORES DEL FORMULARIO DE TARJETA, PUROS Y SIN MONTAR NADA.
 *
 * Las cuatro tarjetas de prueba de sandbox de Wompi (§2 de la especificación) pasan Luhn de
 * verdad: no son números inventados, y por eso sirven aquí para afirmar el caso feliz sin
 * fabricar un número que además tuviera que superar el dígito de control por casualidad.
 */

describe('luhnValido', () => {
  it('acepta las tarjetas de prueba de Wompi', () => {
    expect(luhnValido('4242424242424242')).toBe(true)
    expect(luhnValido('4970110000001029')).toBe(true)
    expect(luhnValido('4970110000000062')).toBe(true)
    expect(luhnValido('4666533000000031')).toBe(true)
  })

  it('rechaza un número con el dígito de control alterado', () => {
    expect(luhnValido('4242424242424241')).toBe(false)
  })
})

describe('validarNumeroTarjeta', () => {
  it('vacío es obligatorio', () => {
    expect(validarNumeroTarjeta('')).toBe('El número de tarjeta es obligatorio.')
  })

  it('ignora los espacios de agrupación visual', () => {
    expect(validarNumeroTarjeta('4242 4242 4242 4242')).toBeNull()
  })

  it('rechaza letras', () => {
    expect(validarNumeroTarjeta('4242abcd42424242')).toBe('Solo se permiten dígitos.')
  })

  it('exige entre 13 y 19 dígitos', () => {
    expect(validarNumeroTarjeta('123456789012')).toBe('Debe tener entre 13 y 19 dígitos.')
  })

  it('un número de 16 dígitos que no cumple Luhn se rechaza', () => {
    expect(validarNumeroTarjeta('1234567890123456')).toBe('El número de tarjeta no es válido.')
  })
})

describe('validarVencimiento', () => {
  const AHORA = new Date(2026, 7, 15) // 15 de agosto de 2026

  it('vacío es obligatorio', () => {
    expect(validarVencimiento('', AHORA)).toBe('La fecha de vencimiento es obligatoria.')
  })

  it('exige el formato MM/AA', () => {
    expect(validarVencimiento('8/29', AHORA)).toBe('Usa el formato MM/AA.')
    expect(validarVencimiento('0829', AHORA)).toBe('Usa el formato MM/AA.')
  })

  it('el mes tiene que estar entre 01 y 12', () => {
    expect(validarVencimiento('13/29', AHORA)).toBe('El mes debe estar entre 01 y 12.')
    expect(validarVencimiento('00/29', AHORA)).toBe('El mes debe estar entre 01 y 12.')
  })

  it('una fecha futura es válida', () => {
    expect(validarVencimiento('09/29', AHORA)).toBeNull()
  })

  it('el mismo mes del año en curso todavía es válido: vence al FINAL del mes', () => {
    expect(validarVencimiento('08/26', AHORA)).toBeNull()
  })

  it('un mes ya pasado está vencida', () => {
    expect(validarVencimiento('07/26', AHORA)).toBe('La tarjeta está vencida.')
  })
})

describe('validarCvc', () => {
  it('acepta 3 y 4 dígitos', () => {
    expect(validarCvc('123')).toBeNull()
    expect(validarCvc('1234')).toBeNull()
  })

  it('rechaza menos de 3 o más de 4', () => {
    expect(validarCvc('12')).toBe('Debe tener 3 o 4 dígitos.')
    expect(validarCvc('12345')).toBe('Debe tener 3 o 4 dígitos.')
  })
})

describe('validarTitular', () => {
  it('exige al menos 2 caracteres', () => {
    expect(validarTitular('A')).toBe('Debe tener al menos 2 caracteres.')
    expect(validarTitular('Ana Gómez')).toBeNull()
  })
})

describe('validarCorreoAceptante', () => {
  it('exige un correo con formato válido', () => {
    expect(validarCorreoAceptante('')).toBe('Escribe el correo de quien acepta y paga.')
    expect(validarCorreoAceptante('no-es-un-correo')).toMatch(/correo válido/)
    expect(validarCorreoAceptante('admin@clinica.com')).toBeNull()
  })

  it('rechaza un correo de más de 120 caracteres, como `AcceptQuoteRequest.acceptedByEmail`', () => {
    const largo = `${'a'.repeat(116)}@x.co`
    expect(largo.length).toBeGreaterThan(120)
    expect(validarCorreoAceptante(largo)).toBe('El correo no puede pasar de 120 caracteres.')
  })
})
