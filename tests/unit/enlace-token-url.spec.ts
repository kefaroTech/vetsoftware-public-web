import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import RestablecerContrasenaView from '@/features/auth/views/RestablecerContrasenaView.vue'
import VerifyEmailView from '@/features/registration/views/VerifyEmailView.vue'
import { elemento, exigir } from '../helpers/exigir'

/**
 * LAS DOS CREDENCIALES QUE SE QUEDABAN EN LA BARRA DE DIRECCIONES.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * `RestablecerContrasenaView` y `VerifyEmailView` sacaban su token de
 * `route.query`, lo usaban, y lo dejaban ahí. El de restablecimiento es el peor
 * de los dos: hasta que se consume, quien lo tenga puede FIJAR la contraseña de
 * la cuenta. Se quedaba en el historial del navegador —para siempre, y para el
 * siguiente que use el equipo—, en cualquier captura de esa pestaña y en el
 * `Referer` de la siguiente navegación. El tercer lector de token del front, el
 * del asistente, sí lo limpia; a estos dos nadie les había aplicado el mismo
 * razonamiento.
 *
 * ── Por qué con un router de verdad y no con un doble ──────────────────────
 * Lo que hay que afirmar es sobre la URL FINAL, no sobre qué método se llamó. Un
 * `vi.fn()` en lugar de `router.replace` dejaría pasar un `replace` que reponga
 * el token o un destino mal construido: el doble diría «hubo replace» y la barra
 * seguiría enseñando la credencial.
 *
 * Y la historia es la de `jsdom`, no `createMemoryHistory`: la de memoria no
 * lleva la cuenta de entradas —su `state.position` no es un número—, así que con
 * ella «el historial no creció» no se puede afirmar, solo suponer. `jsdom` sí
 * implementa `history.pushState`/`replaceState` y su `history.length`, que es
 * exactamente lo que distingue añadir de sustituir.
 *
 * ── Cómo muerden estos casos ───────────────────────────────────────────────
 *  · Si `replace` se convierte en `push`, «el historial no creció» falla. Esa
 *    diferencia no es de estilo: con `push`, «atrás» devuelve al usuario a la URL
 *    con el token dentro y la entrada se queda ahí para siempre.
 *  · Si la limpieza se mueve a DESPUÉS de consumir el token, falla el caso que
 *    fotografía la URL desde dentro de la petición — que es justo el rato en que
 *    la credencial está expuesta, y para siempre si la petición se cuelga.
 *  · Si al limpiar se pierde el token, fallan los casos que afirman con qué se
 *    llamó al backend, el envío de la contraseña nueva y los dos desenlaces de
 *    enlace inválido.
 *  · Si se borra la cadena de consulta entera en vez de solo el token, falla el
 *    caso que conserva `?origen=correo`.
 */

const TOKEN = 'a'.repeat(43)

const validateResetToken = vi.fn<(token: string) => Promise<boolean>>()
const resetPassword = vi.fn<(token: string, password: string) => Promise<void>>()

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    validateResetToken: (token: string) => validateResetToken(token),
    resetPassword: (token: string, password: string) => resetPassword(token, password),
  },
}))

const verifyEmail = vi.fn<(token: string) => Promise<void>>()

vi.mock('@/features/registration/api/registration.api', () => ({
  registrationApi: { verifyEmail: (token: string) => verifyEmail(token) },
}))

/**
 * Los dobles van como opciones de componente y NO con `defineComponent`.
 *
 * No es preferencia: `vue/one-component-per-file` cuenta las llamadas a
 * `defineComponent`, y un fichero de pruebas necesita varios dobles. Sacarlos a
 * un módulo aparte solo mudaría el aviso de sitio, y silenciarlo con un
 * `eslint-disable` sería apagar una regla real por comodidad de la prueba.
 */

/** Marco de pantalla pública reducido a lo único que aquí importa: sus huecos. */
const MarcoStub: Component = {
  name: 'PublicLayout',
  template: '<div><slot name="topRight" /><slot /></div>',
}

/** Cualquier envoltorio que solo rodea contenido y no decide nada de esto. */
const PasaSlot: Component = { template: '<div><slot /></div>' }

/**
 * `AuthInput` con `v-model` de verdad, para poder escribir en el formulario
 * desde el DOM en vez de manosear el estado interno del componente.
 */
const EntradaStub: Component = {
  name: 'AuthInput',
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
}

/** Destino de ruta sin contenido: aquí se mide la barra, no lo que se pinte. */
const Vacio: Component = { template: '<div />' }

/**
 * Un router real, sobre la historia de jsdom, con las rutas que las dos
 * pantallas nombran.
 *
 * Los destinos son componentes vacíos a propósito: lo que se mide aquí es la
 * barra de direcciones, no lo que se pinte al llegar.
 */
function crearRouter(): Router {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'landing', component: Vacio },
      { path: '/login', name: 'login', component: Vacio },
      { path: '/signup', name: 'signup', component: Vacio },
      { path: '/recuperar-contrasena', name: 'recuperar-contrasena', component: Vacio },
      { path: '/restablecer-contrasena', name: 'restablecer-contrasena', component: Vacio },
      { path: '/verify-email', name: 'verify-email', component: Vacio },
    ],
  })
}

/**
 * Cuántas entradas tiene la historia de sesión.
 *
 * Es la cosa misma, no un recuento propio: `history.pushState` la sube y
 * `history.replaceState` la deja donde estaba, que es literalmente la diferencia
 * que estas pruebas vigilan. Se mide siempre como delta —jsdom conserva la
 * historia entre casos del mismo fichero— y nunca como valor absoluto.
 */
function entradasDeHistorial(): number {
  return window.history.length
}

/** Deja el router en `url`, listo para montar la pantalla que la atiende. */
async function enLaUrl(url: string): Promise<Router> {
  const router = crearRouter()
  await router.replace(url)
  await router.isReady()
  return router
}

function montar(vista: typeof VerifyEmailView, router: Router): VueWrapper {
  return mount(vista, {
    global: {
      plugins: [router],
      stubs: {
        PublicLayout: MarcoStub,
        PrimaryButton: PasaSlot,
        AuthField: PasaSlot,
        AuthInput: EntradaStub,
        'v-icon': true,
      },
    },
  })
}

/** Abre la pantalla en `url` y espera a que su `onMounted` termine. */
async function abrir(vista: typeof VerifyEmailView, url: string) {
  const router = await enLaUrl(url)
  const entradasIniciales = entradasDeHistorial()
  const wrapper = montar(vista, router)
  await flushPromises()
  return { router, wrapper, entradasIniciales }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('restablecer contraseña: el token no se queda en la URL', () => {
  it('llegar con un token válido deja la pantalla usable y la barra limpia', async () => {
    validateResetToken.mockResolvedValue(true)

    const { router, wrapper, entradasIniciales } = await abrir(
      RestablecerContrasenaView,
      `/restablecer-contrasena?token=${TOKEN}`,
    )

    // El token llegó a su destino: limpiar la URL no es perderlo.
    expect(validateResetToken).toHaveBeenCalledWith(TOKEN)
    expect(wrapper.text()).toContain('Crea una contraseña nueva')

    // Y ya no está en ninguna parte de la URL.
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN)
    expect(router.currentRoute.value.query.token).toBeUndefined()
    // Sigue siendo la misma pantalla: limpiar no es navegar a otro sitio.
    expect(router.currentRoute.value.path).toBe('/restablecer-contrasena')

    expect(
      entradasDeHistorial(),
      'con `push` en vez de `replace`, «atrás» devuelve a la URL con el token dentro ' +
        'y la entrada se queda en el historial del navegador para siempre',
    ).toBe(entradasIniciales)
  })

  it('la URL ya está limpia CUANDO sale la petición, no después', async () => {
    // Ésta es la mitad que un «limpiar al terminar» aprobaría igual. Se fotografía
    // la barra desde dentro de la llamada al backend: si la limpieza se moviera
    // detrás del `await`, el token habría estado visible todo el viaje de red.
    const router = await enLaUrl(`/restablecer-contrasena?token=${TOKEN}`)
    let urlDuranteLaPeticion: string | null = null
    validateResetToken.mockImplementation(() => {
      urlDuranteLaPeticion = router.currentRoute.value.fullPath
      return Promise.resolve(true)
    })

    montar(RestablecerContrasenaView, router)
    await flushPromises()

    expect(validateResetToken).toHaveBeenCalledWith(TOKEN)
    expect(exigir(urlDuranteLaPeticion, 'la URL fotografiada durante la petición')).not.toContain(
      TOKEN,
    )
  })

  it('conserva el resto de la cadena de consulta: solo se descarta el token', async () => {
    validateResetToken.mockResolvedValue(true)

    const { router } = await abrir(
      RestablecerContrasenaView,
      `/restablecer-contrasena?token=${TOKEN}&origen=correo`,
    )

    expect(router.currentRoute.value.query.token).toBeUndefined()
    expect(router.currentRoute.value.query.origen).toBe('correo')
  })

  it('un token inválido o caducado sigue enseñando «Enlace no válido»', async () => {
    validateResetToken.mockResolvedValue(false)

    const { router, wrapper, entradasIniciales } = await abrir(
      RestablecerContrasenaView,
      `/restablecer-contrasena?token=${TOKEN}`,
    )

    // El desenlace de error no puede depender de que el token siga en la barra.
    expect(validateResetToken).toHaveBeenCalledWith(TOKEN)
    expect(wrapper.text()).toContain('Enlace no válido')
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN)
    expect(entradasDeHistorial()).toBe(entradasIniciales)
  })

  it('si la validación revienta, tampoco queda el token en la barra', async () => {
    validateResetToken.mockRejectedValue(new Error('502'))

    const { router, wrapper } = await abrir(
      RestablecerContrasenaView,
      `/restablecer-contrasena?token=${TOKEN}`,
    )

    expect(wrapper.text()).toContain('Enlace no válido')
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN)
  })

  it('llegar sin token da «Enlace no válido» sin navegar ni preguntar al backend', async () => {
    const { router, wrapper, entradasIniciales } = await abrir(
      RestablecerContrasenaView,
      '/restablecer-contrasena',
    )

    expect(wrapper.text()).toContain('Enlace no válido')
    expect(validateResetToken).not.toHaveBeenCalled()
    // No hay nada que limpiar: tocar el historial aquí sería trabajo inventado.
    expect(entradasDeHistorial()).toBe(entradasIniciales)
    expect(router.currentRoute.value.fullPath).toBe('/restablecer-contrasena')
  })

  it('el token sacado de la URL sigue estando para enviar la contraseña nueva', async () => {
    validateResetToken.mockResolvedValue(true)
    resetPassword.mockResolvedValue(undefined)

    const { wrapper, router } = await abrir(
      RestablecerContrasenaView,
      `/restablecer-contrasena?token=${TOKEN}`,
    )

    const campos = wrapper.findAll('input')
    await elemento(campos, 0, 'los campos de contraseña').setValue('contrasena-nueva')
    await elemento(campos, 1, 'los campos de contraseña').setValue('contrasena-nueva')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // La prueba de que la credencial no se perdió al sacarla de la barra: el
    // envío final la lleva. Sin esto, «limpiar la URL» podría estar rompiendo la
    // pantalla entera y todo lo demás seguiría en verde.
    expect(resetPassword).toHaveBeenCalledWith(TOKEN, 'contrasena-nueva')
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN)
  })

  it('el estado de espera es el loader del proyecto, no un aro propio', async () => {
    // Una promesa que no resuelve nunca: congela la pantalla en su estado de espera.
    validateResetToken.mockReturnValue(new Promise<boolean>(() => {}))

    const { wrapper } = await abrir(
      RestablecerContrasenaView,
      `/restablecer-contrasena?token=${TOKEN}`,
    )

    expect(wrapper.find('.paw-loader').exists()).toBe(true)
    expect(wrapper.find('.rp-spin').exists()).toBe(false)
  })
})

describe('verificar correo: el token no se queda en la URL', () => {
  it('llegar con un token válido verifica la cuenta y limpia la barra', async () => {
    verifyEmail.mockResolvedValue(undefined)

    const { router, wrapper, entradasIniciales } = await abrir(
      VerifyEmailView,
      `/verify-email?token=${TOKEN}`,
    )

    expect(verifyEmail).toHaveBeenCalledWith(TOKEN)
    expect(wrapper.text()).toContain('¡Cuenta verificada!')

    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN)
    expect(router.currentRoute.value.query.token).toBeUndefined()
    expect(router.currentRoute.value.path).toBe('/verify-email')
    expect(
      entradasDeHistorial(),
      'con `push` en vez de `replace`, la URL con el token dentro se queda en el historial',
    ).toBe(entradasIniciales)
  })

  it('la URL ya está limpia CUANDO sale la petición, no después', async () => {
    const router = await enLaUrl(`/verify-email?token=${TOKEN}`)
    let urlDuranteLaPeticion: string | null = null
    verifyEmail.mockImplementation(() => {
      urlDuranteLaPeticion = router.currentRoute.value.fullPath
      return Promise.resolve()
    })

    montar(VerifyEmailView, router)
    await flushPromises()

    expect(verifyEmail).toHaveBeenCalledWith(TOKEN)
    expect(exigir(urlDuranteLaPeticion, 'la URL fotografiada durante la petición')).not.toContain(
      TOKEN,
    )
  })

  it('conserva el resto de la cadena de consulta: solo se descarta el token', async () => {
    verifyEmail.mockResolvedValue(undefined)

    const { router } = await abrir(VerifyEmailView, `/verify-email?token=${TOKEN}&origen=correo`)

    expect(router.currentRoute.value.query.token).toBeUndefined()
    expect(router.currentRoute.value.query.origen).toBe('correo')
  })

  it('un token inválido o caducado sigue enseñando «No pudimos verificar»', async () => {
    verifyEmail.mockRejectedValue(new Error('410'))

    const { router, wrapper, entradasIniciales } = await abrir(
      VerifyEmailView,
      `/verify-email?token=${TOKEN}`,
    )

    expect(verifyEmail).toHaveBeenCalledWith(TOKEN)
    expect(wrapper.text()).toContain('No pudimos verificar')
    expect(wrapper.text()).toContain('El enlace de verificación no es válido o expiró.')
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN)
    expect(entradasDeHistorial()).toBe(entradasIniciales)
  })

  it('llegar sin token da error sin navegar ni preguntar al backend', async () => {
    const { router, wrapper, entradasIniciales } = await abrir(VerifyEmailView, '/verify-email')

    expect(wrapper.text()).toContain('No pudimos verificar')
    expect(verifyEmail).not.toHaveBeenCalled()
    expect(entradasDeHistorial()).toBe(entradasIniciales)
    expect(router.currentRoute.value.fullPath).toBe('/verify-email')
  })

  it('el estado de espera es el loader del proyecto, no un aro propio', async () => {
    // Una promesa que no resuelve nunca: congela la pantalla en su estado de espera.
    verifyEmail.mockReturnValue(new Promise<void>(() => {}))

    const { wrapper } = await abrir(VerifyEmailView, `/verify-email?token=${TOKEN}`)

    expect(wrapper.find('.paw-loader').exists()).toBe(true)
    expect(wrapper.find('.verify-spin').exists()).toBe(false)
  })
})
