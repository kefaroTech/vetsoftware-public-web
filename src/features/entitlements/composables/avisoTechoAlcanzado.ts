import { getTraceId } from '@/services/http/http.client'
import { useToastStore } from '@/stores/toast.store'
import { isCapacityLimitExceeded } from '@/composables/useCapacityLimitError'

const TRACE_DURATION = 9000

/**
 * El 409 `CAPACITY_LIMIT_EXCEEDED` de un módulo gratis-con-techo se avisa con
 * `useModuloEstado().techoAlcanzadoTexto`, no con el `detail` genérico del `ProblemDetail`.
 * `useCapacityLimitError.ts` sigue siendo el único sitio que sabe leer el código del error; esto
 * solo decide qué hacer una vez que ya lo dijo.
 *
 * <p>Conserva el `X-Trace-Id` con el mismo mecanismo que `useToast().errorFrom`, que aquí no se
 * puede reutilizar tal cual porque su mensaje sale siempre de `getProblemDetailMessage`.
 *
 * <p>Devuelve `true` cuando ya avisó: el llamador no debe seguir con su manejo genérico.
 */
export function avisarTechoAlcanzado(error: unknown, texto: string | null | undefined): boolean {
  if (!texto || !isCapacityLimitExceeded(error)) return false
  useToastStore().push(
    'error',
    'Llegaste al tope gratuito',
    texto,
    TRACE_DURATION,
    getTraceId(error),
  )
  return true
}
