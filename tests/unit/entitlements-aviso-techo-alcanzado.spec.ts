import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { avisarTechoAlcanzado } from '@/features/entitlements/composables/avisoTechoAlcanzado'
import { useToastStore } from '@/stores/toast.store'

/**
 * El 409 `CAPACITY_LIMIT_EXCEEDED` de un módulo gratis-con-techo se avisa con el texto del techo,
 * no con el `detail` genérico del `ProblemDetail`, y conserva el trace id.
 */

function httpError(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { data, status, statusText: '', headers, config } as AxiosResponse
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    config,
    null,
    response,
  )
}

describe('avisarTechoAlcanzado', () => {
  it('avisa con el texto específico y conserva el X-Trace-Id, y devuelve true', () => {
    const error = httpError(
      409,
      { code: 'CAPACITY_LIMIT_EXCEEDED', detail: 'Cupo agotado' },
      { 'x-trace-id': 'abc123' },
    )
    const texto =
      'Llegaste al tope gratuito de mascotas este mes (100). Amplíalo para seguir creando.'

    const resultado = avisarTechoAlcanzado(error, texto)

    expect(resultado).toBe(true)
    const store = useToastStore()
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]?.title).toBe('Llegaste al tope gratuito')
    expect(store.toasts[0]?.message).toBe(texto)
    expect(store.toasts[0]?.traceId).toBe('abc123')
  })

  it('un código distinto no avisa y devuelve false', () => {
    const error = httpError(409, { code: 'SUBMODULE_READ_ONLY' })

    expect(avisarTechoAlcanzado(error, 'texto cualquiera')).toBe(false)
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('sin texto calculado no avisa, aunque el código coincida', () => {
    const error = httpError(409, { code: 'CAPACITY_LIMIT_EXCEEDED' })

    expect(avisarTechoAlcanzado(error, null)).toBe(false)
    expect(useToastStore().toasts).toHaveLength(0)
  })
})
