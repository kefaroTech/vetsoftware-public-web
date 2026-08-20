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

  it('conserva también la query string de la ruta protegida', async () => {
    await router.push('/dashboard/consulta/historial/9/mascotas')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe(
      '/dashboard/consulta/historial/9/mascotas',
    )
  })
})
