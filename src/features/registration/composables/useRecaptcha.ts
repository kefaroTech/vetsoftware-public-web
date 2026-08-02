import { ref } from 'vue'

/**
 * Widget reCAPTCHA v2 (checkbox) con render explícito. Site key configurable por
 * `VITE_RECAPTCHA_SITE_KEY`; por defecto usa la llave de TEST de Google (siempre pasa) para dev.
 * Estado por-instancia (ref local): no es un singleton module-scoped de estado, solo cachea la carga
 * del script de Google, que es un recurso global legítimo.
 */
const SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ||
  '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

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
  let widgetId: number | null = null

  async function render(el: HTMLElement): Promise<void> {
    try {
      await loadScript()
      const grecaptcha = (window as any).grecaptcha
      widgetId = grecaptcha.render(el, { sitekey: SITE_KEY })
      ready.value = true
    } catch {
      failed.value = true
    }
  }

  function getToken(): string {
    if (widgetId === null) return ''
    return (window as any).grecaptcha?.getResponse(widgetId) ?? ''
  }

  function reset(): void {
    if (widgetId !== null) (window as any).grecaptcha?.reset(widgetId)
  }

  return { ready, failed, render, getToken, reset }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
