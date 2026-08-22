/**
 * Claves de idempotencia por INTENTO, no por clic.
 *
 * El defecto que cierra esto costaba dinero: cada clic en «Agregar» generaba un
 * `crypto.randomUUID()` nuevo, así que el POST que sí llegó al servidor pero
 * perdió la respuesta (red caída a mitad, 504 del balanceador) se volvía a
 * cobrar íntegro en cuanto el usuario reintentaba. La clave tiene que
 * identificar **el cargo**, no la pulsación: mientras la operación no se
 * complete, el mismo `op` devuelve la MISMA clave y el backend deduplica.
 *
 * Las tres piezas del contrato, y las tres importan:
 *
 * - `keyFor(op)` — clave estable del intento. Se llama en cada envío, incluidos
 *   los reintentos. Dos llamadas con el mismo `op` devuelven la misma clave.
 * - `settle(op)` — la operación se completó: la clave muere. Sin esto, un
 *   segundo clic deliberado («quiero cobrar otra unidad de lo mismo») viajaría
 *   con la clave ya consumida y el backend lo descartaría como duplicado.
 * - `reset()` — se llama al ABRIR la pantalla o el modal. Lo que quedó vivo de
 *   una sesión anterior no es un reintento de nada.
 *
 * El `op` lo construye quien llama, y debe contener todo lo que distingue un
 * cargo de otro (mascota, ítem y cantidad en el cargo de catálogo; concepto,
 * importe, cantidad e impuesto en el cargo general). Si dos cargos distintos
 * comparten `op`, el segundo se pierde; si el mismo cargo genera dos `op`, se
 * cobra dos veces.
 *
 * Estado POR INSTANCIA: el `Map` se crea dentro de la función, nunca a nivel de
 * módulo. Cada modal tiene el suyo y no comparte nada con los demás, así que no
 * es estado global y no va a un store de Pinia.
 */
export interface AttemptKeys {
  /** Clave del intento en curso para `op`; la crea si no había ninguna viva. */
  keyFor: (op: string) => string
  /** La operación `op` se completó: su clave deja de reutilizarse. */
  settle: (op: string) => void
  /** Descarta todas las claves vivas. Al abrir el modal, siempre. */
  reset: () => void
}

export function useAttemptKeys(): AttemptKeys {
  /** `op` → clave de idempotencia viva. Local a esta instancia, no compartido. */
  const live = new Map<string, string>()

  function keyFor(op: string): string {
    const current = live.get(op)
    if (current) return current
    const fresh = crypto.randomUUID()
    live.set(op, fresh)
    return fresh
  }

  function settle(op: string): void {
    live.delete(op)
  }

  function reset(): void {
    live.clear()
  }

  return { keyFor, settle, reset }
}
