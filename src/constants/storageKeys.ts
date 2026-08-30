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

/**
 * Intención de contratación del embudo comercial: el plan, el ciclo y las
 * cantidades que el prospecto eligió en la landing.
 *
 * **NO es volátil, y es deliberado.** Aplicando la regla de arriba —¿depende de
 * QUIÉN inició sesión?— la respuesta es que no: esta clave se escribe **antes de
 * que exista ninguna sesión**, en `/` o en `/planes`, por alguien que todavía no
 * es usuario. Entre elegir el plan y poder contratarlo hay un salto de
 * verificación por correo que puede durar días; si un cierre de sesión se la
 * llevara, quien entrase a comprobar algo con otra cuenta perdería la elección
 * que hizo antes de registrarse, que es justo lo que este dato existe para
 * evitar. No lleva ningún dato clínico ni personal: plan, ciclo y dos números.
 *
 * El `v1` no es adorno: cuando la forma cambie, una clave nueva evita leer un
 * objeto viejo con campos que ya no existen.
 */
export const CONTRATACION_INTENCION_KEY = 'vs.contratacion.intencion.v1'

/**
 * Las propuestas vivas del asistente comercial: `{ id opaco → token }`.
 *
 * **La escribe y la lee un solo módulo**, `features/asistente/api/asistente.source.ts`,
 * y ningún otro sitio del front debe tocarla. Guarda la credencial de 43
 * caracteres con la que se relee y se edita una propuesta, así que su cabecera
 * explica el porqué de cada decisión; aquí solo queda la que corresponde a esta
 * lista.
 *
 * **NO es volátil, por el mismo motivo que la intención**: se escribe en
 * `/planes` **antes de que exista ninguna sesión**, por alguien que todavía no
 * es usuario, y entre generar la propuesta y poder contratarla hay el mismo
 * salto de verificación por correo. Un cierre de sesión que se la llevara
 * dejaría al prospecto en el paso 6 con una intención que apunta a una propuesta
 * que ya no se puede releer — que es exactamente el carrito perdido en silencio
 * que este dato existe para evitar.
 *
 * Por qué `localStorage` y no un store de Pinia: lo que hay en un store se ve
 * entero en las devtools y se serializa con cualquier volcado de estado, y
 * además muere con la recarga, que es justo el caso que hay que sobrevivir. El
 * precedente del repositorio es `AUTH_STORAGE_KEY`: la credencial de sesión ya
 * vive aquí, con la misma exposición y el mismo origen.
 */
export const ASISTENTE_PROPUESTA_KEY = 'vs.asistente.propuestas.v1'

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
