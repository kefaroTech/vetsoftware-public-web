import { nextTick } from 'vue'

/**
 * Marcadores DOM que dejan los primitivos de formulario cuando un campo es inválido:
 * - `aria-invalid="true"` / `.invalid` → BaseInput, BaseSelect, BaseTextarea, DateInput…
 * - `p.error` → mensaje de error que pinta BaseField bajo el campo.
 */
const ERROR_SELECTOR = '[aria-invalid="true"], .invalid, p.error'

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

/**
 * Tras una validación fallida, centra verticalmente el scroll sobre el PRIMER campo
 * requerido faltante (el que esté más arriba en la pantalla) con scroll suave.
 *
 * Sin `root`, se acota automáticamente al modal abierto más reciente (`.overlay` de
 * ModalShell) si lo hay; si no, al documento. Así el mismo `scrollToFirstError()` sirve
 * tanto para modales como para pantallas del wizard sin pasar contenedores.
 *
 * @returns `true` si encontró un campo inválido y desplazó hacia él.
 */
export async function scrollToFirstError(root?: ParentNode): Promise<boolean> {
  // Esperamos a que Vue pinte el estado inválido (bordes rojos + mensajes) antes de medir.
  await nextTick()

  let scope: ParentNode = document
  if (root) {
    scope = root
  } else {
    const overlays = document.querySelectorAll<HTMLElement>('.overlay')
    if (overlays.length > 0) scope = overlays[overlays.length - 1]
  }

  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(ERROR_SELECTOR))
    // El mensaje vive en <p.error>; centramos sobre el .field completo (label + input + error).
    .map((el) => (el.matches('p.error') ? (el.closest<HTMLElement>('.field') ?? el) : el))
    .filter(isVisible)

  if (candidates.length === 0) return false

  // "Primer campo faltante" = el más arriba en la pantalla (menor top).
  const target = candidates.reduce((top, el) =>
    el.getBoundingClientRect().top < top.getBoundingClientRect().top ? el : top,
  )

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}
