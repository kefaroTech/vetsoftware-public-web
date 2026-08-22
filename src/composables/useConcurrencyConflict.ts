import { ref } from 'vue'

/** Lo mínimo que un recurso versionado (`@Version`) tiene que exponer. */
export interface Versioned {
  version: number
}

/**
 * FORM-11 — política de conflicto de concurrencia (409 `CONCURRENT_MODIFICATION`).
 *
 * **Regla, sin excepciones: un 409 NUNCA escribe en el borrador.**
 *
 * Lo que hacían los tres formularios versionados del tenant
 * (`ProductFormModal`, `ServiceFormModal`, `TaxFormModal`) era `store.refresh()`
 * seguido de `hydrate(fresh)`, es decir un `Object.assign` sobre todos los
 * campos: lo que el usuario acababa de escribir desaparecía, y el mensaje
 * («se recargó la información, revisa y reintenta») llegaba cuando ya no
 * quedaba nada que revisar. WCAG 2.2 §3.3.4 Error Prevention (AA) exige que una
 * entrada que el usuario no puede reconstruir sea reversible, verificada o
 * confirmada; aquello no era ninguna de las tres.
 *
 * Aquí la copia fresca del servidor se guarda APARTE del borrador y el usuario
 * decide:
 *
 * - **«Mantener lo mío»** → se adopta solo la `version` del servidor, para que
 *   el siguiente envío no vuelva a chocar, y se conserva TODO lo escrito. **No
 *   reenvía solo**: el usuario vuelve a pulsar «Guardar». Reenviar
 *   automáticamente sobrescribiría el trabajo ajeno sin que nadie lo confirme —
 *   el mismo pecado, en la otra dirección.
 * - **«Usar la del servidor»** → se rehidrata el borrador. Es el comportamiento
 *   de antes, pero ahora ELEGIDO.
 *
 * Mientras hay un conflicto sin resolver el formulario no debe dejar guardar:
 * evita el tercer 409 en cadena. Para eso está `hasConflict`.
 */
export function useConcurrencyConflict<T extends Versioned>(options: {
  /** Recarga el catálogo para que `find` pueda devolver la versión fresca. */
  refresh: () => Promise<void>
  /** Localiza el recurso recargado. `null` si ya no existe (lo borraron). */
  find: () => T | null
  /** Adopta SOLO la versión del servidor sobre el borrador intacto. */
  keepMine: (server: T) => void
  /** Rehidrata el borrador con la copia del servidor. */
  useTheirs: (server: T) => void
}) {
  /** Copia fresca del servidor. Mientras no sea `null` hay conflicto abierto. */
  const serverCopy = ref<T | null>(null)

  /** Texto del banner. Lo primero que dice es que NO se ha perdido nada. */
  const message =
    'Otra persona guardó cambios en este registro mientras lo editabas. ' +
    'Tu texto sigue aquí: elige con qué te quedas.'

  /** Se llama desde el `catch`, tras comprobar `isConcurrencyConflict(e)`. */
  async function capture(): Promise<void> {
    await options.refresh()
    serverCopy.value = options.find()
  }

  function resolveKeepMine(): void {
    if (serverCopy.value) options.keepMine(serverCopy.value)
    serverCopy.value = null
  }

  function resolveUseTheirs(): void {
    if (serverCopy.value) options.useTheirs(serverCopy.value)
    serverCopy.value = null
  }

  function clear(): void {
    serverCopy.value = null
  }

  return { serverCopy, message, capture, resolveKeepMine, resolveUseTheirs, clear }
}
