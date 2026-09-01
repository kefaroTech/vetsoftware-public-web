import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { olvidarSesiones } from '@/features/asistente/api/asistente.source'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import PropuestaOrigenAviso from '@/features/asistente/components/PropuestaOrigenAviso.vue'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import type { AssistantProposalResponse } from '@/features/asistente/types/asistente.types'
import { http } from '@/services/http/http.client'

/**
 * DE DÓNDE SALIÓ EL CARRITO QUE PONE «TU PROPUESTA» ENCIMA.
 *
 * ── El defecto que fija ────────────────────────────────────────────────────
 * `PROPOSAL` y `DETERMINISTIC` colapsaban en la misma clase del seam, así que
 * la pantalla no podía distinguirlos. Con el acceso al modelo deshabilitado
 * —el estado real de hoy— el servidor responde `DETERMINISTIC`, el carrito se
 * pinta bajo el encabezado «Tu propuesta» y **no hay ningún aviso**. Quien cree
 * que se le leyó el texto no revisa las líneas y contrata módulos que no va a
 * usar: lo contrario exacto de «paga solo lo que uses», en la pantalla que
 * decide la compra y para el 100 % de los usuarios actuales.
 *
 * ── Por qué muerde de verdad ───────────────────────────────────────────────
 * El caso recorre la cadena entera desde el cuerpo de la respuesta hasta el
 * DOM: `presentation` → `comoResultado` → `leyoElTexto` del discriminante →
 * el `ref` del store → la prop del panel → el `v-if` del aviso. Deshacer
 * **cualquiera** de los seis eslabones lo pone en rojo. Y no basta con afirmar
 * que el aviso aparece: el segundo caso es su contrapeso, porque un componente
 * que lo pintara siempre pasaría el primero y sería igual de deshonesto en la
 * otra dirección.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  // El árbol de esta pantalla llega hasta el store de `auth` —`useContratacion`
  // pregunta si hay sesión para saber a dónde lleva «continuar»— y ese store
  // registra sus dos manejadores en el cliente HTTP al crearse. Sin ellos el
  // doble deja el módulo incompleto y el store revienta al instanciarse.
  setRefreshHandler: vi.fn(),
  setSessionClearHandler: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'planes', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)

const TOKEN = 'a'.repeat(43)

function respuesta(
  presentation: AssistantProposalResponse['presentation'],
): AssistantProposalResponse {
  return {
    token: TOKEN,
    presentation,
    expiresAt: '2026-09-30T12:00:00',
    version: 1,
    lines: [
      {
        code: 'CORE',
        name: 'Núcleo',
        description: 'Lo mínimo de toda cuenta',
        kind: 'MODULE',
        quantity: 1,
        unitAmount: 39000,
        taxRate: 0.19,
        taxAmount: 7410,
        totalAmount: 46410,
        trialDays: 0,
        currency: 'COP',
        reason: null,
      },
    ],
    recommendations: [],
    discardedLines: 0,
    currency: 'COP',
    subtotal: 39000,
    taxes: 7410,
    total: 46410,
    firstPeriodTotal: 0,
    packOffer: null,
    refinementsLeft: 3,
    recalculated: true,
  }
}

/**
 * Monta el panel con **todo estibado menos el aviso**: lo que se comprueba es
 * su marcado real, no que exista una etiqueta con una prop bien puesta.
 */
async function panelTrasResponder(presentation: AssistantProposalResponse['presentation']) {
  const store = usePropuestaStore()
  store.texto = 'Clínica de barrio, consulta general y vacunas'
  store.email = 'ana@clinica.co'
  post.mockResolvedValueOnce({ data: respuesta(presentation) } as never)
  await store.generar([])

  const wrapper = mount(AsistentePanel, {
    shallow: true,
    props: { sinPaquetes: false },
    global: { stubs: { PropuestaOrigenAviso: false } },
  })
  await flushPromises()
  return wrapper
}

describe('El origen de la propuesta se dice en pantalla', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    olvidarSesiones()
    // El catálogo comercial se pide al montar. Nada de este caso depende de él,
    // pero sin respuesta el composable se queda con una promesa colgando y el
    // fallo aparecería lejos de su causa.
    get.mockResolvedValue({ data: { currency: 'COP', items: [], packs: [] } } as never)
  })

  it('rotula como punto de partida la propuesta que NADIE leyó (DETERMINISTIC)', async () => {
    const wrapper = await panelTrasResponder('DETERMINISTIC')

    // Hay propuesta: el caso no pasa por la puerta falsa de una pantalla vacía.
    expect(usePropuestaStore().estado).toBe('PROPUESTA_LISTA')

    const aviso = wrapper.find('[data-testid="propuesta-origen-base"]')
    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain('punto de partida, no una recomendación')
    // Dice qué hacer con él, que es lo único que convierte el aviso en útil.
    expect(aviso.text()).toContain('quita lo que no vayas a usar')
    // `status` y no `alert`: no ha fallado nada, hay una propuesta contratable.
    expect(aviso.attributes('role')).toBe('status')
  })

  it('NO lo rotula cuando el modelo sí leyó el texto (PROPOSAL)', async () => {
    const wrapper = await panelTrasResponder('PROPOSAL')

    expect(usePropuestaStore().estado).toBe('PROPUESTA_LISTA')
    expect(wrapper.find('[data-testid="propuesta-origen-base"]').exists()).toBe(false)
  })

  it('el aviso vive en su propio componente y se apaga solo con la prop', () => {
    const conAviso = mount(PropuestaOrigenAviso, { props: { leyoElTexto: false } })
    expect(conAviso.find('[data-testid="propuesta-origen-base"]').exists()).toBe(true)

    const sinAviso = mount(PropuestaOrigenAviso, { props: { leyoElTexto: true } })
    expect(sinAviso.find('[data-testid="propuesta-origen-base"]').exists()).toBe(false)
  })

  it('la espera ya no afirma que se está leyendo el texto', async () => {
    const { FRASES_ESPERA } = await import('@/features/asistente/content/copy.content')
    const primera = FRASES_ESPERA[0]?.texto ?? ''
    // Era falsa en el 100 % de las peticiones y montaba la expectativa que el
    // aviso de arriba tiene que desmentir después.
    expect(primera).not.toContain('leyendo')
    expect(primera).toBe('Estamos preparando tu propuesta.')
  })
})
