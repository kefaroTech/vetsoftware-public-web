import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { CONTRATACION_INTENCION_KEY } from '@/constants/storageKeys'
import ContratarView from '@/features/contratacion/views/ContratarView.vue'
import { useResultadoContratacionStore } from '@/features/contratacion/stores/resultadoContratacion.store'
import type { EstadoPlanActual } from '@/features/suscripcion/composables/estadoSuscripcion'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'
import { elemento, exigir } from '../helpers/exigir'

/**
 * EL PASO VINCULANTE, MONTADO.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * Antes de este fichero, `ContratarView` no lo montaba **ninguna** prueba
 * unitaria: lo único que lo tocaba era el spec de Playwright, que corre en otro
 * job, necesita servidor y navegador, y no entra en `npm run test:coverage` — que
 * es la puerta que el CI mira en cada PR. Los cuatro estados que deciden si el
 * usuario puede comprar y qué ve cuando algo falla (permiso, sin precio, deriva
 * de precio, error del servidor) podían romperse sin poner nada en rojo hasta la
 * siguiente pasada de e2e.
 *
 * ── La convención que se afirma, y por qué así ─────────────────────────────
 * Sin `quote.request` el control **no existe en el DOM**; no está `disabled`. La
 * diferencia importa: un botón apagado sin motivo visible se lee como una avería
 * de la aplicación, y aquí no ha fallado nada — es una clínica en mora, que en
 * nivel `READ_ONLY` pierde ese permiso. Por eso cada caso afirma las DOS mitades:
 * el control ausente **y** que no sale ninguna petición que el gate del servidor
 * fuera a negar con un 403.
 */

const selfServe = vi.fn<(payload: unknown) => Promise<QuoteResponse>>()
const findById = vi.fn()
const push = vi.fn()
const replace = vi.fn()
const errorFrom = vi.fn()
const toastInfo = vi.fn()
const cargarSuscripcion = vi.fn()

const permisos = ref<string[]>([])
const estadoPlanActual = ref<EstadoPlanActual>('SIN_PLAN')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  // `ContratarResumenTabla` y `LegalConsentCheckbox` importan `RouterLink` del
  // módulo, no del registro global: sin exportarlo aquí el doble deja el
  // componente sin resolver y la pantalla revienta al pintar el resumen.
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    me: ref({ permissions: permisos.value, branchIds: [] }),
    companyId: ref(7),
  }),
}))

vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ estadoPlanActual, load: cargarSuscripcion }),
}))

vi.mock('@/features/empresa/api/company.api', () => ({
  companyApi: { findById: (id: number) => findById(id) },
}))

vi.mock('@/features/suscripcion/api/cotizaciones.api', () => ({
  cotizacionesApi: { selfServe: (p: unknown) => selfServe(p) },
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    info: toastInfo,
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom,
    warnFrom: vi.fn(),
    remove: vi.fn(),
  }),
}))

const OFERTA: QuoteResponse = {
  id: 55,
  quoteNumber: 'COT-2026-0055',
  subtotalAmount: 777_321,
  taxAmount: 147_690,
  totalAmount: 925_011,
  validUntil: '2026-09-13',
  status: 'SENT',
}

/** El precio de lista de `PACK_CLINIC` con 1 sede y 1 persona, sin impuesto. */
const SUBTOTAL_MENSUAL_PACK_CLINIC = 189_000

function sembrarIntencion(importeVistoMensual: number | null = SUBTOTAL_MENSUAL_PACK_CLINIC) {
  window.localStorage.setItem(
    CONTRATACION_INTENCION_KEY,
    JSON.stringify({
      planCode: 'PACK_CLINIC',
      ciclo: 'MENSUAL',
      sedes: 1,
      usuarios: 1,
      importeVistoMensual,
      selloRevisadoEl: '2026-08-29',
      creadaEn: new Date().toISOString(),
      descartada: false,
    }),
  )
}

const STUBS = {
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}

async function montar(opciones: { attachTo?: HTMLElement } = {}) {
  const wrapper = mount(ContratarView, { global: { stubs: STUBS }, ...opciones })
  // Tres vueltas: el catálogo, la suscripción y el resumen encadenan promesas.
  await flushPromises()
  await flushPromises()
  await flushPromises()
  return wrapper
}

/** El botón vinculante, buscado por su rótulo y no por una clase de CSS. */
function botonConfirmar(wrapper: Awaited<ReturnType<typeof montar>>) {
  return wrapper.findAll('button').filter((b) => b.text().includes('Confirmar mi plan'))
}

beforeEach(() => {
  window.localStorage.clear()
  selfServe.mockReset().mockResolvedValue(OFERTA)
  findById.mockReset().mockResolvedValue({ id: 7, name: 'Clínica Norte', identifier: '900123456' })
  push.mockReset()
  replace.mockReset()
  errorFrom.mockReset()
  toastInfo.mockReset()
  cargarSuscripcion.mockReset().mockResolvedValue(undefined)
  permisos.value = ['quote.request']
  estadoPlanActual.value = 'SIN_PLAN'
  sembrarIntencion()
})

describe('la puerta del permiso `quote.request`', () => {
  it('sin el permiso el control está AUSENTE del DOM, no deshabilitado', async () => {
    // Las dos afirmaciones son distintas y hacen falta las dos: si alguien
    // «arreglara» esto poniendo `:disabled="!puedeContratar"`, la primera
    // seguiría pasando con `toHaveLength(1)` y solo esta lo cazaría.
    permisos.value = []
    const wrapper = await montar()

    expect(botonConfirmar(wrapper)).toHaveLength(0)
    expect(wrapper.find('input[type="checkbox"]').exists(), 'ni casilla que aceptar').toBe(false)
    // Y no queda ningún botón deshabilitado haciéndose pasar por el control.
    expect(wrapper.findAll('button[disabled]')).toHaveLength(0)
  })

  it('sin el permiso se dice quién puede hacerlo, en `status` y no en `alert`', async () => {
    permisos.value = []
    const wrapper = await montar()

    const aviso = wrapper.find('[role="status"]')
    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain('no puede confirmar la contratación')
    // `alert` corta la locución en curso para dar una noticia que no lo es: no
    // ha fallado nada, es el estado de la cuenta.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('sin el permiso NO sale ninguna petición, ni siquiera saliendo del embudo', async () => {
    // La segunda mitad del gate. El control ausente evita el clic; esto evita que
    // cualquier otro camino de la pantalla mande una oferta que el servidor va a
    // negar con un 403.
    permisos.value = []
    const wrapper = await montar()

    const ahoraNo = wrapper.findAll('button').find((b) => b.text().includes('Ahora no'))
    expect(ahoraNo, '«Ahora no» sigue estando: hay que poder salir').toBeDefined()
    await exigir(ahoraNo, 'ahoraNo').trigger('click')
    await flushPromises()

    expect(selfServe).not.toHaveBeenCalled()
  })

  it('con el permiso el control SÍ está, y con él la casilla de términos', async () => {
    // El control del caso anterior: sin esto, un fallo que escondiera el botón
    // para todo el mundo pasaría las tres pruebas de arriba en verde.
    const wrapper = await montar()

    expect(botonConfirmar(wrapper)).toHaveLength(1)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })
})

describe('la casilla de términos es una puerta, no un adorno', () => {
  it('sin marcarla no se manda nada y se dice qué falta', async () => {
    const wrapper = await montar()

    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe, 'no se pide la oferta sin aceptar los términos').not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Tienes que aceptar los Términos para continuar')
  })

  it('marcada, se manda la oferta y se navega al éxito con los importes DEL SERVIDOR', async () => {
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe).toHaveBeenCalledTimes(1)
    expect(elemento(selfServe.mock.calls, 0, 'selfServe.mock.calls')[0]).toMatchObject({
      billingCycle: 'MONTHLY',
      lines: [{ code: 'PACK_CLINIC', quantity: 1 }],
    })
    expect(push).toHaveBeenCalledWith({ name: 'contratar-exito' })

    // Y lo que la pantalla de éxito va a leer son las cifras de la oferta, no el
    // estimado local: 777.321 no es 189.000 y no hay forma de llegar a él
    // calculando.
    const guardado = useResultadoContratacionStore().resultado
    expect(guardado?.subtotal).toBe(777_321)
    expect(guardado?.subtotal).not.toBe(SUBTOTAL_MENSUAL_PACK_CLINIC)
    expect(guardado?.cotizacionNumero).toBe('COT-2026-0055')
  })

  it('la llave de idempotencia se genera UNA vez por pantalla, no por clic', async () => {
    // Es lo que hace que un doble clic no cree dos ofertas. Se comprueba con dos
    // envíos consecutivos: la segunda llamada tiene que llevar la misma llave.
    const wrapper = await montar()
    await wrapper.find('input[type="checkbox"]').setValue(true)

    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()
    selfServe.mockRejectedValueOnce(new Error('reintento'))
    await botonConfirmar(wrapper)[0]?.trigger('click')
    await flushPromises()

    const llaves = selfServe.mock.calls.map(
      (c) => (c[0] as { clientRequestId: string }).clientRequestId,
    )
    expect(llaves[0]).toBeTruthy()
    expect(new Set(llaves).size, 'la misma llave en los dos envíos').toBe(1)
  })
})

describe('§5 caso 3 · el precio se movió mientras decidía', () => {
  it('el aviso lleva LAS DOS cifras, y la casilla se ve sin marcar', async () => {
    // 150.000 es lo que el usuario vio; 189.000 es el precio de lista de hoy.
    // Sin las dos cifras el aviso no puede ser verdad: «el precio cambió» sin
    // decir de cuánto a cuánto no permite decidir nada.
    sembrarIntencion(150_000)
    const wrapper = await montar()

    const aviso = wrapper.find('[role="alert"]')
    expect(aviso.exists(), 'la deriva SÍ es una noticia: va en `alert`').toBe(true)
    expect(aviso.text()).toContain('El precio cambió desde que lo elegiste')
    expect(aviso.text()).toMatch(/150[.,]000/)
    expect(aviso.text()).toMatch(/189[.,]000/)

    // La casilla está sin marcar, y este caso ya NO pretende que eso demuestre
    // una salvaguarda. Lo dice como estado: es lo que el usuario se encuentra.
    //
    // La línea `aceptaTerminos.value = false` que vivía en `cargar()` y que tres
    // docblocks vendían como «la mitad que hace cumplir §3.3.4» era inalcanzable
    // —la casilla no está pintada cuando la comparación corre— y se quitó. Lo
    // que de verdad protege la decisión son las dos afirmaciones de los casos
    // siguientes: el aviso se lleva el FOCO, y sin marcar no sale nada.
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('el aviso se lleva el FOCO, que es la mitad de §3.3.4 que esta pantalla sí tiene', async () => {
    // Y esta afirmación SÍ tiene puerta. El orden dentro de `cargar()` es lo que
    // la sostiene: el velo (`cargando`) tiene que caer ANTES de la comparación,
    // porque mientras vale `true` la plantilla pinta «Cargando tu resumen…»,
    // `PriceDriftNotice` no existe todavía y `driftRef` es `null` — el `focus()`
    // no llamaba a nadie. El aviso salía sin foco y quien navega con lector de
    // pantalla no se enteraba de que el precio había cambiado.
    //
    // Hace falta `attachTo`: sin el árbol en el documento, `focus()` no mueve
    // `document.activeElement` y la comprobación pasaría por no mirar nada.
    sembrarIntencion(150_000)
    const wrapper = await montar({ attachTo: document.body })

    const aviso = wrapper.find('[role="alert"]')
    expect(aviso.exists()).toBe(true)
    expect(document.activeElement, 'el foco va al aviso, no se queda donde estaba').toBe(
      aviso.element,
    )

    wrapper.unmount()
  })

  it('con la deriva en pantalla, confirmar a ciegas no manda nada', async () => {
    // El desenlace observable: quien ve el aviso no puede completar la compra
    // sin volver a leer y volver a aceptar. Esta SÍ se rompe si alguien deja
    // pasar la confirmación con la casilla sin marcar.
    sembrarIntencion(150_000)
    const wrapper = await montar()

    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe).not.toHaveBeenCalled()
  })

  it('sin deriva no hay aviso: el caso feliz no paga el precio del raro', async () => {
    const wrapper = await montar()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('sin importe guardado NO se inventa una comparación', async () => {
    // Una intención vieja o corrupta deja `importeVistoMensual` en `null`. Un
    // lado vacío no es deriva: es un hueco. Comparar contra `0` sacaba el aviso
    // «Cuando lo elegiste: $ 0» contra una cifra que nadie vio nunca.
    sembrarIntencion(null)
    const wrapper = await montar()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('El precio cambió')
  })
})

describe('cuando el servidor rechaza la oferta', () => {
  it('el fallo se cuenta DENTRO de la pantalla, con la traza, y no se navega', async () => {
    // Un toast se va solo, y este es el clic más importante del embudo. El texto
    // afirma además las dos cosas que el usuario necesita saber para no repetir
    // la compra por miedo: no se cambió nada y no se cobró nada.
    selfServe.mockRejectedValue(new Error('500'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    const banner = wrapper.find('[role="alert"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('No pudimos registrar tu contratación')
    expect(banner.text()).toContain('no se te ha cobrado nada')
    expect(
      push,
      'no se lleva al usuario a una pantalla de éxito que no ocurrió',
    ).not.toHaveBeenCalled()

    // Y el aviso va por `errorFrom`, que es lo que conserva el `X-Trace-Id`:
    // escribir el texto a mano en el `catch` tira la traza y soporte no
    // correlaciona nada.
    expect(errorFrom).toHaveBeenCalledTimes(1)
    expect(
      elemento(errorFrom.mock.calls, 0, 'errorFrom.mock.calls')[1],
      'el objeto de error entero, no su mensaje',
    ).toBeInstanceOf(Error)
  })

  it('el botón vuelve al reposo: se puede reintentar', async () => {
    // Dejarlo `disabled` para siempre después de un fallo de red convierte un
    // error recuperable en un embudo muerto.
    selfServe.mockRejectedValue(new Error('red caída'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(
      elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').attributes('disabled'),
    ).toBeUndefined()
    expect(elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').text()).toContain(
      'Confirmar mi plan',
    )
  })

  it('el fallo NO consume la intención: el usuario sigue teniendo su elección', async () => {
    // `marcarContratada()` descarta la intención para que el enganche del login
    // no reabra el embudo. Llamarlo en el camino de error dejaría al usuario sin
    // oferta Y sin selección guardada, y volver a entrar le pediría elegir otra
    // vez.
    selfServe.mockRejectedValue(new Error('500'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    const crudo = window.localStorage.getItem(CONTRATACION_INTENCION_KEY)
    expect(crudo).not.toBeNull()
    expect(JSON.parse(exigir(crudo, 'crudo')).descartada).toBe(false)
    expect(useResultadoContratacionStore().resultado).toBeNull()
  })
})

describe('§5 caso 6 · la empresa ya tiene plan', () => {
  it('no se le ofrece otro: aviso `info`, intención descartada y fuera del embudo', async () => {
    // `CON_PLAN` es la señal REAL del servidor. La bandera en memoria que había
    // antes volvía a `false` en cada recarga, así que este caso solo saltaba si
    // el usuario acababa de contratar en esa misma pestaña.
    estadoPlanActual.value = 'CON_PLAN'
    await montar()

    expect(toastInfo).toHaveBeenCalledTimes(1)
    expect(elemento(toastInfo.mock.calls, 0, 'toastInfo.mock.calls')[0]).toContain(
      'ya tiene un plan activo',
    )
    expect(replace).toHaveBeenCalledWith({ name: 'home' })
    expect(
      JSON.parse(
        exigir(
          window.localStorage.getItem(CONTRATACION_INTENCION_KEY),
          'window.localStorage.getItem(CONTRATACION_INTENCION_KEY)',
        ),
      ).descartada,
    ).toBe(true)
  })

  it('un `DESCONOCIDO` NO cierra la puerta, pero tampoco se calla', async () => {
    // Un 403 del rol sin `subscription.read` llega como `DESCONOCIDO`. Echar del
    // embudo a quien QUIZÁ no tiene plan por un permiso que no podemos leer es
    // peor que dejarle seguir; dejarle creer que se comprobó, también.
    estadoPlanActual.value = 'DESCONOCIDO'
    const wrapper = await montar()

    expect(replace).not.toHaveBeenCalled()
    expect(botonConfirmar(wrapper), 'sigue pudiendo contratar').toHaveLength(1)
    expect(wrapper.text()).toContain('No pudimos comprobar si tu clínica ya tiene un plan')
  })
})
