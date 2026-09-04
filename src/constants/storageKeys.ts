import { storageService } from '@/services/storage/storage.service'

/**
 * Las claves que esta aplicación guarda en `localStorage`, declaradas en un
 * único sitio.
 *
 * No están aquí por orden: están aquí porque la decisión importante de cada una
 * es si SOBREVIVE a un cierre de sesión, y esa decisión solo se puede revisar si
 * se ven todas juntas. Cuando la clave vivía como literal dentro de su store,
 * nadie tenía delante la lista completa y el borrador de «Nueva consulta» —con el
 * paciente, el propietario y el examen físico dentro— sobrevivía al logout y se
 * le aparecía prellenada al siguiente usuario del mismo equipo (issue #68).
 *
 * Regla para añadir una clave nueva: si su contenido depende de QUIÉN inició
 * sesión, va en `VOLATILE_STORAGE_KEYS`. Si depende del EQUIPO (una impresora,
 * un periférico), no.
 */

/** Borrador del asistente de «Nueva consulta». Volátil: lleva datos clínicos del paciente. */
export const NUEVA_CONSULTA_DRAFT_KEY = 'lumbre:nueva-consulta-draft'

/** Sede operativa seleccionada. Volátil: es contexto de la sesión, no del equipo. */
export const SELECTED_BRANCH_KEY = 'vetsoft.branch'

/**
 * Ancho del rollo de la impresora térmica.
 *
 * NO es volátil, y es deliberado: la impresora es física al mostrador, no del
 * usuario que esté en turno. Borrarla al cerrar sesión obligaría a reconfigurarla
 * en cada cambio de turno y el primer ticket saldría con el ancho equivocado.
 */
export const RECEIPT_WIDTH_KEY = 'lumbre:receipt-width'

/**
 * Intención de contratación del embudo comercial: el paquete o los módulos
 * marcados, el ciclo y las cantidades que el prospecto eligió en la landing.
 *
 * **NO es volátil, y es deliberado.** Aplicando la regla de arriba —¿depende de
 * QUIÉN inició sesión?— la respuesta es que no: esta clave se escribe **antes de
 * que exista ninguna sesión**, en `/` o en `/planes`, por alguien que todavía no
 * es usuario. Entre elegir el plan y poder contratarlo hay un salto de
 * verificación por correo que puede durar días; si un cierre de sesión se la
 * llevara, quien entrase a comprobar algo con otra cuenta perdería la elección
 * que hizo antes de registrarse, que es justo lo que este dato existe para
 * evitar. No lleva ningún dato clínico ni personal: códigos de catálogo, ciclo y
 * dos números.
 *
 * El `v1` no es adorno: cuando la forma cambie **de manera que la anterior deje
 * de ser legible**, una clave nueva evita leer un objeto viejo con campos que ya
 * no existen. Un campo AÑADIDO no es ese caso —`parseIntencion` lo rellena con
 * su defecto y la intención vieja sigue produciendo la misma oferta—, y subir la
 * versión por él descartaría en silencio todas las intenciones vivas.
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

/**
 * Traspaso de las dos claves que el rebrand renombró de `vetrina:` a `lumbre:`.
 *
 * El valor de estas claves no es código: vive en el `localStorage` de
 * navegadores reales. Sin el traspaso, un borrador de consulta a medio escribir
 * el viernes queda inalcanzable el lunes —sigue en disco bajo el nombre viejo,
 * pero ya nadie lo lee ni lo borra— y cada mostrador vuelve al ancho de rollo
 * por defecto, con lo que el primer recibo del día sale cortado.
 *
 * Cuando las dos existen manda la nueva: la vieja solo puede ser el resto de una
 * pestaña que se quedó abierta en la versión anterior, y pisar con ella lo que
 * el usuario acaba de escribir sería peor que descartarla.
 *
 * Se puede retirar en cuanto haya pasado un ciclo de despliegue completo desde
 * la versión que lo introduce: a partir de ahí ningún navegador activo conserva
 * una clave `vetrina:` que traspasar.
 */
export function migrateRenamedStorageKeys(): void {
  const renamed: readonly (readonly [string, string])[] = [
    ['vetrina:nueva-consulta-draft', NUEVA_CONSULTA_DRAFT_KEY],
    ['vetrina:receipt-width', RECEIPT_WIDTH_KEY],
  ]

  for (const [legacy, current] of renamed) {
    const value = localStorage.getItem(legacy)
    if (value === null) continue
    if (localStorage.getItem(current) === null) localStorage.setItem(current, value)
    localStorage.removeItem(legacy)
  }
}

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
