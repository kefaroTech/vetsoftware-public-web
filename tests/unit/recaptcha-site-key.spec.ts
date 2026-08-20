import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RECAPTCHA_LOAD_FAILED_MESSAGE,
  RECAPTCHA_MISSING_KEY_MESSAGE,
  resolveSiteKey,
  useRecaptcha,
} from '@/features/registration/composables/useRecaptcha'

const DEV_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

describe('resolveSiteKey', () => {
  it('cae a la llave de test de Google solo en desarrollo', () => {
    expect(resolveSiteKey(undefined, true)).toBe(DEV_TEST_SITE_KEY)
    expect(resolveSiteKey('', true)).toBe(DEV_TEST_SITE_KEY)
    expect(resolveSiteKey('   ', true)).toBe(DEV_TEST_SITE_KEY)
  })

  it('no simula la protección fuera de desarrollo: sin variable no hay llave', () => {
    expect(resolveSiteKey(undefined, false)).toBe('')
    expect(resolveSiteKey('', false)).toBe('')
    expect(resolveSiteKey('   ', false)).toBe('')
  })

  it('usa la llave configurada en los dos casos', () => {
    expect(resolveSiteKey('clave-real', true)).toBe('clave-real')
    expect(resolveSiteKey('clave-real', false)).toBe('clave-real')
    expect(resolveSiteKey('  clave-real  ', false)).toBe('clave-real')
  })
})

describe('useRecaptcha().render', () => {
  let rendered: { sitekey: string }[]

  beforeEach(() => {
    rendered = []
    // `grecaptcha` ya presente: `loadScript` sale por el atajo y no toca la red.
    vi.stubGlobal('grecaptcha', {
      render: (_el: HTMLElement, opts: { sitekey: string }) => {
        rendered.push(opts)
        return 0
      },
      getResponse: () => 'token-de-prueba',
      reset: () => {},
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('en desarrollo y sin variable renderiza con la llave de test', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', '')

    const captcha = useRecaptcha()
    await captcha.render(document.createElement('div'))

    expect(rendered).toEqual([{ sitekey: DEV_TEST_SITE_KEY }])
    expect(captcha.ready.value).toBe(true)
    expect(captcha.failed.value).toBe(false)
    expect(captcha.failureMessage.value).toBeNull()
  })

  it('fuera de desarrollo y sin variable no renderiza y queda en estado de fallo', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', '')

    const captcha = useRecaptcha()
    await captcha.render(document.createElement('div'))

    expect(rendered).toEqual([])
    expect(captcha.ready.value).toBe(false)
    expect(captcha.failed.value).toBe(true)
    expect(captcha.failureMessage.value).toBe(RECAPTCHA_MISSING_KEY_MESSAGE)
    // Sin widget no hay token: el formulario no puede enviar un registro que el backend
    // rechazaría igualmente.
    expect(captcha.getToken()).toBe('')
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('VITE_RECAPTCHA_SITE_KEY'))
  })

  it('con variable configurada usa esa llave, en desarrollo y fuera de él', async () => {
    for (const isDev of [true, false]) {
      rendered = []
      vi.stubEnv('DEV', isDev)
      vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'clave-de-produccion')

      const captcha = useRecaptcha()
      await captcha.render(document.createElement('div'))

      expect(rendered).toEqual([{ sitekey: 'clave-de-produccion' }])
      expect(captcha.ready.value).toBe(true)
      expect(captcha.failed.value).toBe(false)
    }
  })

  it('distingue el fallo de carga del script del fallo de configuración', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'clave-de-produccion')
    vi.stubGlobal('grecaptcha', {
      render: () => {
        throw new Error('script roto')
      },
    })

    const captcha = useRecaptcha()
    await captcha.render(document.createElement('div'))

    expect(captcha.ready.value).toBe(false)
    expect(captcha.failed.value).toBe(true)
    expect(captcha.failureMessage.value).toBe(RECAPTCHA_LOAD_FAILED_MESSAGE)
  })
})
