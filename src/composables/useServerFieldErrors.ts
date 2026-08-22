import { ref } from 'vue'
import { getProblemDetailFieldErrors } from '@/services/http/http.client'

/**
 * FORM-11 — errores por campo devueltos por el backend en el `ProblemDetail`.
 *
 * `getProblemDetailFieldErrors` existe desde siempre en `http.client.ts` y hasta
 * ahora solo lo consumían dos pantallas (`LoginForm`, `RegisterForm`). En todo
 * lo demás, los errores por campo del servidor —los únicos que conocen la
 * unicidad de un código, un cupo o una regla de negocio— se aplastaban en un
 * toast efímero: el usuario leía «No se pudo guardar el producto», el toast se
 * iba, y el campo que el servidor había rechazado seguía sin marcar.
 *
 * Este composable generaliza lo que `LoginForm` hacía a mano. El error del
 * servidor se muestra JUNTO al campo y SIN depender de `touched`: el usuario ya
 * envió, no hay validación prematura que evitar.
 *
 * `map` traduce el nombre del campo del backend al del formulario cuando no
 * coinciden (`productCategory.id` → `productCategoryId`). Hoy el backend emite
 * `errors: [{ field, message }]` con nombres que ya casan con los del front en
 * la mayoría de los recursos, así que el mapa suele sobrar.
 *
 * NO toca `http.client.ts`, que es gemelo TR-02: todo vive aquí.
 */
export function useServerFieldErrors<K extends string>(
  /** Claves de campo que el formulario sabe pintar. Es lo que hace segura la §4.3. */
  knownFields: readonly K[],
  map: Partial<Record<string, K>> = {},
) {
  const serverErrors = ref<Partial<Record<K, string>>>({})

  /**
   * @returns `true` solo si el error traía errores por campo Y al menos uno
   * mapeó a un campo que este formulario pinta. Es deliberado: si el backend
   * devuelve `productCategory.id` y el formulario usa `productCategoryId`, el
   * mensaje se guardaría bajo una clave que nadie lee y DESAPARECERÍA en
   * silencio — peor que hoy, porque además se habría suprimido el toast. Con
   * este contrato el llamador solo se calla el toast cuando de verdad hay algo
   * pintado junto a un campo.
   */
  function capture(e: unknown): boolean {
    const raw = getProblemDetailFieldErrors(e)
    const out: Partial<Record<K, string>> = {}
    let mapped = false
    for (const [field, message] of Object.entries(raw)) {
      const key = (map[field] ?? field) as K
      if (!knownFields.includes(key)) continue
      out[key] = message
      mapped = true
    }
    serverErrors.value = out
    return mapped
  }

  /** Va en el `watch(() => props.open)` del modal, junto al `resetTouched()`. */
  function clear() {
    serverErrors.value = {}
  }

  /** Al editar el campo, su error de servidor deja de ser cierto. */
  function clearField(key: K) {
    if (serverErrors.value[key] === undefined) return
    // Se reconstruye en vez de `delete next[key]`: borrar una clave calculada
    // deja el objeto en modo diccionario y ESLint lo rechaza
    // (`no-dynamic-delete`). El filtro produce el mismo objeto sin la clave.
    const next: Partial<Record<K, string>> = {}
    for (const entry of Object.entries(serverErrors.value) as [K, string][]) {
      if (entry[0] !== key) next[entry[0]] = entry[1]
    }
    serverErrors.value = next
  }

  return { serverErrors, capture, clear, clearField }
}
