let seq = 0

/**
 * Identificador estable para una fila de lista EDITABLE.
 *
 * Vue reutiliza el nodo del DOM que tenga la misma `:key`. Con el índice del
 * array como clave, borrar la segunda fila hace que la tercera pase a ser la
 * «2» y herede el nodo —y el estado interno— de la que se eliminó: el campo de
 * cantidad conserva el valor de la fila borrada. En listas de solo lectura da
 * igual; en las que capturan cantidades y precios es un error de captura difícil
 * de reproducir y fácil de facturar.
 *
 * Se usa un contador y no un dato de la fila porque estas filas **nacen
 * vacías** —una línea de compra recién añadida no tiene producto todavía— o
 * pueden repetirse: dos cargos generales del mismo importe son dos cargos, no
 * uno. Cualquier clave derivada del contenido colisionaría en ambos casos.
 *
 * El identificador es de vida corta: sirve mientras el formulario está abierto y
 * no se persiste ni se envía al backend.
 */
export function nextRowUid(): number {
  return ++seq
}
