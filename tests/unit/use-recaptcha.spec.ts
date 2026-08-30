import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exigir } from '../helpers/exigir'

/**
 * GUARDA DE VUE-10 — el widget falla en su sitio, nunca con un `TypeError` suelto.
 *
 * `useRecaptcha` tiene dos maneras distintas de no llegar a pintar el widget y las
 * dos tienen que acabar en el MISMO estado observable —`failed = true` con
 * `RECAPTCHA_LOAD_FAILED_MESSAGE`—, porque es ese estado el que el formulario de
 * registro consulta para bloquear el envío:
 *
 *  1. `grecaptcha.render` lanza (el clásico: la clave no vale para este dominio).
 *  2. El script de Google resuelve pero NO expone `window.grecaptcha`. Ocurre con
 *     un proxy corporativo o un bloqueador que sirve un 200 vacío. Antes de VUE-10
 *     el `any` daba por hecho que el objeto existía, así que esto reventaba con un
 *     `TypeError` fuera del `try`: la promesa de `render()` quedaba rechazada, el
 *     estado se quedaba en `failed = false` y el formulario dejaba enviar un
 *     registro que el backend iba a rechazar sin explicación.
 *
 * De ahí que cada caso afirme además que `render()` RESUELVE: que no se propague
 * la excepción es la mitad del arreglo.
 *
 * `vi.resetModules()` en cada caso porque `scriptPromise` es caché de módulo: sin
 * reiniciarlo, el segundo caso reutilizaría la promesa ya resuelta del primero y
 * no ejercitaría el camino del script.
 */

const CALLBACK_NAME = '__vetRecaptchaOnLoad'

type VentanaDePrueba = Window &
  typeof globalThis & {
    [CALLBACK_NAME]?: () => void
  }

const ventana = window as VentanaDePrueba

async function importarFresco() {
  vi.resetModules()
  return import('@/features/registration/composables/useRecaptcha')
}

/** El `<script>` que `loadScript` acaba de inyectar, para poder dispararle eventos. */
function scriptInyectado(): HTMLScriptElement | null {
  return document.head.querySelector<HTMLScriptElement>('script[src*="recaptcha"]')
}

beforeEach(() => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'clave-de-produccion')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  // `delete obj[clave]` con clave calculada deja el objeto en modo diccionario;
  // `Reflect.deleteProperty` hace lo mismo sin esa penalización.
  Reflect.deleteProperty(ventana, CALLBACK_NAME)
  scriptInyectado()?.remove()
})

describe('useRecaptcha().render — fallos de carga (VUE-10)', () => {
  it('cuando grecaptcha.render lanza, queda en fallo de carga y no propaga la excepción', async () => {
    const { useRecaptcha, RECAPTCHA_LOAD_FAILED_MESSAGE } = await importarFresco()
    vi.stubGlobal('grecaptcha', {
      render: () => {
        throw new Error('Invalid site key or not loaded in api.js')
      },
      getResponse: () => 'no-deberia-usarse',
      reset: () => {},
    })

    const captcha = useRecaptcha()
    await expect(captcha.render(document.createElement('div'))).resolves.toBeUndefined()

    expect(captcha.failed.value).toBe(true)
    expect(captcha.failureMessage.value).toBe(RECAPTCHA_LOAD_FAILED_MESSAGE)
    expect(captcha.ready.value).toBe(false)
    // Sin widget no hay token: el formulario no puede enviar un registro condenado.
    expect(captcha.getToken()).toBe('')
  })

  it('cuando el script resuelve SIN exponer window.grecaptcha, queda en fallo de carga', async () => {
    const { useRecaptcha, RECAPTCHA_LOAD_FAILED_MESSAGE } = await importarFresco()
    // Nada de `grecaptcha`: `loadScript` no puede tomar el atajo y va a inyectar el script.
    vi.stubGlobal('grecaptcha', undefined)

    const captcha = useRecaptcha()
    const enCurso = captcha.render(document.createElement('div'))

    // El script se inyectó y registró su callback de carga.
    expect(scriptInyectado(), 'no se inyectó el script de reCAPTCHA').not.toBeNull()
    const alCargar = ventana[CALLBACK_NAME]
    expect(alCargar, `el script no registró window.${CALLBACK_NAME}`).toBeTypeOf('function')

    // El script "carga" —Google responde 200— pero no deja nada en `window`.
    exigir(alCargar, 'alCargar')()

    // Este `resolves` es la regresión: antes de VUE-10 la promesa se RECHAZABA con
    // un TypeError («Cannot read properties of undefined») y el estado se quedaba
    // sin tocar, así que el formulario seguía creyendo que el captcha iba bien.
    await expect(enCurso).resolves.toBeUndefined()

    expect(captcha.failed.value).toBe(true)
    expect(captcha.failureMessage.value).toBe(RECAPTCHA_LOAD_FAILED_MESSAGE)
    expect(captcha.ready.value).toBe(false)
    expect(captcha.getToken()).toBe('')
  })

  it('cuando el script ni siquiera carga (error de red), queda en fallo de carga', async () => {
    const { useRecaptcha, RECAPTCHA_LOAD_FAILED_MESSAGE } = await importarFresco()
    vi.stubGlobal('grecaptcha', undefined)

    const captcha = useRecaptcha()
    const enCurso = captcha.render(document.createElement('div'))

    const script = scriptInyectado()
    expect(script).not.toBeNull()
    exigir(script, 'script').dispatchEvent(new Event('error'))

    await expect(enCurso).resolves.toBeUndefined()
    expect(captcha.failed.value).toBe(true)
    expect(captcha.failureMessage.value).toBe(RECAPTCHA_LOAD_FAILED_MESSAGE)
    expect(captcha.ready.value).toBe(false)
  })

  it('`reset()` sobre un widget que nunca se pintó no revienta', async () => {
    const { useRecaptcha } = await importarFresco()
    vi.stubGlobal('grecaptcha', undefined)

    const captcha = useRecaptcha()
    const enCurso = captcha.render(document.createElement('div'))
    ventana[CALLBACK_NAME]?.()
    await enCurso

    expect(() => captcha.reset()).not.toThrow()
  })
})
