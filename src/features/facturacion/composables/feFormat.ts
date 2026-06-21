/**
 * Helpers de formato y catálogos fijos de Facturación electrónica (DIAN).
 * Las etiquetas de enums viven en `types/facturacion.ts`; aquí solo formato + RUT.
 */

/** Formato de moneda COP: `$1.234.567` (sin decimales, el backend almacena enteros). */
export function feMoney(n: number | null | undefined): string {
  return '$' + Math.round(n || 0).toLocaleString('es-CO')
}

/**
 * Dígito de verificación DIAN para NIT (algoritmo oficial módulo 11).
 * Se muestra calculado en el wizard; el backend es la fuente de verdad al guardar.
 */
export function calcVerificationDigit(nit: string | null | undefined): string {
  const digits = String(nit ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  let sum = 0
  const rev = digits.split('').reverse()
  for (let i = 0; i < rev.length; i++) sum += Number(rev[i]) * (weights[i] || 0)
  const r = sum % 11
  return String(r > 1 ? 11 - r : r)
}

/** Códigos de responsabilidad fiscal del RUT (catálogo fijo, no es endpoint). */
export interface ResponsibilityOption {
  code: string
  description: string
}

export const RESPONSIBILITY_OPTIONS: ResponsibilityOption[] = [
  { code: 'O-13', description: 'Gran contribuyente' },
  { code: 'O-15', description: 'Autorretenedor' },
  { code: 'O-23', description: 'Agente de retención de IVA' },
  { code: 'O-47', description: 'Régimen Simple de Tributación' },
  { code: 'R-99-PN', description: 'No responsable / no aplica' },
]
