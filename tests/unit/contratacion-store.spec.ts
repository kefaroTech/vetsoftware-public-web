import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTRATACION_INTENCION_KEY } from '@/constants/storageKeys'
import {
  INTENCION_MAX_DIAS,
  estaCaducada,
  useContratacionStore,
} from '@/features/contratacion/stores/contratacion.store'
import type {
  IntencionContratacion,
  IntencionPlan,
} from '@/features/contratacion/types/contratacion.types'

/**
 * La intención de contratación y su espejo en `localStorage`.
 *
 * Es lo que hace que el embudo sobreviva al salto de verificación por correo,
 * que puede durar días y cambiar de dispositivo. Sin espejo, quien elige el
 * martes y verifica el jueves llega al tablero sin nada y tiene que volver a
 * empezar — que es donde se pierde la conversión.
 */

const MS_POR_DIA = 86_400_000

function intencion(over: Partial<IntencionPlan> = {}): IntencionPlan {
  return {
    origen: 'PLAN',
    planCode: 'PACK_CLINIC',
    ciclo: 'MENSUAL',
    sedes: 1,
    usuarios: 1,
    importeVistoMensual: 179000,
    selloRevisadoEl: '2026-08-28',
    creadaEn: new Date().toISOString(),
    descartada: false,
    ...over,
  }
}

function escribirEspejo(valor: unknown): void {
  window.localStorage.setItem(CONTRATACION_INTENCION_KEY, JSON.stringify(valor))
}

/** El `planCode` de la intención vigente, o `undefined` si no la hay o no es de plan. */
function planVigente(store: ReturnType<typeof useContratacionStore>): string | undefined {
  const i = store.vigente
  return i && i.origen === 'PLAN' ? i.planCode : undefined
}

function leerEspejo(): IntencionContratacion | null {
  const crudo = window.localStorage.getItem(CONTRATACION_INTENCION_KEY)
  return crudo ? (JSON.parse(crudo) as IntencionContratacion) : null
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('la clave del espejo', () => {
  it('es exactamente `vs.contratacion.intencion.v1`', () => {
    // Las pruebas de Playwright siembran esta clave a mano —no pueden importar
    // `@/constants/storageKeys`, que usa el alias de Vite—. Esta afirmación es
    // la atadura entre aquel literal y esta constante: si alguien la renombra,
    // aquí se pone rojo en vez de dejar seis casos e2e verdes sin sembrar nada.
    expect(CONTRATACION_INTENCION_KEY).toBe('vs.contratacion.intencion.v1')
  })

  it('lleva versión en el nombre', () => {
    // El `v1` no es adorno: cuando la forma cambie, una clave nueva evita leer
    // un objeto viejo con campos que ya no existen.
    expect(CONTRATACION_INTENCION_KEY).toMatch(/\.v\d+$/)
  })
})

describe('caducidad a 30 días', () => {
  it('el tope declarado son 30 días', () => {
    expect(INTENCION_MAX_DIAS).toBe(30)
  })

  it('a los 29 días sigue viva y a los 31 ya no', () => {
    const ahora = Date.now()
    const dias = (n: number) =>
      intencion({ creadaEn: new Date(ahora - n * MS_POR_DIA).toISOString() })

    expect(estaCaducada(dias(29), ahora)).toBe(false)
    expect(estaCaducada(dias(31), ahora)).toBe(true)
  })

  it('una fecha ilegible se trata como caducada, no como eterna', () => {
    expect(estaCaducada(intencion({ creadaEn: 'ayer por la tarde' }))).toBe(true)
  })

  it('hidratar borra del almacenamiento lo que ya venció', () => {
    escribirEspejo(intencion({ creadaEn: new Date(Date.now() - 31 * MS_POR_DIA).toISOString() }))

    const store = useContratacionStore()
    store.hidratar()

    expect(store.vigente).toBeNull()
    // Se borra en el mismo acto: si solo se ignorara, reaparecería en la
    // siguiente visita y el precio de hace un mes volvería a la pantalla.
    expect(leerEspejo()).toBeNull()
  })
})

describe('lo que se lee del almacenamiento', () => {
  it('una entrada corrupta se descarta en vez de arrastrarse', () => {
    window.localStorage.setItem(CONTRATACION_INTENCION_KEY, '{esto no es json')
    const store = useContratacionStore()
    store.hidratar()
    expect(store.intencion).toBeNull()
  })

  it('una entrada sin plan no se acepta', () => {
    escribirEspejo({ ...intencion(), planCode: '' })
    useContratacionStore().hidratar()
    expect(useContratacionStore().intencion).toBeNull()
  })

  it('una entrada con un ciclo inventado tampoco', () => {
    // Iba en el mismo caso que el de arriba —«sin plan O con ciclo inventado»—
    // y solo se probaba la primera mitad: borrar la comprobación del ciclo
    // dejaba la prueba verde con su propio título describiendo lo contrario.
    // Y no es simetría de adorno: `ciclo` alimenta `CICLO_DEL_CONTRATO`, que
    // indexa un `Record` cerrado. Un valor de fuera de la unión llega al cuerpo
    // de `POST /quotes/self-serve` como `undefined` y el `@Pattern` del borde
    // REST lo rechaza con un 400 en el clic vinculante.
    escribirEspejo({ ...intencion(), ciclo: 'TRIMESTRAL' })
    useContratacionStore().hidratar()
    expect(useContratacionStore().intencion).toBeNull()
  })

  it('rellena con mínimos los números que falten, sin inventar el importe', () => {
    escribirEspejo({ planCode: 'PACK_CLINIC', ciclo: 'ANUAL', creadaEn: new Date().toISOString() })
    const store = useContratacionStore()
    store.hidratar()

    expect(store.intencion?.sedes).toBe(1)
    expect(store.intencion?.usuarios).toBe(1)
    // `null`, que es lo que dice el nombre de esta prueba. Aquí se rellenaba con
    // `0`, y un cero guardado como «el importe que el usuario vio» SÍ es inventarlo:
    // el paso 6 compara este valor para detectar deriva de precio, así que cada
    // entrada vieja o corrupta sacaba el aviso «Cuando lo elegiste: $ 0» contra una
    // cifra que nadie vio. Sin dato no hay comparación, y el paso 6 lo respeta.
    expect(store.intencion?.importeVistoMensual).toBeNull()
  })
})

describe('descartar, limpiar y volver a elegir', () => {
  it('«ahora no» marca, no borra', () => {
    const store = useContratacionStore()
    store.guardar({ planCode: 'PACK_CLINIC', ciclo: 'MENSUAL', sedes: 1, usuarios: 1 }, 179000, 'x')

    store.descartar()

    // Borrarla haría que el enganche del login volviera a disparar en la
    // siguiente navegación, y eso es una jaula.
    expect(leerEspejo()).not.toBeNull()
    expect(leerEspejo()?.descartada).toBe(true)
    expect(store.vigente, 'descartada deja de ser vigente').toBeNull()
    expect(store.hayIntencionVigente).toBe(false)
  })

  it('«empezar de nuevo» sí borra', () => {
    const store = useContratacionStore()
    store.guardar({ planCode: 'PACK_CLINIC', ciclo: 'MENSUAL', sedes: 1, usuarios: 1 }, 179000, 'x')
    store.limpiar()
    expect(leerEspejo()).toBeNull()
  })

  it('reescribir la selección la «desdescarta»', () => {
    const store = useContratacionStore()
    store.guardar({ planCode: 'PACK_CLINIC', ciclo: 'MENSUAL', sedes: 1, usuarios: 1 }, 179000, 'x')
    store.descartar()

    store.guardar({ planCode: 'PACK_FULL', ciclo: 'ANUAL', sedes: 3, usuarios: 8 }, 329000, 'y')

    expect(planVigente(store)).toBe('PACK_FULL')
    expect(store.vigente?.descartada).toBe(false)
  })

  it('contratar descarta la intención, para que el guard no reabra el embudo', () => {
    const store = useContratacionStore()
    store.guardar({ planCode: 'PACK_CLINIC', ciclo: 'MENSUAL', sedes: 1, usuarios: 1 }, 179000, 'x')

    store.marcarContratada()

    // Ya no hay bandera `contratada`: era memoria de UNA pestaña y se usaba como si fuera la
    // respuesta a «¿esta clínica tiene plan?», que la contesta el servidor
    // (`GET /subscriptions/current`). Lo único que hace falta aquí es que la intención deje de
    // estar vigente, y eso SÍ persiste en el espejo de `localStorage`.
    expect(store.hayIntencionVigente).toBe(false)
    expect(store.intencion?.descartada).toBe(true)
  })
})

describe('el espejo sobrevive a que se vaya la pestaña', () => {
  it('`pagehide` vuelve a escribir lo que hay en memoria', () => {
    const store = useContratacionStore()
    store.hidratar()
    store.guardar({ planCode: 'PACK_CLINIC', ciclo: 'MENSUAL', sedes: 2, usuarios: 5 }, 200000, 'x')

    // Alguien (otra pestaña, una limpieza) se llevó el espejo por delante.
    window.localStorage.removeItem(CONTRATACION_INTENCION_KEY)

    // `pagehide` y NO `beforeunload`: en móvil e iOS el navegador puede congelar
    // la pestaña sin disparar nunca el segundo, y registrar un `beforeunload`
    // descalifica la página para el bfcache y hace más lento el «atrás».
    window.dispatchEvent(new Event('pagehide'))

    expect(leerEspejo()?.sedes).toBe(2)
    expect(leerEspejo()?.usuarios).toBe(5)
  })
})

describe('almacenamiento bloqueado (modo privado)', () => {
  it('el embudo sigue funcionando en memoria y no revienta', () => {
    const romper = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    try {
      const store = useContratacionStore()
      expect(() =>
        store.guardar({ planCode: 'PACK_CLINIC', ciclo: 'MENSUAL', sedes: 1, usuarios: 1 }, 1, 'x'),
      ).not.toThrow()
      // Lo que se pierde es la reanudación, no la compra.
      expect(planVigente(store)).toBe('PACK_CLINIC')
    } finally {
      romper.mockRestore()
    }
  })
})
