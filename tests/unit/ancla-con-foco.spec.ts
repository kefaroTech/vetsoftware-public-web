import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { irAAncla } from '@/features/landing/composables/anclaConFoco'

/**
 * EL DESPLAZAMIENTO DE LA LANDING RESPETA «REDUCIR MOVIMIENTO».
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * `base.css` declara `scroll-behavior: auto !important` bajo
 * `prefers-reduced-motion: reduce`. Esa guarda existe **justo para esto**, y sin
 * embargo `irAAncla` la rodeaba sin querer: pasaba `behavior: 'smooth'` en las
 * opciones de `scrollIntoView()`, y un valor explícito en las opciones gana a la
 * propiedad CSS —es un argumento del método, no un valor calculado del estilo—,
 * así que ni el `!important` lo alcanzaba. Tres enlaces de la landing (el hero
 * hacia los paquetes, la nota de precio hacia la caja, el cierre hacia la caja)
 * animaban el desplazamiento de una página entera a quien había pedido por
 * sistema que no se animara nada. Para quien tiene trastorno vestibular eso no
 * es una molestia estética: es náusea.
 *
 * ── Por qué están las DOS ramas ────────────────────────────────────────────
 * Una implementación que **nunca** desplace con suavidad —o que no desplace en
 * absoluto— también pasaría el caso de «reducir movimiento» si fuera el único
 * escrito. El caso sin preferencia es el que impide arreglar el defecto
 * apagando la función.
 *
 * ── Por qué es unitaria y no de Playwright ─────────────────────────────────
 * `e2e/movimiento-reducido.spec.ts` existe y corre en otro trabajo, con servidor
 * y navegador; esta comprobación entra en `npm run test:unit`, que es la puerta
 * que el CI mira en cada cambio.
 */

const scrollIntoView = vi.fn<(opciones?: boolean | ScrollIntoViewOptions) => void>()
const scrollIntoViewOriginal = Element.prototype.scrollIntoView
const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia')

/** Declara la preferencia del sistema tal como la contestaría el navegador. */
function declararPreferencia(reducir: boolean): void {
  window.matchMedia = (consulta: string) => ({
    matches: consulta.includes('prefers-reduced-motion: reduce') ? reducir : false,
    media: consulta,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

/** El comportamiento con el que se pidió el desplazamiento en la última llamada. */
function comportamientoUsado(): ScrollBehavior | undefined {
  expect(scrollIntoView, 'se pidió el desplazamiento exactamente una vez').toHaveBeenCalledTimes(1)
  const opciones = scrollIntoView.mock.calls[0]?.[0]
  if (typeof opciones !== 'object' || opciones === null) return undefined
  return opciones.behavior
}

beforeEach(() => {
  scrollIntoView.mockReset()
  Element.prototype.scrollIntoView = scrollIntoView
  document.body.innerHTML = '<section id="cotizador" tabindex="-1"></section>'
})

afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoViewOriginal
  if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal)
  else Reflect.deleteProperty(window, 'matchMedia')
  document.body.innerHTML = ''
})

describe('irAAncla y la preferencia de movimiento reducido', () => {
  it('con «reducir movimiento» NO anima el desplazamiento', () => {
    // El caso del defecto. Con `behavior: 'smooth'` fijo en las opciones, esto
    // es lo único que se pone rojo.
    declararPreferencia(true)

    irAAncla('cotizador', new Event('click', { cancelable: true }))

    expect(comportamientoUsado()).toBe('auto')
  })

  it('sin preferencia declarada SÍ lo anima: el arreglo no es apagar la función', () => {
    declararPreferencia(false)

    irAAncla('cotizador', new Event('click', { cancelable: true }))

    expect(comportamientoUsado()).toBe('smooth')
  })

  it('sin `matchMedia` cae al mismo suelo que el CSS: no hay preferencia', () => {
    // Un entorno sin `matchMedia` no es «el usuario pidió no moverse»: es «no se
    // sabe». Tratarlo como preferencia activa apagaría la animación para todo el
    // mundo por un detalle del entorno.
    Reflect.deleteProperty(window, 'matchMedia')

    irAAncla('cotizador', new Event('click', { cancelable: true }))

    expect(comportamientoUsado()).toBe('smooth')
  })
})

describe('irAAncla mueve el foco, que es para lo que existe', () => {
  it('enfoca el destino sin volver a desplazar, con y sin preferencia', () => {
    for (const reducir of [true, false]) {
      scrollIntoView.mockReset()
      declararPreferencia(reducir)
      const destino = document.getElementById('cotizador')
      const focus = vi.fn<(opciones?: FocusOptions) => void>()
      if (destino) destino.focus = focus

      const evento = new Event('click', { cancelable: true })
      irAAncla('cotizador', evento)

      expect(evento.defaultPrevented, 'el ancla nativa se cancela: la mueve esta función').toBe(
        true,
      )
      // `preventScroll`: el desplazamiento ya lo hizo `scrollIntoView`, y dejar
      // que el foco lo repita produce un segundo salto —animado o no— sobre el
      // primero.
      expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    }
  })

  it('si el destino no está en el documento, el enlace sigue siendo un enlace', () => {
    declararPreferencia(true)
    const evento = new Event('click', { cancelable: true })

    irAAncla('no-existe', evento)

    expect(evento.defaultPrevented, 'sin destino no se cancela: lo resuelve el navegador').toBe(
      false,
    )
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
