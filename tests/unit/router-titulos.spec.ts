import { describe, it, expect } from 'vitest'
import router from '@/router'

/**
 * §2.4.2 Page Titled (A) — ninguna pantalla se publica sin nombre de pestaña.
 *
 * <p>El `afterEach` del router repone `document.title` con `meta.title` y, si no
 * lo hay, con el título del documento. Ese respaldo evita que el título anterior
 * se quede pegado, pero no cumple §2.4.2: deja a la pantalla llamándose como la
 * aplicación, que es exactamente lo que el criterio prohíbe cuando hay ocho
 * pestañas abiertas. La única forma de que no se escape ninguna es contarlas
 * todas aquí, porque escribir un caso de interfaz por ruta no lo hace nadie.
 *
 * <p>Se mira el `meta.title` PROPIO del registro y no el heredado del padre: una
 * pantalla que se conforme con el título de su sección se llamaría igual que sus
 * hermanas, y distinguirlas es justo lo que el criterio pide.
 */
describe('router: toda ruta con pantalla propia declara su título de pestaña', () => {
  /**
   * Un registro con `redirect` no pinta nada: solo reenvía. Es el caso de
   * `suscripcion` (`{ path: '', redirect }`, que manda a la primera subpantalla
   * permitida) y del comodín `/:pathMatch(.*)*`. Exigirles título los pondría en
   * rojo sin que exista defecto, y el título que acaba en la pestaña es el del
   * destino.
   */
  const conPantallaPropia = router
    .getRoutes()
    .filter((registro) => registro.name != null && registro.redirect == null)

  it('hay rutas que contar, o esta guarda no está midiendo nada', () => {
    // Sin esto, un cambio que dejara `getRoutes()` vacío —o el filtro mal
    // escrito— haría pasar el bucle de abajo sin recorrer un solo registro.
    expect(conPantallaPropia.length).toBeGreaterThan(40)
  })

  it('ninguna se queda sin `meta.title`', () => {
    const sinTitulo = conPantallaPropia
      .filter((registro) => typeof registro.meta.title !== 'string' || !registro.meta.title)
      .map((registro) => `${String(registro.name)} (${registro.path})`)

    expect(
      sinTitulo,
      'estas rutas se llamarían «Lumbre» en la pestaña, igual que todas las demás (WCAG 2.2 §2.4.2)',
    ).toEqual([])
  })

  it('ningún título se repite: dos pestañas iguales no se distinguen', () => {
    const porTitulo = new Map<string, string[]>()
    for (const registro of conPantallaPropia) {
      const titulo = String(registro.meta.title)
      porTitulo.set(titulo, [...(porTitulo.get(titulo) ?? []), String(registro.name)])
    }

    const repetidos = [...porTitulo.entries()].filter(([, rutas]) => rutas.length > 1)
    expect(repetidos).toEqual([])
  })
})
