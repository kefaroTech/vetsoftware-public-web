/**
 * El techo de toda cantidad que el cliente teclea y que viaja como `quantity`
 * en una línea de la API.
 *
 * ── Por qué hace falta un techo, y no solo un suelo ────────────────────────
 * `quantity` es un `int` con `@Positive` en el borde REST. El suelo ya estaba
 * puesto en los dos formularios; el techo no estaba en ninguno. Y el fallo de
 * arriba es peor que el de abajo: por encima de `Integer.MAX_VALUE`
 * (2.147.483.647) **Jackson no llega a construir el objeto**, así que la
 * respuesta no es un error de validación con el nombre del campo — es un 400
 * pelado. Quien escribió `1e10`, o se apoyó en la tecla del cero, lee «no se
 * pudo» y no tiene forma de saber qué corregir.
 *
 * ── Por qué 10.000 ────────────────────────────────────────────────────────
 * El número tiene que ser generoso con la clínica más grande que exista y
 * pequeño frente al desbordamiento. Las dos cotas están tan separadas que no
 * hay que afinar nada:
 *
 *  - **Por arriba**: la mayor cadena veterinaria del mundo ronda los 3.000
 *    hospitales. 10.000 sedes es más del triple de eso, y 10.000 personas o
 *    cajas registradoras es más plantilla de la que va a tener ninguna cadena
 *    que se autocontrate por un embudo público — una operación de ese tamaño
 *    no pasa por aquí, pide una cotización negociada. Que es exactamente lo
 *    que ofrece el mensaje cuando alguien topa con el techo.
 *  - **Por abajo**: 10.000 queda cinco órdenes de magnitud por debajo de
 *    `Integer.MAX_VALUE`, así que ninguna cantidad aceptada puede acercarse al
 *    borde donde el 400 se queda sin mensaje.
 *
 * ── Por qué vive aquí y no en cada componente ─────────────────────────────
 * Porque el defecto hermano de este es justamente el de una regla transcrita
 * dos veces: el tope de 120 del correo, que la consola sí comprobaba
 * (`quoteFormValidators.validateEmail`) y del que esta copia se había quedado
 * sin. Dos formularios distintos —el configurador del embudo y el modal de
 * cambiar cantidad— aplican esta misma regla; con dos literales, uno de los dos
 * se queda atrás y nadie lo nota hasta que un cliente ve un 400.
 */
export const MAX_CANTIDAD_LINEA = 10_000

/**
 * El techo escrito como lo lee un humano («10.000»), para los mensajes.
 *
 * Se DERIVA del número en vez de transcribirse: un mensaje que nombra un límite
 * distinto del que se aplica es peor que no nombrarlo.
 */
export const MAX_CANTIDAD_LINEA_TXT = new Intl.NumberFormat('es-CO').format(MAX_CANTIDAD_LINEA)

/**
 * El suelo Y el techo de una cantidad tecleada, en una sola función.
 *
 * <p>Son la misma regla —«una cantidad que el servidor pueda aceptar»— y viven
 * juntas a propósito: separadas es como se pierde una de las dos, que es
 * exactamente lo que había pasado.
 *
 * <p>Abajo: los `<input type="number">` devuelven cadena vacía al borrarlos, y
 * `Number('')` es `0`. Nunca por debajo de 1. Arriba: `MAX_CANTIDAD_LINEA`.
 *
 * <p>Vive fuera del SFC porque el presupuesto del repositorio topa los
 * componentes en 500 líneas y una función pura se prueba sin montar nada.
 * Recortar **no basta**: quien la use tiene que decirlo (`seRecorta`), porque
 * reescribir en silencio el número que alguien tecleó es su propio defecto.
 */
export function normalizarCantidad(valor: unknown): number {
  const n = Math.trunc(Number(valor))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, MAX_CANTIDAD_LINEA)
}

/** Si ese valor pasa del techo, y por tanto hay que avisar además de recortar. */
export function seRecorta(valor: unknown): boolean {
  const n = Math.trunc(Number(valor))
  return Number.isFinite(n) && n > MAX_CANTIDAD_LINEA
}

/**
 * El aviso de que el número tecleado se recortó, con el límite DENTRO: un tope
 * que no se nombra no se puede respetar.
 *
 * <p>Vive junto al límite que nombra por el mismo motivo que
 * {@link MAX_CANTIDAD_LINEA_TXT}: un mensaje que cita un número distinto del que
 * se aplica es peor que no citar ninguno.
 */
export const AVISO_TECHO = `Como máximo ${MAX_CANTIDAD_LINEA_TXT} por campo. Si tu grupo es más grande, escríbenos y lo cotizamos contigo.`
