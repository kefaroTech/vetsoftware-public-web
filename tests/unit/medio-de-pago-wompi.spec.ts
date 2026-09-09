import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import MedioDePagoWompi from '@/features/contratacion/components/MedioDePagoWompi.vue'
import FormularioTarjetaWompi from '@/features/suscripcion/components/FormularioTarjetaWompi.vue'

/**
 * EL PRELLENADO DEL CORREO DE QUIEN ACEPTA Y PAGA.
 *
 * En el auto-registro el usuario de acceso del administrador ES su correo
 * (`RegisterUserService`), así que `MeResponse.employeeCode` suele valer como valor por defecto.
 * Pero sigue siendo editable —un empleado invitado después puede tener un código que no lo
 * sea— y por eso el prellenado se decide por FORMA, no por dar por hecho quién inició sesión.
 */

const me = ref<{ employeeCode: string | null; permissions: string[]; branchIds: number[] } | null>(
  null,
)

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ me, companyId: ref(7) }),
}))

const checkoutConfig = vi.fn()
vi.mock('@/features/suscripcion/api/pago.api', () => ({
  wompiApi: {
    checkoutConfig: () => checkoutConfig(),
    crearFuenteDePago: vi.fn(),
    primerPago: vi.fn(),
  },
  tokenizarTarjeta: vi.fn(),
}))

vi.mock('@/features/suscripcion/api/medios-pago.api', () => ({
  mediosPagoApi: {
    listAll: () =>
      Promise.resolve({ content: [], page: 0, pageSize: 50, totalElements: 0, totalPages: 0 }),
    findById: vi.fn(),
    setDefault: vi.fn(),
    revoke: vi.fn(),
    create: vi.fn(),
  },
}))

const CONFIG = {
  environment: 'SANDBOX' as const,
  apiBaseUrl: 'https://sandbox.wompi.co/v1',
  publicKey: 'pub_test_x',
  acceptance: { token: 'acc', permalink: 'https://wompi.co/acceptance' },
  personalDataAuthorization: { token: 'pda', permalink: 'https://wompi.co/pda' },
}

async function montar() {
  const wrapper = mount(MedioDePagoWompi, { props: { total: 100_000 } })
  await flushPromises()
  return wrapper
}

describe('tras guardar una tarjeta nueva', () => {
  it('sustituye el formulario por el medio recién registrado, con el que se reintenta el pago', async () => {
    me.value = { employeeCode: 'admin@clinica-norte.com', permissions: [], branchIds: [] }
    checkoutConfig.mockResolvedValue(CONFIG)
    const wrapper = await montar()

    wrapper.findComponent(FormularioTarjetaWompi).vm.$emit('guardado', {
      paymentMethodId: 9,
      brand: 'VISA',
      lastFour: '4242',
      expiresOn: '2029-08-31',
      defaultMethod: true,
    })
    await flushPromises()

    expect(wrapper.emitted('pagar')?.[0]).toEqual([{ acceptedByEmail: 'admin@clinica-norte.com' }])
    expect(wrapper.findComponent(FormularioTarjetaWompi).exists()).toBe(false)
    expect(wrapper.text()).toContain('Pagaremos con la tarjeta terminada en 4242')

    const pagar = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Pagar con la tarjeta terminada en 4242'))
    await pagar?.trigger('click')
    expect(wrapper.emitted('pagar')).toHaveLength(2)
  })
})

describe('el campo de correo se prellena por FORMA, no por confianza ciega', () => {
  it('con un `employeeCode` que tiene forma de correo, lo usa de valor inicial', async () => {
    me.value = { employeeCode: 'admin@clinica-norte.com', permissions: [], branchIds: [] }
    checkoutConfig.mockResolvedValue(CONFIG)

    const wrapper = await montar()

    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'admin@clinica-norte.com',
    )
  })

  it('con un `employeeCode` que NO tiene forma de correo, deja el campo vacío', async () => {
    me.value = { employeeCode: 'ADMIN-001', permissions: [], branchIds: [] }
    checkoutConfig.mockResolvedValue(CONFIG)

    const wrapper = await montar()

    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('')
  })

  it('sigue siendo editable: el prellenado no bloquea el campo', async () => {
    me.value = { employeeCode: 'admin@clinica-norte.com', permissions: [], branchIds: [] }
    checkoutConfig.mockResolvedValue(CONFIG)

    const wrapper = await montar()
    const input = wrapper.find('input[type="email"]')
    await input.setValue('otro@correo.com')

    expect((input.element as HTMLInputElement).value).toBe('otro@correo.com')
  })
})
