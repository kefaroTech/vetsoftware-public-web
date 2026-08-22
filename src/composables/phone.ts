/**
 * Normalización de teléfonos del tenant. Un solo sitio, una sola regla.
 *
 * Antes convivían cuatro sanitizadores distintos para el mismo dato y dos de
 * ellos contradecían el formato que su propio placeholder enseñaba: el peor era
 * `OwnerForm`, que borraba todo lo que no fuera dígito mientras el campo
 * mostraba `3001234567` con espacios. Pegar `+57 300 123 4567` —lo normal al
 * copiar de WhatsApp— guardaba `573001234567`: un número que no existe, y sin
 * un solo aviso.
 *
 * Regla única, decidida para el producto: **se guardan solo los dígitos
 * nacionales**. Colombia es el único país del producto (la geografía sembrada
 * es DIVIPOLA, solo Colombia), así que el indicativo internacional no aporta
 * nada al dato guardado y, si viene pegado delante, se DESCARTA en vez de
 * quedarse como dígitos de más.
 *
 * No migra nada: normaliza lo que se teclea o se pega de aquí en adelante. Los
 * números ya guardados con otro formato se quedan como están.
 */

/** Indicativo internacional de Colombia, sin `+`. */
const CO_COUNTRY_CODE = '57'

/**
 * Longitud de un número nacional colombiano: 10 dígitos, tanto el móvil
 * (`3001234567`) como el fijo con indicativo de área (`6012345678`).
 */
const NATIONAL_LENGTH = 10

/**
 * Deja el teléfono en dígitos nacionales.
 *
 * - Descarta todo lo que no sea dígito (`+`, espacios, guiones, paréntesis).
 * - Si con eso sobra longitud y el resultado empieza por el indicativo de
 *   Colombia, lo quita: `+57 300 123 4567` → `3001234567`. La comprobación de
 *   longitud es la que impide comerse el prefijo de un fijo que empiece por
 *   `57` y ya venga en formato nacional.
 * - Recorta a la longitud nacional, para que un pegado con basura detrás no
 *   produzca un número imposible.
 */
export function sanitizePhone(raw: string): string {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length > NATIONAL_LENGTH && digits.startsWith(CO_COUNTRY_CODE)) {
    digits = digits.slice(CO_COUNTRY_CODE.length)
  }
  return digits.slice(0, NATIONAL_LENGTH)
}

/**
 * Placeholder canónico del teléfono. Sin espacios y sin `+57`, porque es
 * EXACTAMENTE lo que `sanitizePhone` deja pasar: un placeholder que enseña un
 * formato que el campo destruye es peor que no tener ninguno (R16.4).
 */
export const PHONE_PLACEHOLDER_MOBILE = '3001234567'
export const PHONE_PLACEHOLDER_LANDLINE = '6012345678'
