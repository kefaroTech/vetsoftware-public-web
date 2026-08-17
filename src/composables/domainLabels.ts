/**
 * Traducción a español de los enums del dominio declarados en
 * `src/types/domain.ts` (réplica literal de los enums Java).
 *
 * Van aparte de `format.ts` a propósito: `format.ts` no sabe nada del dominio,
 * y estas funciones no sirven para nada más. Cuando se alinea un enum con el
 * backend hay que tocar el tipo en `types/domain.ts`, los `*Options` del
 * componente, los defaults de `*Draft`, los mocks y **este archivo**.
 *
 * **Nunca** muestres el valor crudo del enum en la interfaz.
 */
import type { Gender, ReproductiveState, WeightUnit } from '@/types/domain'

/** `MALE` → `Macho`, `FEMALE` → `Hembra`. */
export function genderLabel(g: Gender | string | null | undefined): string {
  if (g === 'FEMALE') return 'Hembra'
  if (g === 'MALE') return 'Macho'
  return '—'
}

/** `STERILIZED` → `Esterilizada`, etc. */
export function reproductiveLabel(r: ReproductiveState | string | null | undefined): string {
  if (r === 'STERILIZED') return 'Esterilizada'
  if (r === 'NO_STERILIZED') return 'No esterilizada'
  if (r === 'UNKNOWN') return 'Desconocido'
  return '—'
}

/** Símbolo de la unidad de peso: `KILOGRAMS` → `kg`. Cadena vacía si no aplica. */
export function weightUnitLabel(u: WeightUnit | string | null | undefined): string {
  if (u === 'KILOGRAMS') return 'kg'
  if (u === 'GRAMS') return 'g'
  if (u === 'POUNDS') return 'lb'
  return ''
}
