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
 *  2. **El campo llega VACÍO y el ejemplo es el `placeholder`**, con la
 *     instrucción persistente fuera —§3.3.2: un placeholder desaparece al
 *     escribir— y **sin pisar lo que el visitante ya había escrito**, que es lo
 *     más caro de la pantalla.
 *  3. **Sin nada marcado se puede avanzar.** La selección vacía es un estado
 *     legítimo, no un error: nadie tiene que marcar nada para ver el siguiente
 *     paso.
 *  4. **Plegar un área no desmarca nada.** El cuerpo del área se desmonta al
 *     plegar; si la selección viviera en él, cerrar para ver mejor borraría lo
 *     comprado.
 *  5. **La portada no pide precio.** El importe se fue a `/planes`; seguir
 *     cotizando aquí gastaría el cupo por IP del prospecto antes de llegar.
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

/** Lo que el visitante escribió, que es lo que ninguna petición puede llevar. */
const RELATO = 'Somos una clínica de barrio con consulta y vacunación.'

function montar(opciones?: Parameters<typeof useCotizador>[0]) {
  let cotizador!: ReturnType<typeof useCotizador>
  const wrapper = mount(
    defineComponent({
      setup() {
        cotizador = useCotizador(opciones)
        return () => h(LandingCotizador, { cotizador })
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, cotizador }
}

/** Monta y deja el catálogo cargado: sin él no hay ni casillas ni cesta. */
async function conCatalogo(opciones?: Parameters<typeof useCotizador>[0]) {
  const montado = montar(opciones)
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

  it('el campo llega vacío, con el ejemplo en el placeholder y la instrucción fuera', () => {
    const { wrapper } = montar()
    const campo = wrapper.find('textarea')

    expect(campo.element.value).toBe('')
    expect(campo.attributes('placeholder')).toContain('petshop de barrio')
    expect(campo.attributes('rows')).toBe('6')
    // §3.3.2: el placeholder NO puede ser la única instrucción. La ayuda
    // persistente sigue ahí y sigue siendo la que describe el campo.
    const idAyuda = campo.attributes('aria-describedby')
    expect(idAyuda).toBeTruthy()
    expect(wrapper.get('#' + idAyuda).text()).toContain('escríbelo con tus palabras')
  })

  it('el relato que el visitante ya había escrito no se pisa con el ejemplo', () => {
    usePropuestaStore().texto = 'Atendemos perros y gatos, y hacemos cirugía los martes.'

    const campo = montar().wrapper.find('textarea')

    expect(campo.element.value).toBe('Atendemos perros y gatos, y hacemos cirugía los martes.')
  })

  it('sin nada marcado: nada bloqueado y el botón sigue llevando a /planes', async () => {
    const { wrapper, cotizador } = await conCatalogo()

    expect(cotizador.modulos.value).toEqual([])
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    // Y el selector está en el DOM sin haber escrito nada: si apareciera al
    // teclear, el índice de encabezados del lector cambiaría de forma sola.
    expect(wrapper.findAll('h3').length).toBeGreaterThan(0)

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
    expect(h2.text()).toBe('Arma tu plan')
    // El `h2` NO sustituye a la etiqueta del campo: un encabezado no es una
    // etiqueta programática.
    expect(wrapper.get('label').text()).toBe('¿Qué hace tu negocio?')
    expect(wrapper.findAll('h3').length).toBeGreaterThan(0)
    // Y da nombre a la región: sin nombre accesible, un `<section>` no se expone
    // como `region` y los enlaces que traen el foco aquí aterrizan en un
    // contenedor mudo.
    const seccion = wrapper.get('section#cotizador')
    expect(seccion.attributes('aria-labelledby')).toBe('cotizador-h2')
    expect(seccion.attributes('tabindex')).toBe('-1')
  })

  it('ninguna petición lleva el texto libre — con control positivo del espía', async () => {
    usePropuestaStore().texto = RELATO
    const { wrapper } = await conCatalogo()
    await elemento(wrapper.findAll('input[type="checkbox"]'), 0, 'las casillas').setValue(true)
    await vi.advanceTimersByTimeAsync(600)

    // Que la cesta viajara es parte de la afirmación: si no hubiera salido nada,
    // «no lleva el texto» sería cierto por vacío.
    expect(pedirCotizacion).toHaveBeenCalledTimes(1)
    const args = elemento(pedirCotizacion.mock.calls, 0)[0]
    expect(args.lineas.every((l) => Object.keys(l).sort().join() === 'code,quantity')).toBe(true)

    const todo = JSON.stringify([pedirCotizacion.mock.calls, post.mock.calls, get.mock.calls])
    expect(todo).not.toContain('clínica de barrio')

    // CONTROL POSITIVO. Sin esto, un espía desconectado del módulo que el
    // componente importa daría el mismo verde que un componente mudo, y la
    // prueba estaría afirmando «no lo compruebo».
    void http.post('/assistant/proposal', { texto: usePropuestaStore().texto })
    expect(JSON.stringify(post.mock.calls)).toContain('clínica de barrio')
  })

  it('la portada monta el cotizador sin red: marcar casillas no cotiza nada', async () => {
    const { wrapper, cotizador } = await conCatalogo({ conPrecio: false })

    for (const casilla of wrapper.findAll('input[type="checkbox"]')) {
      await casilla.setValue(true)
    }
    await vi.advanceTimersByTimeAsync(2000)

    expect(cotizador.modulos.value.length).toBeGreaterThan(0)
    expect(pedirCotizacion).not.toHaveBeenCalled()
  })

  it('lo escrito marca lo que nombra, lo anuncia y abre sus áreas — 500 ms después', async () => {
    const { wrapper, cotizador } = await conCatalogo()

    await wrapper.find('textarea').setValue('Agendamos citas y cobramos en caja.')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()

    expect(cotizador.modulos.value).toEqual(['SCHEDULING', 'CASH_REGISTER'])
    // Las dos áreas con detección quedan abiertas, y solo esas.
    expect(wrapper.findAll('h3 button').map((b) => b.attributes('aria-expanded'))).toEqual([
      'true',
      'true',
    ])

    const propuesta = wrapper.get('[role="status"]')
    expect(propuesta.attributes('aria-atomic')).toBe('true')
    expect(propuesta.text()).toContain('Con eso te proponemos')
    // La nota va DENTRO del `<label>`, así que entra en el nombre accesible.
    expect(elemento(wrapper.findAll('.lsm-fila.is-on'), 0, 'las filas marcadas').text()).toContain(
      'Porque lo mencionaste',
    )
  })
})
