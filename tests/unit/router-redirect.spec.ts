import { describe, it, expect, beforeEach } from 'vitest'
import router from '@/router'

/**
 * El destino tras el login (issue #53). Antes el guard mandaba a `/login` sin
 * dejar rastro de a dónde iba el usuario, así que tras autenticar siempre
 * aterrizaba en el home: abrir un enlace profundo sin sesión (una factura, una
 * ficha) obligaba a navegar de nuevo a mano.
 *
 * `sanitizeRedirect` (en `useAuth.ts`) es lo que hace seguro reintroducir este
 * valor, que viaja en la URL y por tanto no es de fiar: ver `use-auth.spec.ts`.
 */
describe('router: conserva el destino al mandar a login', () => {
  beforeEach(async () => {
    localStorage.clear()
    // Vuelve a un punto neutral entre pruebas; el router es un singleton.
    await router.replace({ path: '/' })
  })

  it('recuerda la ruta protegida a la que el usuario quería llegar', async () => {
    await router.push('/dashboard/agenda')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard/agenda')
  })

  it('conserva la ruta profunda completa, con todos sus segmentos', async () => {
    await router.push('/dashboard/consulta/historial/9/mascotas')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe(
      '/dashboard/consulta/historial/9/mascotas',
    )
  })

  it('no republica la cadena de consulta de la ruta protegida en la URL de login', async () => {
    // El guard es infraestructura genérica: no sabe qué parámetro de qué feature
    // es un secreto. En este monorepo `token` ya nombra a cuatro distintos
    // (restablecer contraseña, aceptar invitación, aprobar acceso, recuperar
    // propuesta), así que recorta la query entera. Reenviarla dejaría el secreto
    // en la barra de direcciones del login, en el historial y en el `Referer`.
    const SECRETO = 's3cr3t-de-recuperar-propuesta'

    await router.push(`/dashboard/agenda?token=${SECRETO}&vista=semana`)

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard/agenda')

    // La URL de login tal y como acaba en el navegador. Se afirma sobre la forma
    // cruda Y sobre la decodificada: sin el arreglo el rojo se ve escapado
    // (`?redirect=%2Fdashboard%2Fagenda%3Ftoken%3D…`), y un `toContain` sobre
    // una sola de las dos formas puede pasar por alto la otra.
    const urlLogin = router.currentRoute.value.fullPath
    for (const forma of [urlLogin, decodeURIComponent(urlLogin)]) {
      expect(forma).not.toContain('token')
      expect(forma).not.toContain(SECRETO)
      expect(forma).not.toContain('vista')
    }
  })
})
