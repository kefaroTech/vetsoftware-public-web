/**
 * Un ancla de la misma página que mueve el **foco** además del scroll.
 *
 * <p>Con solo el `href="#id"`, el navegador desplaza la vista pero deja el foco
 * en el `<body>`: la siguiente tabulación devuelve al usuario a la barra de
 * navegación, muy por encima de lo que acaba de pedir ver. Eso es §2.4.3 *Focus
 * Order* roto por omisión, y no se nota con el ratón, que es por lo que
 * sobrevive tanto tiempo.
 *
 * <p>Está aquí y no copiado en cada componente porque la landing lo necesita en
 * cuatro sitios —el hero hacia los paquetes, la caja de arranque hacia los
 * paquetes, la nota de precio hacia la caja y el cierre hacia la caja—, y cuatro
 * copias de seis líneas es exactamente como una de ellas acaba sin el
 * `preventScroll` y nadie lo ve.
 *
 * <p>El destino tiene que llevar `tabindex="-1"` y anular su anillo de foco: es
 * el único caso donde `outline: none` está bien, porque ese nodo nunca recibe el
 * foco por teclado. `#planes` (`LandingPlans.vue`) y `#cotizador`
 * (`LandingCotizador.vue`) lo hacen.
 *
 * <p>El desplazamiento respeta `prefers-reduced-motion`, y tiene que hacerlo
 * AQUÍ. `base.css` ya declara `scroll-behavior: auto !important` bajo esa
 * preferencia —la guarda global del repositorio, escrita justo para esto—, pero
 * un `behavior` explícito en las opciones de `scrollIntoView()` **gana a la
 * propiedad CSS**: la opción es un argumento del método, no un valor calculado
 * del estilo, y ni siquiera un `!important` la alcanza. Así que la guarda
 * existía y este código la rodeaba sin querer, en las tres llamadas de la
 * landing. WCAG §2.3.3 *Animation from Interactions*, AAA.
 *
 * <p>No es un composable con estado y por eso no se llama `useX`: no hay nada
 * reactivo que compartir, es una función y punto.
 *
 * @param id
 *            el `id` del destino, **sin** almohadilla.
 * @param e
 *            el evento del clic. Se cancela solo si el destino existe; si no
 *            está —otra pantalla, un montaje parcial—, el navegador se queda con
 *            el ancla y el enlace sigue funcionando como HTML.
 */
export function irAAncla(id: string, e: Event): void {
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  el.scrollIntoView({ block: 'start', behavior: prefiereSinMovimiento() ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
}

/**
 * ¿El sistema pide que no se anime nada?
 *
 * <p>Se pregunta en cada clic y no una vez al cargar el módulo: la preferencia
 * se cambia en caliente desde el sistema operativo, y nadie recarga la página
 * después de activarla.
 *
 * <p>Si `matchMedia` no existe —un entorno de pruebas sin él—, el suelo es «no
 * hay preferencia declarada», que es exactamente lo que asume el CSS cuando la
 * consulta no casa.
 */
function prefiereSinMovimiento(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
