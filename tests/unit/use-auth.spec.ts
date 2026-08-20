import { describe, it, expect } from 'vitest'
import { sanitizeRedirect } from '@/features/auth/composables/useAuth'

/**
 * `sanitizeRedirect` decide si el `?redirect=` que el guard dejó en la URL de
 * login (issue #53) es una ruta interna segura. El valor viaja en la URL, así
 * que cualquiera puede fabricarlo: sin este filtro, `?redirect=` sería un open
 * redirect — el atacante manda el enlace de login legítimo, con el dominio y
 * el TLS reales, y decide a dónde aterriza la víctima después de autenticarse.
 */
describe('sanitizeRedirect', () => {
  it.each([['/dashboard/agenda'], ['/dashboard/agenda?tab=hoy']])(
    'acepta la ruta interna %s',
    (value) => {
      expect(sanitizeRedirect(value)).toBe(value)
    },
  )

  it.each([
    ['no es un string', 42],
    ['no es un string', null],
    ['no es un string', undefined],
    ['no empieza por "/"', 'evil.example.com'],
    ['URL absoluta', 'https://evil.example.com'],
    ['protocol-relative: el navegador la resuelve contra otro host', '//evil.example.com'],
    ['esquema disfrazado de ruta', '/x:javascript:alert(1)'],
  ])('rechaza cuando %s (%j)', (_motivo, value) => {
    expect(sanitizeRedirect(value)).toBeNull()
  })
})
