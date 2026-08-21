/**
 * Tipos de `window.grecaptcha` (reCAPTCHA v2, render explícito).
 *
 * Google sirve `api.js` como script suelto y no publica tipos, así que
 * `useRecaptcha.ts` los suplía con tres `any` y un `eslint-disable` de
 * `@typescript-eslint/no-explicit-any` a nivel de fichero. Ese apagado no
 * distinguía entre los tres `any` que hacían falta y cualquier `any` que se
 * colara después: la regla quedaba muerta para todo el módulo.
 *
 * Aquí se declara solo la superficie que el proyecto usa —`render`,
 * `getResponse` y `reset`—, no la API completa de Google. Si algún día se
 * necesita `execute` (v3) o los callbacks del widget, se añaden aquí y el
 * compilador seguirá diciendo la verdad.
 *
 * Sin `import`/`export`: es un script global, así que `interface Window` amplía
 * la del DOM directamente.
 */

/** Parámetros de `grecaptcha.render` para el checkbox de la v2. */
interface GrecaptchaRenderParameters {
  sitekey: string
  theme?: 'light' | 'dark'
  size?: 'normal' | 'compact'
  tabindex?: number
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

interface Grecaptcha {
  /** Pinta el widget en `container` y devuelve su id, que hay que guardar. */
  render(container: HTMLElement | string, parameters: GrecaptchaRenderParameters): number
  /** Token del widget, o cadena vacía si el usuario no ha superado el reto. */
  getResponse(widgetId?: number): string
  reset(widgetId?: number): void
}

interface Window {
  /**
   * Opcional a propósito: entre que se inserta el `<script>` y termina de
   * cargar, la propiedad no existe. Esa ventana es justo la que hacía falta
   * comprobar y la que el `any` escondía.
   */
  grecaptcha?: Grecaptcha
  /**
   * Callback global que `api.js?onload=…` invoca al terminar de cargar. El
   * nombre lo fija `CALLBACK_NAME` en `useRecaptcha.ts` y tiene que coincidir
   * con esta clave: son el mismo identificador visto desde los dos lados.
   */
  __vetRecaptchaOnLoad?: () => void
}
