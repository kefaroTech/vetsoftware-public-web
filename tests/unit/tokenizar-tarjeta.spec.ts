import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { tokenizarTarjeta } from '@/features/suscripcion/api/pago.api'
import { useLoaderStore } from '@/stores/loader.store'

/**
 * `tokenizarTarjeta` HABLA DIRECTO CON WOMPI, NUNCA CON `http`.
 *
 * <p>Lo que esta prueba afirma no es «llama a `POST /tokens/cards»: es que la llamada NO lleva
 * nuestro JWT y SÍ lleva la llave pública. Doblar `axios.create` entero —y no solo `axios.post`—
 * es lo que hace la afirmación posible: si `tokenizarTarjeta` usara el `http` del repo por error,
 * este doble ni se tocaría y la prueba pasaría igual sin haber comprobado nada.
 */

// `vi.hoisted`: `vi.mock` se eleva por encima de los imports, y `pago.api.ts` importa
// `http.client.ts`, que llama a `axios.create(...)` EN CUANTO SE IMPORTA — antes de que un
// `const post = vi.fn()` normal, escrito después, llegara a existir.
//
// El doble de `create` sirve a LAS DOS llamadas que pasan por él: la de `http.client.ts` (que
// necesita `interceptors.request/response.use` para no reventar en su propio arranque) y la de
// `tokenizarTarjeta` (que es la que esta prueba de verdad mira). Comparten forma; solo `post` se
// inspecciona.
const post = vi.hoisted(() => vi.fn())

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post,
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    })),
  },
}))

const TARJETA = {
  number: '4242424242424242',
  cvc: '123',
  expMonth: '08',
  expYear: '29',
  cardHolder: 'Ana Gómez',
}

describe('tokenizarTarjeta', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    post.mockReset()
  })

  it('crea una instancia de axios aparte, con la llave pública como Bearer y sin JWT', async () => {
    post.mockResolvedValue({
      data: {
        data: {
          id: 'tok_test_1',
          brand: 'VISA',
          last_four: '4242',
          exp_month: '08',
          exp_year: '29',
        },
      },
    })

    const resultado = await tokenizarTarjeta('https://sandbox.wompi.co/v1', 'pub_test_abc123', {
      number: '4242424242424242',
      cvc: '123',
      expMonth: '08',
      expYear: '29',
      cardHolder: 'Ana Gómez',
    })

    expect(axios.create).toHaveBeenCalledWith({ baseURL: 'https://sandbox.wompi.co/v1' })
    expect(post).toHaveBeenCalledTimes(1)

    const [ruta, cuerpo, config] = post.mock.calls[0] as [
      string,
      unknown,
      { headers?: Record<string, string> },
    ]
    expect(ruta).toBe('/tokens/cards')
    expect(cuerpo).toEqual({
      number: '4242424242424242',
      cvc: '123',
      exp_month: '08',
      exp_year: '29',
      card_holder: 'Ana Gómez',
    })
    // La única cabecera es el Bearer de la llave PÚBLICA — nunca el `Authorization` que el
    // interceptor de `http.client` pone con el JWT del tenant, y ningún `X-Company-Id`.
    expect(config?.headers).toEqual({ Authorization: 'Bearer pub_test_abc123' })

    expect(resultado).toEqual({
      id: 'tok_test_1',
      brand: 'VISA',
      last_four: '4242',
      exp_month: '08',
      exp_year: '29',
    })
  })

  it('no envuelve el `data` de Wompi: devuelve `data.data` sin doble anidamiento', async () => {
    post.mockResolvedValue({
      data: {
        data: {
          id: 'tok_test_2',
          brand: 'MASTERCARD',
          last_four: '0031',
          exp_month: '01',
          exp_year: '30',
        },
      },
    })

    const resultado = await tokenizarTarjeta('https://production.wompi.co/v1', 'pub_prod_x', {
      number: '4666533000000031',
      cvc: '999',
      expMonth: '01',
      expYear: '30',
      cardHolder: 'Otro Titular',
    })

    expect(resultado.id).toBe('tok_test_2')
    expect('data' in resultado).toBe(false)
  })
})

describe('tokenizarTarjeta y el velo global', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    post.mockReset()
  })

  it('sube el contador del velo mientras Wompi responde y lo baja al terminar', async () => {
    const loader = useLoaderStore()
    let pendientesDuranteLaLlamada = -1
    post.mockImplementation(async () => {
      pendientesDuranteLaLlamada = loader.pending
      return {
        data: {
          data: { id: 'tok', brand: 'VISA', last_four: '4242', exp_month: '08', exp_year: '29' },
        },
      }
    })

    await tokenizarTarjeta('https://sandbox.wompi.co/v1', 'pub_test_abc123', TARJETA)

    expect(pendientesDuranteLaLlamada).toBe(1)
    expect(loader.pending).toBe(0)
  })

  it('baja el contador también cuando Wompi rechaza la tarjeta', async () => {
    const loader = useLoaderStore()
    post.mockRejectedValue(new Error('422'))

    await expect(
      tokenizarTarjeta('https://sandbox.wompi.co/v1', 'pub_test_abc123', TARJETA),
    ).rejects.toThrow('422')

    expect(loader.pending).toBe(0)
  })
})
