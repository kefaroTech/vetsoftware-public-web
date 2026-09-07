import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import MediosPagoView from '@/features/suscripcion/views/MediosPagoView.vue'
import type { SubscriptionPaymentMethodResponse } from '@/features/suscripcion/types/medios-pago.types'

// `MediosPagoView` enlaza a «Mis cuentas de cobro» cuando hay aviso de reintento: sin este
// stub, `RouterLink` real exige un router instalado que este test no monta.
vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
  // `ModalShell` (vía `useModalHistory`) llama a `useRouter()` con o sin router instalado: sin
  // este stub, sustituir el módulo entero deja el import sin resolver.
  useRouter: () => undefined,
}))

/**
 * EL ALTA DESDE «MI SUSCRIPCIÓN › MEDIOS DE PAGO» (issue public-web#394).
 *
 * El botón «Añadir tarjeta» es una escritura real de dinero — se guarda un medio de pago
 * nuevo—, y por eso vive detrás de su propio permiso (`subscriptionPaymentMethod.create`),
 * distinto del `subscriptionPaymentMethod.read` que ya exige la ruta.
 */

const permisos = ref<string[]>(['subscriptionPaymentMethod.read'])
vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ me: ref({ permissions: permisos.value, branchIds: [] }), companyId: ref(7) }),
}))

const subscription = ref<{ nextBillingDate: string; status: string } | null>({
  nextBillingDate: '2030-01-01',
  status: 'ACTIVE',
})
vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ subscription }),
}))

const listAll = vi.fn()
vi.mock('@/features/suscripcion/api/medios-pago.api', () => ({
  mediosPagoApi: {
    listAll: () => listAll(),
    findById: vi.fn(),
    setDefault: vi.fn(),
    revoke: vi.fn(),
    create: vi.fn(),
  },
}))

const checkoutConfig = vi.fn()
const crearFuenteDePago = vi.fn()
const tokenizarTarjeta = vi.fn()
vi.mock('@/features/suscripcion/api/pago.api', () => ({
  wompiApi: {
    checkoutConfig: () => checkoutConfig(),
    crearFuenteDePago: (p: unknown) => crearFuenteDePago(p),
    primerPago: vi.fn(),
  },
  tokenizarTarjeta: (apiBaseUrl: string, publicKey: string, tarjeta: unknown) =>
    tokenizarTarjeta(apiBaseUrl, publicKey, tarjeta),
}))

const toastSuccess = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    info: vi.fn(),
    success: toastSuccess,
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom: vi.fn(),
    warnFrom: vi.fn(),
    remove: vi.fn(),
  }),
}))

function medio(
  over: Partial<SubscriptionPaymentMethodResponse> = {},
): SubscriptionPaymentMethodResponse {
  return {
    id: 1,
    companyId: 7,
    methodKind: 'CARD',
    gateway: 'WOMPI',
    brand: 'VISA',
    lastFour: '1234',
    expiresOn: '2030-06-30',
    mandateStatus: 'ACTIVE',
    mandateEvidence: 'wompi:ps=1',
    authorizedAt: '2026-01-01T00:00:00Z',
    defaultMethod: true,
    createdDate: '2026-01-01T00:00:00Z',
    ...over,
  }
}

const PAGINA = { page: 0, pageSize: 50, totalElements: 1, totalPages: 1 }
const CONFIG = {
  environment: 'SANDBOX' as const,
  apiBaseUrl: 'https://sandbox.wompi.co/v1',
  publicKey: 'pub_test_x',
  acceptance: { token: 'acc', permalink: 'https://wompi.co/acceptance' },
  personalDataAuthorization: { token: 'pda', permalink: 'https://wompi.co/pda' },
}
const TOKEN = {
  id: 'tok_1',
  brand: 'MASTERCARD',
  last_four: '9876',
  exp_month: '05',
  exp_year: '30',
}
const MEDIO_NUEVO = {
  paymentMethodId: 9,
  brand: 'MASTERCARD',
  lastFour: '9876',
  expiresOn: '2030-05-31',
  defaultMethod: true,
}

function botonAnadir(wrapper: Awaited<ReturnType<typeof montar>>) {
  return wrapper.findAll('button').filter((b) => b.text().includes('Añadir tarjeta'))
}

async function montar() {
  const wrapper = mount(MediosPagoView)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  permisos.value = ['subscriptionPaymentMethod.read']
  subscription.value = { nextBillingDate: '2030-01-01', status: 'ACTIVE' }
  listAll.mockReset().mockResolvedValue({ content: [medio()], ...PAGINA })
  checkoutConfig.mockReset().mockResolvedValue(CONFIG)
  crearFuenteDePago.mockReset().mockResolvedValue(MEDIO_NUEVO)
  tokenizarTarjeta.mockReset().mockResolvedValue(TOKEN)
  toastSuccess.mockReset()
})

describe('el aviso «La reintentaremos automáticamente»', () => {
  it('no aparece con la suscripción al día y sin contratación reciente', async () => {
    const wrapper = await montar()

    expect(wrapper.text()).not.toContain('La reintentaremos automáticamente.')
  })

  it('aparece cuando la suscripción está en mora por un rebote de renovación', async () => {
    subscription.value = { nextBillingDate: '2030-01-01', status: 'PAST_DUE' }

    const wrapper = await montar()

    expect(wrapper.text()).toContain('La reintentaremos automáticamente.')
  })
})

describe('la puerta del permiso `subscriptionPaymentMethod.create`', () => {
  it('sin el permiso, «Añadir tarjeta» está AUSENTE del DOM', async () => {
    const wrapper = await montar()

    expect(botonAnadir(wrapper)).toHaveLength(0)
  })

  it('con el permiso, «Añadir tarjeta» aparece', async () => {
    permisos.value = ['subscriptionPaymentMethod.read', 'subscriptionPaymentMethod.create']
    const wrapper = await montar()

    expect(botonAnadir(wrapper)).toHaveLength(1)
  })
})

describe('el alta despliega el formulario y recarga la lista al guardar', () => {
  beforeEach(() => {
    permisos.value = ['subscriptionPaymentMethod.read', 'subscriptionPaymentMethod.create']
  })

  it('clicar «Añadir tarjeta» despliega el formulario, sin campo de correo', async () => {
    const wrapper = await montar()

    await botonAnadir(wrapper)[0]?.trigger('click')
    await flushPromises()

    expect(wrapper.find('input[placeholder="4242 4242 4242 4242"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    // Mientras el formulario está abierto, el botón que lo abre se retira: no hay dos
    // caminos a la vez para la misma acción.
    expect(botonAnadir(wrapper)).toHaveLength(0)
  })

  it('al guardar la tarjeta, recarga la lista, avisa y cierra el formulario', async () => {
    const wrapper = await montar()
    expect(listAll).toHaveBeenCalledTimes(1)

    await botonAnadir(wrapper)[0]?.trigger('click')
    await flushPromises()

    await wrapper.find('input[placeholder="4242 4242 4242 4242"]').setValue('5555555555554444')
    await wrapper.find('input[placeholder="08/29"]').setValue('0530')
    await wrapper.find('input[placeholder="123"]').setValue('321')
    await wrapper.find('input[placeholder="Como aparece en la tarjeta"]').setValue('Ana Gómez')
    const casillas = wrapper.findAll('input[type="checkbox"]')
    await casillas[0]?.setValue(true)
    await casillas[1]?.setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(crearFuenteDePago).toHaveBeenCalledTimes(1)
    expect(listAll, 'recarga tras el alta').toHaveBeenCalledTimes(2)
    expect(toastSuccess).toHaveBeenCalledWith(
      'Tarjeta añadida',
      'Tu nuevo medio de pago ya quedó registrado.',
    )
    expect(botonAnadir(wrapper), 'el formulario se cierra y el botón vuelve').toHaveLength(1)
  })
})
