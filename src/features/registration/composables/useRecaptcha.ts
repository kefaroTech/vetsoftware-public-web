import { ref } from 'vue'

/**
 * Widget reCAPTCHA v2 (checkbox) con render explícito. La site key sale de
 * `VITE_RECAPTCHA_SITE_KEY`.
 *
 * SOLO en desarrollo (`import.meta.env.DEV`) se cae a la llave de TEST pública de Google, que
 * aprueba siempre. Un build de producción sin esa variable NO simula la protección: antes lo
 * hacía y el resultado era el peor de los dos mundos — el widget se pintaba en verde, el usuario
 * creía haber pasado la verificación y el backend rechazaba el token contra su secreto de
 * producción, así que ningún registro nuevo llegaba a crearse y nadie veía por qué. Falla
 * cerrado, sí, pero en silencio y engañando.
 *
 * Ahora falla visible: sin site key utilizable el widget no se renderiza, `failed` queda en
 * `true` con un `failureMessage` explicativo y el formulario que lo consume debe bloquear el
 * envío. El fallo se queda acotado al widget — no se lanza nada desde el cuerpo del módulo,
 * porque eso tumbaría la aplicación entera al importar, incluso en pantallas sin captcha.
 *
 * Estado por-instancia (ref local): no es un singleton module-scoped de estado, solo cachea la carga
 * del script de Google, que es un recurso global legítimo.
 */

/** Llave de TEST pública de Google (siempre aprueba). Exclusiva de desarrollo. */
const DEV_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' // gitleaks:allow llave de TEST publica de Google, publicada en su documentacion: no protege ningun recurso

/** Mensaje de un build publicado sin `VITE_RECAPTCHA_SITE_KEY`: no es un problema del usuario. */
export const RECAPTCHA_MISSING_KEY_MESSAGE =
  'La verificación anti-bots no está configurada en este despliegue, así que no es posible crear la cuenta. Avisa al soporte de VetSoftware.'

/** Mensaje del caso clásico: la clave existe pero el script de Google no llegó a cargar. */
export const RECAPTCHA_LOAD_FAILED_MESSAGE =
  'No se pudo cargar el reCAPTCHA. Verifica tu conexión y recarga la página.'

/**
 * Resuelve la site key efectiva. Devuelve cadena vacía cuando no hay ninguna utilizable, que es
 * exactamente el caso de un build de producción sin la variable configurada.
 */
export function resolveSiteKey(configured: string | undefined, isDev: boolean): string {
  const trimmed = configured?.trim()
  if (trimmed) return trimmed
  return isDev ? DEV_TEST_SITE_KEY : ''
}

const CALLBACK_NAME = '__vetRecaptchaOnLoad'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  const g = (window as unknown as { grecaptcha?: { render?: unknown } }).grecaptcha
  if (g && typeof g.render === 'function') return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    ;(window as unknown as Record<string, unknown>)[CALLBACK_NAME] = () => resolve()
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?onload=${CALLBACK_NAME}&render=explicit`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('No se pudo cargar reCAPTCHA'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useRecaptcha() {
  const ready = ref(false)
  const failed = ref(false)
  const failureMessage = ref<string | null>(null)
  let widgetId: number | null = null

  async function render(el: HTMLElement): Promise<void> {
    const siteKey = resolveSiteKey(
      import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined,
      import.meta.env.DEV,
    )

    if (!siteKey) {
      console.error(
        '[reCAPTCHA] Falta la variable de entorno VITE_RECAPTCHA_SITE_KEY en este build. ' +
          'No se renderiza el widget y el registro queda bloqueado: fuera de desarrollo no se ' +
          'usa la llave de test de Google, porque el backend rechazaría todos sus tokens.',
      )
      failed.value = true
      failureMessage.value = RECAPTCHA_MISSING_KEY_MESSAGE
      return
    }

    try {
      await loadScript()
      const grecaptcha = (window as any).grecaptcha
      widgetId = grecaptcha.render(el, { sitekey: siteKey })
      ready.value = true
    } catch {
      failed.value = true
      failureMessage.value = RECAPTCHA_LOAD_FAILED_MESSAGE
    }
  }

  function getToken(): string {
    if (widgetId === null) return ''
    return (window as any).grecaptcha?.getResponse(widgetId) ?? ''
  }

  function reset(): void {
    if (widgetId !== null) (window as any).grecaptcha?.reset(widgetId)
  }

  return { ready, failed, failureMessage, render, getToken, reset }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
