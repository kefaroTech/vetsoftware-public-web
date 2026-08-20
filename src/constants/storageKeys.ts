import { storageService } from '@/services/storage/storage.service'

/**
 * Las claves que esta aplicación guarda en `localStorage`, declaradas en un
 * único sitio.
 *
 * No están aquí por orden: están aquí porque la decisión importante de cada una
 * es si SOBREVIVE a un cierre de sesión, y esa decisión solo se puede revisar si
 * se ven todas juntas. Cuando la clave vivía como literal dentro de su store,
 * nadie tenía delante la lista completa y `vetrina:nueva-consulta-draft` —con el
 * paciente, el propietario y el examen físico dentro— sobrevivía al logout y se
 * le aparecía prellenada al siguiente usuario del mismo equipo (issue #68).
 *
 * Regla para añadir una clave nueva: si su contenido depende de QUIÉN inició
 * sesión, va en `VOLATILE_STORAGE_KEYS`. Si depende del EQUIPO (una impresora,
 * un periférico), no.
 */

/** Borrador del asistente de «Nueva consulta». Volátil: lleva datos clínicos del paciente. */
export const NUEVA_CONSULTA_DRAFT_KEY = 'vetrina:nueva-consulta-draft'

/** Sede operativa seleccionada. Volátil: es contexto de la sesión, no del equipo. */
export const SELECTED_BRANCH_KEY = 'vetsoft.branch'

/**
 * Ancho del rollo de la impresora térmica.
 *
 * NO es volátil, y es deliberado: la impresora es física al mostrador, no del
 * usuario que esté en turno. Borrarla al cerrar sesión obligaría a reconfigurarla
 * en cada cambio de turno y el primer ticket saldría con el ancho equivocado.
 */
export const RECEIPT_WIDTH_KEY = 'vetrina:receipt-width'

/** Claves que un cierre de sesión debe llevarse por delante. */
export const VOLATILE_STORAGE_KEYS: readonly string[] = [
  NUEVA_CONSULTA_DRAFT_KEY,
  SELECTED_BRANCH_KEY,
]

/**
 * Se llama una vez en el arranque (`main.ts`). El registro vive en memoria del
 * módulo de `storageService`, así que si no se ejecuta, `clearVolatile()` solo
 * borraría las credenciales y el defecto de #68 volvería en silencio.
 */
export function registerVolatileStorageKeys(): void {
  for (const key of VOLATILE_STORAGE_KEYS) storageService.registerVolatileKey(key)
}
