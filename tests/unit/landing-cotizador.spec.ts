import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import LandingCotizador from '@/features/landing/components/LandingCotizador.vue'
import { fetchCatalogo } from '@/features/asistente/api/catalogo.source'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import type * as cotizacionSource from '@/features/landing/api/cotizacion.source'
import { previsualizarCotizacion } from '@/features/landing/api/cotizacion.source'
import { useCotizador } from '@/features/landing/composables/useCotizador'
import type { CotizacionPreview } from '@/features/landing/types/cotizacion.types'
import { http } from '@/services/http/http.client'
import { catalogoEmbudo } from '../helpers/catalogo-embudo'
import { elemento } from '../helpers/exigir'

/**
 * LA TARJETA DEL HERO.
 *
 * ── Qué protege cada caso ──────────────────────────────────────────────────
 *  1. **Vacío + enviar navega, sin error.** El hero no puede ser una puerta
 *     cerrada; un error en el primer pliegue castiga a quien todavía no había
 *     decidido escribir.
 *  2. **El ejemplo es un VALOR, no un `placeholder`** —un placeholder
 *     desaparece al escribir y se lee como un valor ya introducido— y **no pisa
 *     lo que el visitante ya había escrito**, que es lo más caro de la pantalla.
 *  3. **Sin nada marcado se cotiza «Solo el núcleo» y se puede avanzar.** La
 *     selección vacía es un estado legítimo, no un error: nadie tiene que
 *     marcar nada para ver el siguiente paso.
 *  4. **Plegar un área no desmarca nada.** El cuerpo del área se desmonta al
 *     plegar; si la selección viviera en él, cerrar para ver mejor borraría lo
 *     comprado.
 *
 * ── La afirmación que necesita control positivo ────────────────────────────
 * «El texto libre no sale del navegador» y «no lo compruebo» producen la misma
 * salida verde si el espía no está conectado al módulo que el componente
 * importa. Por eso el último caso, después de afirmar que ninguna llamada lleva
 * el texto, provoca una a mano y exige que el mismo espía la vea.
 */

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

vi.mock('@/features/asistente/api/catalogo.source', () => ({ fetchCatalogo: vi.fn() }))

vi.mock('@/features/landing/api/cotizacion.source', async (original) => ({
  ...(await original<typeof cotizacionSource>()),
  previsualizarCotizacion: vi.fn(),
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)
const traerCatalogo = vi.mocked(fetchCatalogo)
const pedirCotizacion = vi.mocked(previsualizarCotizacion)

const COTIZACION: CotizacionPreview = {
  moneda: 'COP',
  ciclo: 'MENSUAL',
  lineas: [],
  subtotal: 187_000,
  descuento: 0,
  impuesto: 35_530,
  total: 222_530,
}

/** Una frase del ejemplo sembrado, que es lo que ninguna petición puede llevar. */
const DEL_EJEMPLO = 'clínica de barrio'

function montar() {
  let cotizador!: ReturnType<typeof useCotizador>
  const wrapper = mount(
    defineComponent({
      setup() {
        cotizador = useCotizador()
        return () => h(LandingCotizador, { cotizador })
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, cotizador }
}

/** Monta y deja el catálogo cargado: sin él no hay ni casillas ni cesta. */
async function conCatalogo() {
  const montado = montar()
  await flushPromises()
  return montado
}

describe('LandingCotizador — se arma el plan, y el relato se queda en el navegador', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    document.body.innerHTML = ''
    traerCatalogo.mockResolvedValue(catalogoEmbudo())
    pedirCotizacion.mockResolvedValue(COTIZACION)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('vacío y enviar: navega a /planes y NO enseña ningún error', async () => {
    const { wrapper } = montar()
    await wrapper.find('textarea').setValue('')

    await wrapper.find('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({ name: 'planes' })
    // El cero de `role="alert"` es la afirmación: no basta con que el texto del
    // error no esté, tiene que no haber región de error ninguna.
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
  })

  it('el ejemplo llega como VALOR del campo, nunca como placeholder', () => {
    const campo = montar().wrapper.find('textarea')

    expect(campo.element.value).toContain(DEL_EJEMPLO)
    expect(campo.attributes('placeholder')).toBeUndefined()
    expect(usePropuestaStore().texto).toContain(DEL_EJEMPLO)
  })

  it('el relato que el visitante ya había escrito no se pisa con el ejemplo', () => {
    usePropuestaStore().texto = 'Atendemos perros y gatos, y hacemos cirugía los martes.'

    const campo = montar().wrapper.find('textarea')

    expect(campo.element.value).toBe('Atendemos perros y gatos, y hacemos cirugía los martes.')
  })

  it('sin nada marcado: se cotiza «Solo el núcleo» y el botón sigue llevando a /planes', async () => {
    const { wrapper, cotizador } = await conCatalogo()

    expect(cotizador.modulos.value).toEqual([])
    expect(wrapper.get('.lpr-pack').text()).toBe('Solo el núcleo')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({ name: 'planes' })
  })

  it('plegar un área no desmarca nada: al volver a abrirla la casilla sigue marcada', async () => {
    const { wrapper, cotizador } = await conCatalogo()
    const cabecera = elemento(wrapper.findAll('h3 button'), 0, 'las cabeceras de área')

    await elemento(wrapper.findAll('input[type="checkbox"]'), 0, 'las casillas').setValue(true)
    const marcados = [...cotizador.modulos.value]
    expect(marcados).not.toHaveLength(0)

    await cabecera.trigger('click')
    expect(cabecera.attributes('aria-expanded')).toBe('false')
    expect(cotizador.modulos.value).toEqual(marcados)

    await cabecera.trigger('click')
    const casilla = elemento(wrapper.findAll('input[type="checkbox"]'), 0, 'las casillas')
    expect((casilla.element as HTMLInputElement).checked).toBe(true)
  })

  it('la tarjeta encabeza con su propio h2, del que cuelgan los h3 de área', async () => {
    const { wrapper } = await conCatalogo()
    const h2 = wrapper.get('#cotizador-h2')

    expect(h2.element.tagName).toBe('H2')
    expect(h2.text()).toBe('Arma tu plan y mira el precio')
    // El `h2` NO sustituye a la etiqueta del campo: un encabezado no es una
    // etiqueta programática.
    expect(wrapper.get('label').text()).toBe('Cuéntanos qué hace tu veterinaria')
    expect(wrapper.findAll('h3').length).toBeGreaterThan(0)
    // Y da nombre a la región: sin nombre accesible, un `<section>` no se expone
    // como `region` y los enlaces que traen el foco aquí aterrizan en un
    // contenedor mudo.
    const seccion = wrapper.get('section#cotizador')
    expect(seccion.attributes('aria-labelledby')).toBe('cotizador-h2')
    expect(seccion.attributes('tabindex')).toBe('-1')
  })

  it('ninguna petición lleva el texto libre — con control positivo del espía', async () => {
    const { wrapper } = await conCatalogo()
    await elemento(wrapper.findAll('input[type="checkbox"]'), 0, 'las casillas').setValue(true)
    await vi.advanceTimersByTimeAsync(600)

    // Que la cesta viajara es parte de la afirmación: si no hubiera salido nada,
    // «no lleva el texto» sería cierto por vacío.
    expect(pedirCotizacion).toHaveBeenCalledTimes(1)
    const args = elemento(pedirCotizacion.mock.calls, 0)[0]
    expect(args.lineas.every((l) => Object.keys(l).sort().join() === 'code,quantity')).toBe(true)

    const todo = JSON.stringify([pedirCotizacion.mock.calls, post.mock.calls, get.mock.calls])
    expect(todo).not.toContain(DEL_EJEMPLO)

    // CONTROL POSITIVO. Sin esto, un espía desconectado del módulo que el
    // componente importa daría el mismo verde que un componente mudo, y la
    // prueba estaría afirmando «no lo compruebo».
    void http.post('/assistant/proposal', { texto: usePropuestaStore().texto })
    expect(JSON.stringify(post.mock.calls)).toContain(DEL_EJEMPLO)
  })
})
