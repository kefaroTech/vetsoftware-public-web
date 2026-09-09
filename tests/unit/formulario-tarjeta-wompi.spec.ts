import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FormularioTarjetaWompi from '@/features/suscripcion/components/FormularioTarjetaWompi.vue'

/**
 * EL FORMULARIO REUTILIZABLE, SIN EL CONTEXTO DE NINGUNA DE LAS DOS PANTALLAS.
 *
 * `MedioDePagoWompi.vue` (contratación) y `MediosPagoView.vue` (alta de un medio adicional) lo
 * componen cada uno a su manera — este spec no monta ninguna de las dos, solo el formulario, y
 * por eso cubre lo que le pertenece a él: tokenizar, dar de alta la fuente de pago, fallar sin
 * tocar nuestro backend, y mostrar el correo solo cuando se le pide modo contratación.
 */

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

const CONFIG = {
  environment: 'SANDBOX' as const,
  apiBaseUrl: 'https://sandbox.wompi.co/v1',
  publicKey: 'pub_test_x',
  acceptance: { token: 'acc', permalink: 'https://wompi.co/acceptance' },
  personalDataAuthorization: { token: 'pda', permalink: 'https://wompi.co/pda' },
}
const TOKEN = { id: 'tok_1', brand: 'VISA', last_four: '4242', exp_month: '08', exp_year: '29' }
const MEDIO = {
  paymentMethodId: 9,
  brand: 'VISA',
  lastFour: '4242',
  expiresOn: '2029-08-31',
  defaultMethod: true,
}

async function montar(props: Record<string, unknown> = {}) {
  const wrapper = mount(FormularioTarjetaWompi, { props })
  await flushPromises()
  return wrapper
}

async function llenarTarjeta(wrapper: Awaited<ReturnType<typeof montar>>) {
  await wrapper.find('input[placeholder="4242 4242 4242 4242"]').setValue('4242424242424242')
  await wrapper.find('input[placeholder="08/29"]').setValue('0829')
  await wrapper.find('input[placeholder="123"]').setValue('123')
  await wrapper.find('input[placeholder="Como aparece en la tarjeta"]').setValue('Ana Gómez')
  const casillas = wrapper.findAll('input[type="checkbox"]')
  await casillas[0]?.setValue(true)
  await casillas[1]?.setValue(true)
}

beforeEach(() => {
  checkoutConfig.mockReset().mockResolvedValue(CONFIG)
  crearFuenteDePago.mockReset().mockResolvedValue(MEDIO)
  tokenizarTarjeta.mockReset().mockResolvedValue(TOKEN)
})

describe('alta correcta', () => {
  it('tokeniza, crea la fuente de pago y emite `guardado` con la respuesta', async () => {
    const wrapper = await montar()
    await llenarTarjeta(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(tokenizarTarjeta).toHaveBeenCalledWith(CONFIG.apiBaseUrl, CONFIG.publicKey, {
      number: '4242424242424242',
      cvc: '123',
      expMonth: '08',
      expYear: '29',
      cardHolder: 'Ana Gómez',
    })
    expect(crearFuenteDePago).toHaveBeenCalledWith({
      cardToken: 'tok_1',
      acceptanceToken: 'acc',
      personalDataAuthToken: 'pda',
      brand: 'VISA',
      lastFour: '4242',
      expMonth: 8,
      expYear: 2029,
    })
    expect(wrapper.emitted('guardado')?.[0]).toEqual([MEDIO])
  })

  it('vacía el número y el CVC sin marcarlos como obligatorios', async () => {
    const wrapper = await montar()
    await llenarTarjeta(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const numero = wrapper.find('input[placeholder="4242 4242 4242 4242"]')
      .element as HTMLInputElement
    const cvc = wrapper.find('input[placeholder="123"]').element as HTMLInputElement
    expect(numero.value).toBe('')
    expect(cvc.value).toBe('')
    expect(wrapper.text()).not.toContain('El número de tarjeta es obligatorio')
    expect(wrapper.text()).not.toContain('El CVC es obligatorio')
  })
})

describe('tokenización fallida', () => {
  it('muestra un error accesible y no llega a llamar a nuestro backend', async () => {
    tokenizarTarjeta.mockRejectedValue(new Error('tarjeta rechazada'))
    const wrapper = await montar()
    await llenarTarjeta(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const aviso = wrapper.find('[role="alert"]')
    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain('No pudimos guardar tu tarjeta con Wompi.')
    expect(crearFuenteDePago).not.toHaveBeenCalled()
    expect(wrapper.emitted('guardado')).toBeUndefined()
  })
})

describe('pasarela no configurada', () => {
  it('con un 409 de `checkout-config`, avisa y no pinta el formulario', async () => {
    checkoutConfig.mockReset().mockRejectedValue({ isAxiosError: true, response: { status: 409 } })
    const wrapper = await montar()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toBe(
      'El pago con tarjeta todavía no está disponible.',
    )
  })
})

describe('el correo de quien acepta y paga', () => {
  it('no aparece sin `modoContratacion`', async () => {
    const wrapper = await montar()
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
  })

  it('aparece con `modoContratacion`', async () => {
    const wrapper = await montar({ modoContratacion: true })
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
  })
})
