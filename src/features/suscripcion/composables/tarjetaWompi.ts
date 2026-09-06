/**
 * Validadores puros del formulario de tarjeta de `FormularioTarjetaWompi.vue`, separados del
 * componente para poder probarlos sin montar nada (convención `validateXxx(v): string | null`
 * del repositorio).
 */

/** Algoritmo de Luhn: dígito de control que toda tarjeta real cumple. */
export function luhnValido(numero: string): boolean {
  let suma = 0
  let alterna = false
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = Number(numero[i])
    if (alterna) {
      digito *= 2
      if (digito > 9) digito -= 9
    }
    suma += digito
    alterna = !alterna
  }
  return suma % 10 === 0
}

export function validarNumeroTarjeta(v: string): string | null {
  const t = v.replace(/\s+/g, '')
  if (!t) return 'El número de tarjeta es obligatorio.'
  if (!/^\d+$/.test(t)) return 'Solo se permiten dígitos.'
  if (t.length < 13 || t.length > 19) return 'Debe tener entre 13 y 19 dígitos.'
  if (!luhnValido(t)) return 'El número de tarjeta no es válido.'
  return null
}

/** `valor` en formato `MM/AA`. `ahora` es inyectable para las pruebas. */
export function validarVencimiento(valor: string, ahora: Date = new Date()): string | null {
  const t = valor.trim()
  if (!t) return 'La fecha de vencimiento es obligatoria.'
  const match = /^(\d{2})\/(\d{2})$/.exec(t)
  if (!match) return 'Usa el formato MM/AA.'
  const [, mm, aa] = match
  const mes = Number(mm)
  if (mes < 1 || mes > 12) return 'El mes debe estar entre 01 y 12.'
  const finDeMes = new Date(2000 + Number(aa), mes, 0, 23, 59, 59)
  if (finDeMes.getTime() < ahora.getTime()) return 'La tarjeta está vencida.'
  return null
}

export function validarCvc(v: string): string | null {
  const t = v.trim()
  if (!t) return 'El CVC es obligatorio.'
  if (!/^\d{3,4}$/.test(t)) return 'Debe tener 3 o 4 dígitos.'
  return null
}

export function validarTitular(v: string): string | null {
  const t = v.trim()
  if (!t) return 'El nombre del titular es obligatorio.'
  if (t.length < 2) return 'Debe tener al menos 2 caracteres.'
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Mismo tope que `AceptarCotizacionModal.vue`: `AcceptQuoteRequest.acceptedByEmail`, 120. */
const EMAIL_MAX = 120

export function validarCorreoAceptante(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Escribe el correo de quien acepta y paga.'
  if (!EMAIL_RE.test(t)) return 'Escribe un correo válido, por ejemplo nombre@clinica.com.'
  if (t.length > EMAIL_MAX) return `El correo no puede pasar de ${EMAIL_MAX} caracteres.`
  return null
}

/**
 * `true` si `v` tiene forma de correo. La usa `MedioDePagoWompi.vue` (modo contratación) para
 * decidir si prellenar el campo con `MeResponse.employeeCode`: en el registro de autoservicio el
 * usuario de acceso del administrador ES su correo (`RegisterUserService`), pero un empleado dado
 * de alta después puede tener un código que no lo sea — y ese caso deja el campo vacío en vez de
 * prellenarlo con basura.
 */
export function pareceCorreo(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}
