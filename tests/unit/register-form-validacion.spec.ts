import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegisterForm from '@/features/registration/components/RegisterForm.vue'
import { REQUIRED } from '@/features/registration/composables/useRegisterFields'
import {
  REGISTER_FIELD_IDS,
  REGISTER_RECAPTCHA_ID,
} from '@/features/registration/types/register-form.types'

/**
 * El resumen de errores desaparece de ESTE formulario (no de `ErrorSummary.vue`,
 * que otras pantallas siguen usando): el error en línea de cada campo, con
 * `aria-invalid` y el desplazamiento al primero, pasan a ser la única señal.
 * Esta prueba sujeta esa conducta para que no vuelva el resumen ni se pierda el
 * desplazamiento.
 */

// `vi.mock` se hoistea por encima de cualquier `const` de nivel superior: los
// mocks que el factory necesita van dentro de `vi.hoisted`, que se hoistea con
// él, o el factory revienta con «Cannot access ... before initialization».
const {
  scrollToFirstError,
  registrationApiRegister,
  recaptchaGetToken,
  recaptchaRender,
  recaptchaReset,
} = vi.hoisted(() => ({
  scrollToFirstError: vi.fn().mockResolvedValue(true),
  registrationApiRegister: vi.fn(),
  recaptchaGetToken: vi.fn(() => ''),
  recaptchaRender: vi.fn().mockResolvedValue(undefined),
  recaptchaReset: vi.fn(),
}))

vi.mock('@/composables/scrollToError', () => ({ scrollToFirstError }))

vi.mock('@/features/registration/api/registration.api', () => ({
  registrationApi: { register: registrationApiRegister, verifyEmail: vi.fn() },
}))

vi.mock('@/features/registration/api/locations.api', () => ({
  locationsApi: {
    listCountries: vi.fn().mockResolvedValue([{ id: 1, name: 'Colombia' }]),
    listStatesByCountry: vi.fn().mockResolvedValue([]),
    listCitiesByState: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/features/registration/composables/useRecaptcha', () => ({
  useRecaptcha: () => ({
    ready: ref(true),
    failed: ref(false),
    failureMessage: ref(null),
    render: recaptchaRender,
    getToken: recaptchaGetToken,
    reset: recaptchaReset,
  }),
}))

const MENSAJES_ESPERADOS = [
  'Ingresa el número de documento.',
  'Ingresa la razón social.',
  'Selecciona el régimen tributario.',
  'Ingresa el correo fiscal.',
  'Selecciona el país.',
  'Selecciona el departamento.',
  'Selecciona la ciudad.',
  'Ingresa el nombre completo.',
  'Ingresa el correo.',
  'Ingresa una contraseña.',
  'Completa la verificación para continuar.',
]

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' }

async function montarFormulario() {
  const wrapper = mount(RegisterForm, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  // `onMounted` encadena el render de reCAPTCHA y la carga de países.
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  scrollToFirstError.mockClear()
  registrationApiRegister.mockClear()
  recaptchaGetToken.mockClear()
  recaptchaReset.mockClear()
})

describe('RegisterForm · validación en línea', () => {
  it('antes de enviar no hay ningún error visible', async () => {
    const wrapper = await montarFormulario()

    expect(wrapper.findAll('[aria-invalid="true"]')).toHaveLength(0)
    for (const mensaje of MENSAJES_ESPERADOS) {
      expect(wrapper.text()).not.toContain(mensaje)
    }
    expect(
      wrapper.find(`#${REGISTER_RECAPTCHA_ID}`).attributes('data-error-anchor'),
    ).toBeUndefined()
  })

  it('al enviar vacío, marca cada campo en línea y desplaza una sola vez, sin llamar al backend', async () => {
    const wrapper = await montarFormulario()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.ds-error-summary').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('problemas en este formulario')

    for (const mensaje of MENSAJES_ESPERADOS) {
      expect(wrapper.text()).toContain(mensaje)
    }

    for (const clave of REQUIRED) {
      const id = REGISTER_FIELD_IDS[clave]
      const control = wrapper.find(`#${id}`)
      expect(control.attributes('aria-invalid'), `${clave} aria-invalid`).toBe('true')

      const raiz = control.element.closest('.pub-input, .pub-select')
      expect(raiz?.classList.contains('ds-field-shake'), `${clave} ds-field-shake`).toBe(true)
    }

    expect(scrollToFirstError).toHaveBeenCalledTimes(1)
    const [root] = scrollToFirstError.mock.calls[0] ?? []
    expect(root).toBeInstanceOf(HTMLElement)
    expect((root as HTMLElement).classList.contains('reg-scroll')).toBe(true)

    expect(registrationApiRegister).not.toHaveBeenCalled()
  })

  it('sin token de reCAPTCHA, el contenedor del widget queda marcado como ancla de error', async () => {
    const wrapper = await montarFormulario()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const recaptcha = wrapper.find(`#${REGISTER_RECAPTCHA_ID}`)
    expect(recaptcha.attributes('data-error-anchor')).toBeDefined()
    expect(recaptcha.find('.reg-recaptcha-err').text()).toContain(
      'Completa la verificación para continuar.',
    )
  })
})
