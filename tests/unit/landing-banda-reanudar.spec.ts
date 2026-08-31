import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { ASISTENTE_PROPUESTA_KEY, CONTRATACION_INTENCION_KEY } from '@/constants/storageKeys'
import { olvidarSesiones } from '@/features/asistente/api/asistente.source'
import LandingView from '@/features/landing/views/LandingView.vue'
import ResumeIntentBanner from '@/features/landing/components/ResumeIntentBanner.vue'
import type { PublicCatalog } from '@/features/landing/types/plans.types'

/**
 * LA BANDA DE «SIGUE DONDE LO DEJASTE», PARA LAS DOS FORMAS DE INTENCIÓN.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * La banda solo miraba `origen === 'PLAN'`. Quien dejaba a medias una
 * **propuesta a medida** —la entrada más cara de toda la landing: un párrafo
 * escrito sobre el propio negocio y unos segundos de espera— volvía y no se le
 * ofrecía absolutamente nada. La carencia estaba escrita en el código como
 * aceptada, que es la forma en la que un hueco deja de verse.
 *
 * ── Cómo muerde ────────────────────────────────────────────────────────────
 * El primer caso monta la landing con una intención de propuesta guardada. Con
 * el `if (i.origen !== 'PLAN') return null` de antes, la banda no existe en el
 * DOM y el caso falla. El tercero es su contrapeso: sin token local no hay banda,
 * porque «seguimos donde lo dejaste» sería una promesa que el botón no puede
 * cumplir.
 */

const push = vi.fn()
const replace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'landing', query: {} }),
  useRouter: () => ({ push, replace }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  // El árbol de esta pantalla llega hasta el store de `auth` —`useContratacion`
  // pregunta si hay sesión para saber a dónde lleva «continuar»— y ese store
  // registra sus dos manejadores en el cliente HTTP al crearse. Sin ellos el
  // doble deja el módulo incompleto y el store revienta al instanciarse.
  setRefreshHandler: vi.fn(),
  setSessionClearHandler: vi.fn(),
}))

const catalogo: PublicCatalog = {
  currency: 'COP',
  priceValidFrom: '2026-01-01',
  plans: [
    {
      code: 'PACK_CLINICA',
      name: 'Clínica',
      tagline: 'Para la clínica que ya rueda',
      monthlyFromAmount: 149_000,
      annualFromAmount: 1_490_000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: null,
      includes: [],
      capacities: [],
      recommended: true,
    },
  ],
}

vi.mock('@/features/landing/api/plans.source', () => ({
  fetchPlans: () => Promise.resolve(catalogo),
}))

const TOKEN = 'd'.repeat(43)

/** Una intención guardada, con la forma exacta que persiste `contratacion.store`. */
function sembrarIntencion(extra: Record<string, unknown>): void {
  window.localStorage.setItem(
    CONTRATACION_INTENCION_KEY,
    JSON.stringify({
      ciclo: 'MENSUAL',
      sedes: 2,
      usuarios: 4,
      importeVistoMensual: 149_000,
      selloRevisadoEl: '2026-01-01',
      creadaEn: new Date().toISOString(),
      descartada: false,
      ...extra,
    }),
  )
}

/** El espejo del seam: es lo que hace que este dispositivo pueda releer `p-1`. */
function sembrarSesionDelAsistente(): void {
  window.localStorage.setItem(
    ASISTENTE_PROPUESTA_KEY,
    JSON.stringify({
      contador: 1,
      filas: [{ id: 'p-1', token: TOKEN, codigos: ['CORE'], manuales: [] }],
    }),
  )
}

async function montarLanding() {
  const wrapper = shallowMount(LandingView)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // El registro de sesiones del seam es estado de MÓDULO y sobrevive entre
  // casos: sin vaciarlo, el `p-1` que hidrató el primer caso deja
  // `conocePropuesta` en `true` para todos los demás y el contrapeso de abajo
  // pasaría por accidente. Va antes de sembrar: `olvidarSesiones` borra también
  // la clave del espejo.
  olvidarSesiones()
  window.localStorage.clear()
})

describe('la banda con una propuesta a medida pendiente', () => {
  it('aparece, que es justo lo que no hacía', async () => {
    sembrarSesionDelAsistente()
    sembrarIntencion({ origen: 'PROPUESTA', propuestaId: 'p-1' })

    const banda = (await montarLanding()).findComponent(ResumeIntentBanner)

    expect(banda.exists()).toBe(true)
    expect(banda.props('origen')).toBe('PROPUESTA')
    // Y sin nombre de paquete: una propuesta a medida no tiene `planCode`, y
    // pintar uno cualquiera sería enseñarle al prospecto una elección que no
    // hizo.
    expect(banda.props('planNombre')).toBeUndefined()
    expect(banda.props('sedes')).toBe(2)
    expect(banda.props('usuarios')).toBe(4)
  })

  it('sigue apareciendo para un paquete, con su nombre', async () => {
    sembrarIntencion({ origen: 'PLAN', planCode: 'PACK_CLINICA' })

    const banda = (await montarLanding()).findComponent(ResumeIntentBanner)

    expect(banda.exists()).toBe(true)
    expect(banda.props('origen')).toBe('PLAN')
    expect(banda.props('planNombre')).toBe('Clínica')
  })

  it('NO aparece si este dispositivo ya no puede releer la propuesta', async () => {
    // Intención guardada, pero sin espejo del seam: es el caso «cambió de
    // dispositivo». Ofrecer «Seguimos donde lo dejaste» llevaría a `/planes` con
    // el cuadro de texto vacío — una promesa que el botón no puede cumplir.
    sembrarIntencion({ origen: 'PROPUESTA', propuestaId: 'p-1' })

    const banda = (await montarLanding()).findComponent(ResumeIntentBanner)

    expect(banda.exists()).toBe(false)
  })

  it('sin intención guardada no hay banda', async () => {
    const banda = (await montarLanding()).findComponent(ResumeIntentBanner)

    expect(banda.exists()).toBe(false)
  })
})

describe('lo que la banda dice', () => {
  it('con una propuesta no habla de ningún plan', () => {
    const texto = mount(ResumeIntentBanner, {
      props: { origen: 'PROPUESTA', sedes: 2, usuarios: 4 },
    }).text()

    expect(texto).toContain('tu propuesta a medida')
    // La frase del paquete —«Estabas mirando el plan …»— dejaría un hueco donde
    // iba el nombre, o peor, el nombre de un paquete que nadie eligió.
    expect(texto).not.toContain('el plan')
    expect(texto).toContain('2 sedes')
    expect(texto).toContain('4 personas')
  })

  it('con un paquete sigue diciendo su nombre', () => {
    const texto = mount(ResumeIntentBanner, {
      props: { origen: 'PLAN', planNombre: 'Clínica', sedes: 1, usuarios: 1 },
    }).text()

    expect(texto).toContain('el plan')
    expect(texto).toContain('Clínica')
    expect(texto).not.toContain('tu propuesta a medida')
  })
})
