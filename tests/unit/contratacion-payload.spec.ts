import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activarPlan, lineasDeContratacion } from '@/features/contratacion/api/contratacion.source'
import { PLANS_CONTENT } from '@/features/landing/content/plans.content'
import { calcularEstimado } from '@/features/landing/composables/planPricing'
import type { PublicPlan } from '@/features/landing/types/plans.types'
import type { ResumenContratacion } from '@/features/contratacion/types/contratacion.types'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'

/**
 * EL CUERPO QUE VIAJA A `POST /quotes/self-serve`, Y LOS IMPORTES QUE VUELVEN.
 *
 * ── Por qué este fichero existe ────────────────────────────────────────────
 * `activarPlan` es el único punto del embudo donde una decisión de compra se
 * convierte en una petición, y no lo tocaba ninguna prueba unitaria: lo cubría
 * solo el spec de Playwright, que necesita servidor y navegador y por tanto no
 * corre en `npm run test:coverage`, que es lo que mira el CI. Todo lo que se fija
 * aquí —la traducción del ciclo, la llave de idempotencia, la ausencia de
 * términos económicos y, sobre todo, de quién son los importes de la pantalla de
 * éxito— podía cambiarse sin que nada se pusiera rojo.
 *
 * ── La trampa concreta que se evita en «los importes son del servidor» ─────
 * Un doble que devuelva cifras redondas y coherentes con el cálculo local NO
 * prueba nada: pasa igual si `activarPlan` ignora la respuesta y devuelve el
 * estimado. Por eso el doble de aquí devuelve importes que el cliente **no
 * puede** producir con este plan y esta selección, y el caso lo comprueba
 * explícitamente antes de afirmar nada (`expect(...).not.toBe(estimado)`): si
 * alguien ajustara las cifras del doble hasta hacerlas coincidir con el cálculo,
 * el propio caso se pondría rojo en esa línea.
 */

const selfServe = vi.fn<(payload: unknown) => Promise<QuoteResponse>>()

vi.mock('@/features/suscripcion/api/cotizaciones.api', () => ({
  cotizacionesApi: {
    selfServe: (payload: unknown) => selfServe(payload),
  },
}))

function plan(code: string): PublicPlan {
  const encontrado = PLANS_CONTENT.plans.find((p) => p.code === code)
  if (!encontrado) throw new Error(`El catálogo transcrito no tiene «${code}»`)
  return encontrado
}

/** El resumen que la pantalla ya tiene calculado cuando se pulsa «Confirmar». */
function resumenDe(p: PublicPlan, over: Partial<ResumenContratacion> = {}): ResumenContratacion {
  const seleccion = {
    ciclo: over.ciclo ?? ('MENSUAL' as const),
    sedes: over.sedes ?? 1,
    usuarios: over.usuarios ?? 1,
  }
  const desglose = calcularEstimado(p, seleccion)
  return {
    empresaNombre: 'Clínica de prueba',
    empresaIdentificador: '900123456',
    planCode: p.code,
    planNombre: p.name,
    ...seleccion,
    subtotal: desglose.subtotal,
    impuesto: desglose.impuesto,
    tasaImpuesto: p.taxRate,
    total: desglose.total,
    subtotalMensualEquivalente: desglose.subtotal,
    sinPrecio: desglose.sinPrecio,
    lineasPrueba: [
      {
        code: 'CORE',
        name: 'Núcleo',
        trialEndDate: '2026-09-28',
        trialDays: 30,
        precioDespues: null,
      },
    ],
    estadoPlanActual: 'SIN_PLAN',
    ...over,
  }
}

/** Una oferta del servidor con importes que el cálculo local NO puede producir. */
const OFERTA_DEL_SERVIDOR: QuoteResponse = {
  id: 4321,
  quoteNumber: 'COT-2026-0099',
  // Ni redondos ni derivables: 19 % de 777.321 no es 147.690, así que ni
  // siquiera reconstruyendo el IVA se llega a estas tres cifras por accidente.
  subtotalAmount: 777_321,
  taxAmount: 147_690,
  totalAmount: 925_011,
  validUntil: '2026-09-13',
  status: 'SENT',
}

beforeEach(() => {
  selfServe.mockReset()
  selfServe.mockResolvedValue(OFERTA_DEL_SERVIDOR)
})

describe('activarPlan · el cuerpo que se manda', () => {
  it('traduce el ciclo al vocabulario del contrato y no al de la pantalla', async () => {
    // `MENSUAL`/`ANUAL` son el rótulo de un selector; el contrato habla
    // `MONTHLY`/`ANNUAL` y el borde REST lo valida con un `@Pattern`. Mandar el
    // rótulo de pantalla devuelve un 400 que la pantalla presenta como «no
    // pudimos registrar tu contratación», sin más pistas.
    const p = plan('PACK_CLINIC')

    await activarPlan({ resumen: resumenDe(p), plan: p, clientRequestId: 'k-1' })
    expect(selfServe.mock.calls[0]![0]).toMatchObject({ billingCycle: 'MONTHLY' })

    await activarPlan({
      resumen: resumenDe(p, { ciclo: 'ANUAL' }),
      plan: p,
      clientRequestId: 'k-2',
    })
    expect(selfServe.mock.calls[1]![0]).toMatchObject({ billingCycle: 'ANNUAL' })
  })

  it('manda la llave de idempotencia que le dan, sin regenerarla', async () => {
    // La llave se genera al ENTRAR en el paso, no al pulsar: es lo que hace que
    // un doble clic no cree dos ofertas. Si `activarPlan` fabricara la suya, cada
    // reintento sería una llave nueva y la idempotencia del servidor no serviría
    // de nada — el defecto se vería como dos ofertas por un clic doble.
    const p = plan('PACK_SPA')
    await activarPlan({ resumen: resumenDe(p), plan: p, clientRequestId: 'llave-fija-123' })

    expect(selfServe.mock.calls[0]![0]).toMatchObject({ clientRequestId: 'llave-fija-123' })
  })

  it('el cuerpo no lleva NI UN campo económico ni la empresa', async () => {
    // El aislamiento no es un gate, es el tipo: la empresa la pone el controlador
    // desde el principal, y tarifa/vigencia/descuento/días de prueba son del
    // camino de plataforma. Un campo de más aquí es una escritura que el tenant
    // no debería poder proponer.
    const p = plan('PACK_CLINIC')
    await activarPlan({ resumen: resumenDe(p), plan: p, clientRequestId: 'k' })

    const cuerpo = selfServe.mock.calls[0]![0] as Record<string, unknown>
    expect(Object.keys(cuerpo).sort()).toEqual(['billingCycle', 'clientRequestId', 'lines'])

    const lineas = cuerpo.lines as Record<string, unknown>[]
    for (const linea of lineas) {
      expect(Object.keys(linea).sort(), 'una línea es «qué artículo y cuántos»').toEqual([
        'code',
        'quantity',
      ])
    }
  })

  it('las líneas son las de `lineasDeContratacion`, con el plan ENTERO y no solo su código', async () => {
    // El resumen no lleva los `capacities[].code`: por eso `activarPlan` recibe el
    // plan completo. Si alguien reconstruyera las líneas a partir del resumen, las
    // capacidades saldrían sin código y el servidor rechazaría la oferta.
    const p = plan('PACK_CLINIC')
    const sedes = p.capacities.find((c) => c.unit === 'BRANCH')!.included + 2
    const usuarios = p.capacities.find((c) => c.unit === 'USER')!.included + 3

    await activarPlan({
      resumen: resumenDe(p, { sedes, usuarios }),
      plan: p,
      clientRequestId: 'k',
    })

    expect((selfServe.mock.calls[0]![0] as { lines: unknown }).lines).toEqual(
      lineasDeContratacion(p, { sedes, usuarios }),
    )
  })
})

describe('activarPlan · de quién son los importes de la pantalla de éxito', () => {
  it('gana el SERVIDOR, con cifras que el cálculo local no puede producir', async () => {
    const p = plan('PACK_CLINIC')
    const resumen = resumenDe(p)

    // Autocomprobación del doble: si alguien «arreglara» estas cifras hasta
    // hacerlas coincidir con el estimado, el caso dejaría de demostrar nada — y
    // por eso falla aquí, antes de llegar a la afirmación de verdad.
    expect(OFERTA_DEL_SERVIDOR.subtotalAmount).not.toBe(resumen.subtotal)
    expect(OFERTA_DEL_SERVIDOR.taxAmount).not.toBe(resumen.impuesto)
    expect(OFERTA_DEL_SERVIDOR.totalAmount).not.toBe(resumen.total)

    const resultado = await activarPlan({ resumen, plan: p, clientRequestId: 'k' })

    expect(resultado.subtotal).toBe(777_321)
    expect(resultado.impuesto).toBe(147_690)
    expect(resultado.total).toBe(925_011)
    // Y el número de la oferta, que es lo que soporte usa para encontrarla.
    expect(resultado.cotizacionId).toBe(4321)
    expect(resultado.cotizacionNumero).toBe('COT-2026-0099')
    expect(resultado.validaHasta).toBe('2026-09-13')
  })

  it('si el servidor omite un importe, cae al estimado y NO a cero', async () => {
    // springdoc no marca requerido ningún campo de un `record`, así que los tres
    // importes son opcionales en el contrato. El `??` es un suelo de tipos: lo que
    // NO puede pasar es que un campo ausente se lea como «no te cobran nada».
    const p = plan('PACK_CLINIC')
    const resumen = resumenDe(p)
    selfServe.mockResolvedValue({ id: 9, quoteNumber: 'COT-1', status: 'SENT' })

    const resultado = await activarPlan({ resumen, plan: p, clientRequestId: 'k' })

    expect(resultado.subtotal).toBe(resumen.subtotal)
    expect(resultado.total).toBe(resumen.total)
    expect(resultado.subtotal).not.toBe(0)
    expect(resultado.validaHasta).toBeNull()
  })

  it('un cero del servidor es un cero, no un hueco que se rellene con el estimado', async () => {
    // `?? ` y no `||`: con `||` un total de 0 —una oferta íntegramente en prueba,
    // que es un estado real— se sustituiría por el estimado y la pantalla de éxito
    // cobraría algo que la oferta no cobra.
    const p = plan('PACK_CLINIC')
    selfServe.mockResolvedValue({
      id: 9,
      status: 'SENT',
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    })

    const resultado = await activarPlan({
      resumen: resumenDe(p),
      plan: p,
      clientRequestId: 'k',
    })

    expect(resultado.subtotal).toBe(0)
    expect(resultado.total).toBe(0)
  })

  it('el error del servidor se propaga: no se inventa un éxito', async () => {
    // La pantalla necesita el objeto de error ENTERO para sacar el `X-Trace-Id`
    // con `errorFrom`. Tragarse la excepción y devolver un resultado con los
    // importes locales dejaría al usuario en la pantalla de éxito sin oferta.
    const p = plan('PACK_CLINIC')
    const fallo = new Error('502 del servidor')
    selfServe.mockRejectedValue(fallo)

    await expect(
      activarPlan({ resumen: resumenDe(p), plan: p, clientRequestId: 'k' }),
    ).rejects.toBe(fallo)
  })
})
