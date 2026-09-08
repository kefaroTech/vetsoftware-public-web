import { describe, expect, it } from 'vitest'
import {
  bajaRegistrada,
  cicloLabel,
  enVentanaDeReparto,
  esPlanContratado,
  estadoPlan,
  estadoPostVencimiento,
  estadoRotulo,
  graceDaysLeft,
  trialDaysLeft,
  VER_MODULOS,
} from '@/features/suscripcion/composables/estadoSuscripcion'
import type {
  SubscriptionResponse,
  SubscriptionStatus,
} from '@/features/suscripcion/types/suscripcion.types'

/**
 * `estadoSuscripcion.ts` es puro a propósito, y esta prueba es la razón: estos textos son la
 * única explicación que la clínica recibe de por qué se le apagó un botón.
 */

const HOY = '2026-08-28'

function sub(over: Partial<SubscriptionResponse> = {}): SubscriptionResponse {
  return {
    id: 1,
    subscriptionNumber: 'SUS-001',
    companyId: 7,
    billingCycle: 'MONTHLY',
    status: 'ACTIVE',
    current: true,
    startDate: '2026-01-01',
    currentPeriodStart: '2026-08-01',
    currentPeriodEnd: '2026-08-31',
    nextBillingDate: '2026-09-01',
    autoRenew: true,
    createdDate: '2026-01-01',
    enabled: true,
    ...over,
  }
}

const ESTADOS: SubscriptionStatus[] = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'READ_ONLY',
  'CANCELLED',
  'EXPIRED',
]

/**
 * El vocabulario prohibido, tal como lo declara la política: son infinitivos. «no se corta nada
 * por sí solo» es lenguaje permitido —y deliberado— y por eso se busca `cortar`, no `corta`.
 */
const PROHIBIDAS = ['bloquear', 'suspender', 'cortar', 'desactivar', 'inhabilitar']

describe('estadoSuscripcion · vocabulario prohibido', () => {
  it('no emite ninguna de las cinco palabras en ningún estado ni combinación de fechas', () => {
    const fechas: Partial<SubscriptionResponse>[] = [
      {},
      { trialEndDate: '2026-08-30' },
      { trialEndDate: '2026-12-30' },
      { pastDueSince: '2026-08-20', graceDays: 10 },
      { pastDueSince: '2026-07-01', graceDays: 5 },
      { pastDueSince: '2026-08-20' },
      { graceDays: 10 },
      { cancelRequestedAt: '2026-08-10', cancelEffectiveDate: '2026-08-31' },
      { cancelEffectiveDate: '2026-08-31' },
    ]
    const salidas: string[] = []
    for (const status of ESTADOS) {
      for (const extra of fechas) {
        const s = sub({ status, ...extra })
        const estado = estadoPlan(s, HOY)
        if (estado) {
          salidas.push(estado.rotulo, estado.fuerte, estado.frase, estado.accion?.label ?? '')
        }
        salidas.push(bajaRegistrada(s) ?? '', estadoRotulo(status), cicloLabel(s.billingCycle))
      }
    }
    const texto = salidas.join(' ').toLowerCase()
    for (const palabra of PROHIBIDAS) {
      expect(texto, `emitió «${palabra}»`).not.toContain(palabra)
    }
  })
})

describe('estadoSuscripcion · días de cortesía', () => {
  it('devuelve null —no 0— cuando falta pastDueSince o graceDays', () => {
    expect(graceDaysLeft(sub({ graceDays: 10 }), HOY)).toBeNull()
    expect(graceDaysLeft(sub({ pastDueSince: '2026-08-20' }), HOY)).toBeNull()
    expect(graceDaysLeft(null, HOY)).toBeNull()
  })

  it('nunca devuelve un negativo', () => {
    expect(graceDaysLeft(sub({ pastDueSince: '2026-01-01', graceDays: 5 }), HOY)).toBe(0)
  })

  it('cuenta los días que faltan', () => {
    expect(graceDaysLeft(sub({ pastDueSince: '2026-08-20', graceDays: 10 }), HOY)).toBe(2)
  })

  it('no inventa un número cuando no lo sabe', () => {
    const estado = estadoPlan(sub({ status: 'PAST_DUE', pastDueSince: '2026-08-20' }), HOY)
    expect(estado?.frase).not.toMatch(/\d+ días de cortesía/)
    expect(estado?.fuerte).toContain('Sigues trabajando con normalidad')
  })

  it('concuerda en número: «1 día», no «1 días»', () => {
    const estado = estadoPlan(
      sub({ status: 'PAST_DUE', pastDueSince: '2026-08-20', graceDays: 9 }),
      HOY,
    )
    expect(estado?.frase).toContain('Te quedan 1 día de cortesía')
  })
})

describe('estadoSuscripcion · la mora empieza por «sigues trabajando», Y EN NEGRITA', () => {
  it('la tranquilidad va en `fuerte` y la deuda después, nunca al revés', () => {
    const estado = estadoPlan(
      sub({ status: 'PAST_DUE', pastDueSince: '2026-08-20', graceDays: 10 }),
      HOY,
    )
    // `fuerte` es lo que el banner pone en `<strong>`. Que la deuda NO esté ahí es el punto
    // entero: el modelo garantiza que nunca hay corte total, y abrir en negrita con «Pago
    // pendiente» asusta a una clínica que puede seguir atendiendo.
    expect(estado?.fuerte).toBe('Sigues trabajando con normalidad.')
    expect(estado?.fuerte).not.toContain('saldo pendiente')
    expect(estado?.frase).toContain('saldo pendiente')
    expect(estado?.tono).toBe('warning')
    expect(estado?.accion?.routeName).toBe('suscripcion-cobros')
  })

  it('con la cortesía agotada sube a error y sigue sin amenazar', () => {
    const estado = estadoPlan(
      sub({ status: 'PAST_DUE', pastDueSince: '2026-01-01', graceDays: 5 }),
      HOY,
    )
    expect(estado?.tono).toBe('error')
    expect(estado?.fuerte).toContain('Sigues trabajando')
  })
})

describe('estadoSuscripcion · solo consulta', () => {
  it('dice qué conserva, qué pierde y cómo vuelve', () => {
    const estado = estadoPlan(sub({ status: 'READ_ONLY' }), HOY)
    // Lo que CONSERVA va en negrita; lo que pierde, después.
    expect(estado?.fuerte).toContain('incluida la historia clínica')
    expect(estado?.frase).toContain('no puedes crear ni modificar')
    expect(estado?.frase).toContain('se regularice el pago')
  })
})

describe('estadoSuscripcion · prueba y salidas', () => {
  it('avisa dentro de los 7 días y no antes', () => {
    expect(estadoPlan(sub({ status: 'TRIALING', trialEndDate: '2026-08-30' }), HOY)?.tono).toBe(
      'warning',
    )
    expect(estadoPlan(sub({ status: 'TRIALING', trialEndDate: '2026-12-30' }), HOY)?.tono).toBe(
      'none',
    )
    expect(trialDaysLeft(sub({ trialEndDate: '2026-08-30' }), HOY)).toBe(2)
  })

  it('la salida de la prueba apunta a «Tus módulos», no a «Mi plan»', () => {
    const estado = estadoPlan(sub({ status: 'TRIALING', trialEndDate: '2026-08-30' }), HOY)
    expect(estado?.accion).toEqual(VER_MODULOS)
    expect(estado?.frase).toContain('algunos módulos siguen gratis con límites')
    expect(estado?.frase).toContain('otros pasan a solo consulta')
  })

  it('no pinta un botón muerto en los estados sin salida', () => {
    expect(estadoPlan(sub({ status: 'CANCELLED' }), HOY)?.accion).toBeNull()
    expect(estadoPlan(sub({ status: 'EXPIRED' }), HOY)?.accion).toBeNull()
  })
})

describe('estadoSuscripcion · aviso post-vencimiento («recién repartida»)', () => {
  it('solo aplica a una cuenta ACTIVE con trialEndDate en los últimos 3 días', () => {
    expect(enVentanaDeReparto(sub({ status: 'ACTIVE', trialEndDate: '2026-08-26' }), HOY)).toBe(
      true,
    )
    expect(enVentanaDeReparto(sub({ status: 'ACTIVE', trialEndDate: '2026-08-20' }), HOY)).toBe(
      false,
    )
    expect(enVentanaDeReparto(sub({ status: 'TRIALING', trialEndDate: '2026-08-26' }), HOY)).toBe(
      false,
    )
    expect(enVentanaDeReparto(null, HOY)).toBe(false)
  })

  it('cuenta n solo lectura y m gratis con techo, con concordancia de número', () => {
    const estado = estadoPostVencimiento(
      sub({ status: 'ACTIVE', trialEndDate: '2026-08-26' }),
      2,
      1,
      HOY,
    )
    expect(estado?.fuerte).toBe('Tu prueba terminó:')
    expect(estado?.frase).toBe(
      '2 módulos quedaron en solo lectura y 1 módulo siguen gratis con techo.',
    )
    expect(estado?.tono).toBe('warning')
    expect(estado?.accion).toEqual(VER_MODULOS)
  })

  it('sin nada que repartir (0 y 0) no hay aviso', () => {
    expect(
      estadoPostVencimiento(sub({ status: 'ACTIVE', trialEndDate: '2026-08-26' }), 0, 0, HOY),
    ).toBeNull()
  })

  it('fuera de la ventana no hay aviso aunque haya módulos repartidos', () => {
    expect(
      estadoPostVencimiento(sub({ status: 'ACTIVE', trialEndDate: '2026-08-01' }), 3, 2, HOY),
    ).toBeNull()
  })
})

describe('estadoSuscripcion · un contrato vigente de alta no es un plan contratado', () => {
  it('un `INITIAL` vigente no cuenta, aunque el status sea ACTIVE', () => {
    expect(esPlanContratado(sub({ status: 'ACTIVE', origin: 'INITIAL' }))).toBe(false)
  })

  it('un `QUOTE` vigente sí cuenta', () => {
    expect(esPlanContratado(sub({ status: 'ACTIVE', origin: 'QUOTE' }))).toBe(true)
  })

  it('sin `origin` (respuesta antigua) se comporta como hoy: vigente cuenta', () => {
    expect(esPlanContratado(sub({ status: 'ACTIVE' }))).toBe(true)
  })

  it('un `INITIAL` que ya no está vigente sigue sin contar, por el mismo motivo que cualquier otro', () => {
    expect(esPlanContratado(sub({ status: 'CANCELLED', origin: 'INITIAL' }))).toBe(false)
  })

  it('nulo o indefinido nunca cuenta', () => {
    expect(esPlanContratado(null)).toBe(false)
    expect(esPlanContratado(undefined)).toBe(false)
  })
})

describe('estadoSuscripcion · baja registrada', () => {
  it('es un hecho del plan, con las dos fechas', () => {
    const texto = bajaRegistrada(
      sub({ cancelRequestedAt: '2026-08-10', cancelEffectiveDate: '2026-08-31' }),
    )
    expect(texto).toContain('Sigues trabajando con normalidad hasta el')
    expect(texto).toContain('ya está pagado')
  })

  it('no dice nada cuando no hay baja', () => {
    expect(bajaRegistrada(sub())).toBeNull()
  })
})
