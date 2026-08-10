/**
 * Descarta el resultado de una carga que dejó de ser la última.
 *
 * El caso que resuelve: el usuario pasa de la mascota A a la B. `watch` dispara
 * dos cargas y no hay garantía de orden de llegada. Si la de A responde después
 * de la de B, su `list.value = ...` pisa los datos de B y la pantalla acaba
 * mostrando la historia clínica del paciente anterior — sin ningún error que lo
 * delate. Lo mismo con las cascadas (especie → raza, país → departamento →
 * municipio) al cambiar de valor rápido.
 *
 * ## Por qué no `AbortController` aquí
 *
 * Estos cargadores **comparten la promesa en vuelo** entre componentes: un
 * `Map` a nivel de módulo (o el store) devuelve la misma promesa a todo el que
 * pida el mismo id mientras está en curso. Abortarla no cancelaría "mi"
 * petición sino la de todos los suscriptores, incluido el que sí sigue
 * esperándola. Por eso el guardián es de resultado, no de transporte: la
 * petición termina, pero solo escribe quien sigue siendo el último.
 *
 * Donde la petición sí tiene un único dueño —búsqueda con debounce, paginación
 * servida— el patrón correcto es el `AbortController` que ya usan
 * `useOwnerSearch`, `useServerPaged` y `useInfiniteList`, porque además ahorra
 * el viaje.
 *
 * ## Uso
 *
 * ```ts
 * const { begin } = useLatestOnly()
 *
 * async function refresh(id: string) {
 *   const vigente = begin()
 *   loading.value = true
 *   try {
 *     const data = await load(id)
 *     if (!vigente()) return
 *     list.value = data
 *   } finally {
 *     if (vigente()) loading.value = false
 *   }
 * }
 * ```
 *
 * El `loading` también va guardado: si no, la respuesta tardía de A lo pondría
 * en `false` mientras la de B sigue en vuelo, y la pantalla diría "listo" con
 * los datos aún sin llegar.
 *
 * Cada secuencia independiente necesita su propia instancia. `useGeoCascade`
 * usa una para departamentos y otra para municipios: son carreras distintas.
 */
export function useLatestOnly() {
  let ticket = 0

  /**
   * Abre una carga y devuelve el predicado que responde si sigue siendo la
   * última. Llamar a `begin()` invalida automáticamente a las anteriores.
   */
  function begin(): () => boolean {
    const mine = ++ticket
    return () => mine === ticket
  }

  return { begin }
}

export interface RequestTurn {
  /** Pásalo al cliente de API para que la anterior se cancele de verdad. */
  signal: AbortSignal
  /** ¿Esta carga sigue siendo la última? Compruébalo tras cada `await`. */
  isCurrent: () => boolean
}

/**
 * Igual que `useLatestOnly`, pero además **cancela** la petición anterior.
 *
 * Es la variante correcta cuando la petición tiene un único dueño: la lectura
 * de un store con clave (sede, cuenta, filtros). Ahí no hay promesa compartida
 * que romper, así que abortar además de descartar ahorra el viaje — y en
 * `loadStock`, que recorre las páginas en bucle, ahorra todas las que queden.
 *
 * `isCurrent()` mira el turno **y** el aborto: una carga puede haber sido
 * cancelada sin que haya empezado otra (por ejemplo al desmontar).
 */
export function useCancellableLatest() {
  let inflight: AbortController | null = null
  let ticket = 0

  function begin(): RequestTurn {
    inflight?.abort()
    const ctrl = new AbortController()
    inflight = ctrl
    const mine = ++ticket
    return {
      signal: ctrl.signal,
      isCurrent: () => mine === ticket && !ctrl.signal.aborted,
    }
  }

  /** Corta lo que haya en vuelo sin abrir un turno nuevo (desmontaje, logout). */
  function cancel() {
    inflight?.abort()
    inflight = null
  }

  return { begin, cancel }
}
