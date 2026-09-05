import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import LandingCotizador from '@/features/landing/components/LandingCotizador.vue'
import { fetchCatalogo } from '@/features/asistente/api/catalogo.source'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import type * as cotizacionSource from '@/features/landing/api/cotizacion.source'
import { previsualizarCotizacion } from '@/features/landing/api/cotizacion.source'
import { ANUNCIO_MS, useCotizador } from '@/features/landing/composables/useCotizador'
import type * as cotizadorContent from '@/features/landing/content/cotizador.content'
import { importeEstimado } from '@/features/landing/composables/planPricing'
import { useSeleccionPortadaStore } from '@/features/landing/stores/seleccionPortada.store'
import type { CotizacionPreview } from '@/features/landing/types/cotizacion.types'
import { http } from '@/services/http/http.client'
import { articulo, catalogoEmbudo } from '../helpers/catalogo-embudo'
import { elemento } from '../helpers/exigir'

/**
 * LA TARJETA DEL HERO.
 *
 * ── Qué protege cada caso ──────────────────────────────────────────────────
 *  1. **Vacío + enviar navega, sin error.** El hero no puede ser una puerta
 *     cerrada; un error en el primer pliegue castiga a quien todavía no había
 *     decidido escribir.
 *  2. **El campo llega PLEGADO, detrás del selector**, y el ejemplo se enseña
 *     junto a él en vez de ocupar su interior —§3.3.2: un placeholder desaparece
 *     al escribir, y un campo con texto ajeno obliga a borrarlo—. Quien vuelve
 *     con un relato ya escrito lo encuentra abierto: es lo más caro de la
 *     pantalla y plegado parecería perdido.
 *  3. **Sin nada marcado se puede avanzar, y el selector se ve sin abrir el
 *     campo.** Nadie tiene que escribir ni marcar para llegar al paso siguiente,
 *     y un selector que aparece al teclear cambiaría solo el índice de
 *     encabezados del lector.
 *  4. **Plegar un área no desmarca nada.** El cuerpo del área se desmonta al
 *     plegar; si la selección viviera en él, cerrar para ver mejor borraría lo
 *     comprado.
 *  5. **La portada enseña el total y NO lo pide.** La cifra se suma con el
 *     catálogo ya descargado: esconderla hace que se subestime el precio, y
 *     pedirla casilla a casilla gastaría el cupo por IP antes de `/planes`.
 *  6. **Escribir no deshace lo que se tocó a mano.** Sobre lo que nadie tocó
 *     sigue mandando el texto; sobre lo demás manda el visitante.
 *  7. **La portada llega premarcada con «Consulta de barrio», y eso se
 *     divulga.** El conteo y «no pagas los otros N módulos» están desde el
 *     primer pintado, desmarcar no cuesta nada y `ELECTRONIC_INVOICING` —el
 *     único módulo sin prueba gratis— se queda fuera. Vaciar la constante
 *     devuelve la portada al estado sin premarcado.
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

/**
 * La lista premarcada se copia de la REAL y se exporta la misma referencia, para
 * que vaciarla en un caso no le quite a los demás la constante de producción:
 * un mock con códigos escritos a mano dejaría verde este archivo aunque alguien
 * cambiara el conjunto que ve el visitante.
 */
const semilla = vi.hoisted(() => ({ real: [] as string[], codigos: [] as string[] }))

vi.mock('@/features/landing/content/cotizador.content', async (original) => {
  const real = await original<typeof cotizadorContent>()
  semilla.real = [...real.SELECCION_POR_DEFECTO]
  semilla.codigos.push(...semilla.real)
  return { ...real, SELECCION_POR_DEFECTO: semilla.codigos }
})

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

/**
 * El catálogo de ESTA pantalla, y no el compartido: la portada llega premarcada
 * con cuatro códigos concretos, y comprobarlo exige que los cuatro existan en la
 * tarifa. Lleva además dos que no están premarcados —uno vendible en cada área—
 * para que «no pagas los otros N» y «la facturación no llega marcada» afirmen
 * algo. Todos a 35.000 y al 19 %, como el ayudante los fabrica.
 */
const CATALOGO_PORTADA = catalogoEmbudo({
  articulos: [
    articulo({
      code: 'CORE',
      nombre: 'Núcleo: clientes y mascotas',
      importe: 59_000,
      obligatorio: true,
      areaCode: null,
      shortLabel: null,
    }),
    articulo(),
    articulo({
      code: 'CLINICAL_HISTORY',
      nombre: 'Historia clínica y consultas',
      shortLabel: 'Historia clínica',
    }),
    articulo({
      code: 'VACCINATION_DEWORMING',
      nombre: 'Vacunación y desparasitación',
      shortLabel: 'Vacunas',
    }),
    articulo({ code: 'GROOMING', nombre: 'Baño y estética', shortLabel: 'Estética' }),
    articulo({
      code: 'CASH_REGISTER',
      nombre: 'Caja y mostrador',
      areaCode: 'MONEY',
      shortLabel: 'Caja',
    }),
    articulo({
      code: 'ELECTRONIC_INVOICING',
      nombre: 'Facturación DIAN',
      areaCode: 'MONEY',
      shortLabel: 'Facturación',
      trialDays: null,
    }),
  ],
})

/** Núcleo (59.000) más los cuatro premarcados (35.000 cada uno), con su IVA por línea. */
const TOTAL_PREMARCADO = 236_810

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

/** La casilla de un módulo por su código: los índices bailan al abrirse otra área. */
function casilla(wrapper: ReturnType<typeof montar>['wrapper'], code: string) {
  return elemento(
    wrapper.findAll(`input[type="checkbox"][value="${code}"]`),
    0,
    `la casilla de ${code}`,
  )
}

/**
 * El campo vive detrás del disparador de «¿No sabes cuáles necesitas?», así que
 * sin abrirlo no está en el documento.
 */
async function abrirRelato(wrapper: ReturnType<typeof montar>['wrapper']) {
  const boton = wrapper.get('button.lcr-abrir')
  if (boton.attributes('aria-expanded') === 'false') await boton.trigger('click')
  return wrapper.get('textarea')
}

/** Sin esto, las casillas de un área plegada no están en el documento. */
async function abrirTodo(wrapper: ReturnType<typeof montar>['wrapper']) {
  for (const cabecera of wrapper.findAll('h3 button')) {
    if (cabecera.attributes('aria-expanded') === 'false') await cabecera.trigger('click')
  }
}

describe('LandingCotizador — se arma el plan, y el relato se queda en el navegador', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    document.body.innerHTML = ''
    semilla.codigos.splice(0, semilla.codigos.length, ...semilla.real)
    traerCatalogo.mockResolvedValue(CATALOGO_PORTADA)
    pedirCotizacion.mockResolvedValue(COTIZACION)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('vacío y enviar: navega a /planes y NO enseña ningún error', async () => {
    const { wrapper } = montar()

    await wrapper.find('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({ name: 'planes' })
    // El cero de `role="alert"` es la afirmación: no basta con que el texto del
    // error no esté, tiene que no haber región de error ninguna.
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
  })

  it('el campo llega plegado y su disparador va DESPUÉS del selector de módulos', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })

    expect(wrapper.find('textarea').exists()).toBe(false)
    const disparador = wrapper.get('button.lcr-abrir')
    expect(disparador.attributes('aria-expanded')).toBe('false')
    expect(disparador.text()).toContain('¿No sabes cuáles necesitas?')

    const orden = wrapper.findAll('h3 button, button.lcr-abrir')
    expect(elemento(orden, orden.length - 1, 'los controles de la columna').classes()).toContain(
      'lcr-abrir',
    )
  })

  it('abrir el disparador monta el campo, lo apunta con aria-controls y le da el foco', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    const disparador = wrapper.get('button.lcr-abrir')

    await disparador.trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    const campo = wrapper.get('textarea')
    expect(disparador.attributes('aria-expanded')).toBe('true')
    // El `aria-controls` tiene que apuntar al panel que de verdad contiene el
    // campo: uno que señale a un id inexistente se anuncia igual y no lleva.
    const panel = document.getElementById(disparador.attributes('aria-controls') ?? '')
    expect(panel?.contains(campo.element)).toBe(true)
    expect(document.activeElement).toBe(campo.element)
  })

  it('el ejemplo se ENSEÑA junto al campo, no dentro, y la ayuda lo describe', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    const campo = await abrirRelato(wrapper)

    // Un `placeholder` se iría con el primer carácter (§3.3.2), y sembrado
    // obligaría a borrarlo antes de escribir el relato propio.
    expect(campo.element.value).toBe('')
    expect(campo.attributes('placeholder')).toBeUndefined()
    expect(campo.attributes('rows')).toBe('6')
    expect(wrapper.get('.lcr-ejemplo').text()).toContain('clínica veterinaria de barrio')

    const idAyuda = campo.attributes('aria-describedby')
    expect(idAyuda).toBeTruthy()
    expect(wrapper.get('#' + idAyuda).text()).toContain('escríbelo con tus palabras')

    await campo.setValue('Somos una guardería.')
    expect(campo.element.value).toBe('Somos una guardería.')
  })

  /**
   * El conjunto premarcado es EXPLÍCITO y no sale del ejemplo sembrado: la
   * detección por texto sigue inerte en la primera carga —marcar por un texto
   * que el visitante no escribió sería decidir por él— y lo que marca las cuatro
   * casillas es la constante, que se puede cambiar o vaciar en un solo sitio.
   */
  it('la portada llega con la combinación «Consulta de barrio» marcada', async () => {
    const { cotizador } = await conCatalogo({ conPrecio: false })

    await vi.advanceTimersByTimeAsync(1000)

    expect([...cotizador.modulos.value].sort()).toEqual([
      'CASH_REGISTER',
      'CLINICAL_HISTORY',
      'SCHEDULING',
      'VACCINATION_DEWORMING',
    ])
  })

  /**
   * `ELECTRONIC_INVOICING` es el único módulo sin prueba gratis: se cobra desde
   * el primer día, así que premarcarlo sería cobrar por sorpresa. El catálogo de
   * este archivo lo trae vendible a propósito, para que su ausencia sea una
   * decisión y no un hueco de la tarifa.
   */
  it('la facturación electrónica NO llega marcada, aunque el catálogo la venda', async () => {
    const { wrapper, cotizador } = await conCatalogo({ conPrecio: false })
    await abrirTodo(wrapper)

    expect(cotizador.modulos.value).not.toContain('ELECTRONIC_INVOICING')
    expect((casilla(wrapper, 'ELECTRONIC_INVOICING').element as HTMLInputElement).checked).toBe(
      false,
    )
  })

  /**
   * La divulgación proactiva no se cumple con el conteo si lo contado no se ve:
   * `CASH_REGISTER` llega marcado dentro de «Mostrador y dinero», y con el área
   * plegada el carril decía «+ 4 módulos» sobre tres casillas visibles.
   */
  it('las áreas con algo premarcado llegan abiertas: nada marcado queda escondido', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.findAll('h3 button').map((b) => b.attributes('aria-expanded'))).toEqual([
      'true',
      'true',
    ])
    // Y la casilla del área que antes llegaba plegada está en el documento, marcada.
    expect((casilla(wrapper, 'CASH_REGISTER').element as HTMLInputElement).checked).toBe(true)
  })

  it('con la constante vacía la portada no premarca nada, y vuelve a abrir una sola área', async () => {
    semilla.codigos.length = 0

    const { wrapper, cotizador } = await conCatalogo({ conPrecio: false })
    await vi.advanceTimersByTimeAsync(1000)

    // Sin premarcado no hay nada escondido que enseñar: se abre la primera área
    // y ya, que es el comportamiento anterior.
    expect(wrapper.findAll('h3 button').map((b) => b.attributes('aria-expanded'))).toEqual([
      'true',
      'false',
    ])

    await abrirTodo(wrapper)

    expect(cotizador.modulos.value).toEqual([])
    expect(
      wrapper
        .findAll('input[type="checkbox"]')
        .filter((c) => (c.element as HTMLInputElement).checked),
    ).toHaveLength(0)
    // Sin premarcado no hay punto de partida que rotular.
    expect(wrapper.get('.lcc-precio').text()).not.toContain('Un punto de partida')
  })

  it('quien vuelve con un relato escrito lo encuentra abierto y sin pisar', () => {
    usePropuestaStore().texto = 'Atendemos perros y gatos, y hacemos cirugía los martes.'

    const { wrapper } = montar()

    expect(wrapper.get('button.lcr-abrir').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('textarea').element.value).toBe(
      'Atendemos perros y gatos, y hacemos cirugía los martes.',
    )
  })

  /**
   * La salida sin coste es la mitad de lo que hace legítimo el premarcado: quitar
   * las cuatro casillas es cuatro clics y nada más —ni confirmación, ni aviso, ni
   * un botón que se apague—, y desde ahí se sigue avanzando igual.
   */
  it('quitar lo premarcado no cuesta nada: sin confirmación y el botón sigue llevando a /planes', async () => {
    const confirmar = vi.spyOn(window, 'confirm')
    const { wrapper, cotizador } = await conCatalogo()
    await abrirTodo(wrapper)

    for (const control of wrapper.findAll('input[type="checkbox"]')) {
      if ((control.element as HTMLInputElement).checked) await control.setValue(false)
    }

    expect(cotizador.modulos.value).toEqual([])
    expect(confirmar).not.toHaveBeenCalled()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({ name: 'planes' })
    // Vacío, y no `null`: `null` es «no se viene de la portada» y dejaría a
    // `/planes` sembrando el paquete recomendado sobre lo que él acaba de quitar.
    expect(useSeleccionPortadaStore().modulos).toEqual([])
  })

  /**
   * El premarcado solo vale si sobrevive al primer salto: `/planes` sembraba
   * desde el paquete recomendado y borraba lo que el visitante acababa de tocar,
   * así que la portada tiene que entregar lo que quedó marcado, no lo que se
   * premarcó (#374).
   */
  it('«Empezar gratis» entrega a /planes la selección que quedó, con los cambios a mano', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    await abrirTodo(wrapper)

    await casilla(wrapper, 'VACCINATION_DEWORMING').setValue(false)
    await casilla(wrapper, 'GROOMING').setValue(true)
    await wrapper.find('form').trigger('submit')

    expect([...(useSeleccionPortadaStore().modulos ?? [])].sort()).toEqual([
      'CASH_REGISTER',
      'CLINICAL_HISTORY',
      'GROOMING',
      'SCHEDULING',
    ])
    expect(push).toHaveBeenCalledWith({ name: 'planes' })
  })

  /**
   * Con el campo VACÍO, no solo sin escribir: ocultar el selector hasta que
   * alguien teclee no lo sostiene la evidencia —el metaanálisis de choice
   * overload mide un efecto medio nulo— y además le cambiaría solo el índice de
   * encabezados a quien navega con lector.
   */
  it('el selector se ve sin abrir el campo: no hay que escribir para poder marcar', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })

    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.findAll('h3')).toHaveLength(2)
    expect(wrapper.findAll('input[type="checkbox"]').length).toBeGreaterThan(0)
  })

  it('plegar un área no desmarca nada: al volver a abrirla la casilla sigue marcada', async () => {
    const { wrapper, cotizador } = await conCatalogo()
    const cabecera = elemento(wrapper.findAll('h3 button'), 0, 'las cabeceras de área')

    await casilla(wrapper, 'GROOMING').setValue(true)
    const marcados = [...cotizador.modulos.value]
    expect(marcados).toContain('GROOMING')

    await cabecera.trigger('click')
    expect(cabecera.attributes('aria-expanded')).toBe('false')
    expect(cotizador.modulos.value).toEqual(marcados)

    await cabecera.trigger('click')
    expect((casilla(wrapper, 'GROOMING').element as HTMLInputElement).checked).toBe(true)
  })

  it('la tarjeta encabeza con su propio h2, del que cuelgan los h3 de área', async () => {
    const { wrapper } = await conCatalogo()
    const h2 = wrapper.get('#cotizador-h2')

    expect(h2.element.tagName).toBe('H2')
    expect(h2.text()).toBe('Arma tu plan')
    // El `h2` NO sustituye a la etiqueta del campo: un encabezado no es una
    // etiqueta programática.
    const campo = await abrirRelato(wrapper)
    expect(wrapper.get(`label[for="${campo.attributes('id')}"]`).text()).toBe(
      '¿Qué hace tu negocio?',
    )
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
    await casilla(wrapper, 'GROOMING').setValue(true)
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

    await abrirTodo(wrapper)
    for (const control of wrapper.findAll('input[type="checkbox"]')) {
      if (!(control.element as HTMLInputElement).checked) await control.setValue(true)
    }
    await vi.advanceTimersByTimeAsync(2000)

    expect(cotizador.modulos.value.length).toBeGreaterThan(0)
    expect(pedirCotizacion).not.toHaveBeenCalled()
  })

  it('lo escrito marca lo que nombra, lo anuncia y abre sus áreas — 500 ms después', async () => {
    const { wrapper, cotizador } = await conCatalogo()

    await (await abrirRelato(wrapper)).setValue('Agendamos citas y cobramos en caja.')
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

  it('escribir NO deshace lo que se marcó a mano', async () => {
    const { wrapper, cotizador } = await conCatalogo({ conPrecio: false })

    await casilla(wrapper, 'GROOMING').setValue(true)
    expect(cotizador.modulos.value).toContain('GROOMING')

    await (await abrirRelato(wrapper)).setValue('Agendamos citas y cobramos en caja.')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()

    // El texto propone lo suyo SOBRE lo que se tocó a mano, no en lugar de ello.
    // Lo premarcado que nadie tocó sí lo sustituye: ahí manda la detección.
    expect([...cotizador.modulos.value].sort()).toEqual(['CASH_REGISTER', 'GROOMING', 'SCHEDULING'])
  })

  it('lo que se quitó a mano tampoco vuelve porque se reescriba el relato', async () => {
    const { wrapper, cotizador } = await conCatalogo({ conPrecio: false })

    const campo = await abrirRelato(wrapper)
    await campo.setValue('Agendamos citas.')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
    expect(cotizador.modulos.value).toEqual(['SCHEDULING'])

    await casilla(wrapper, 'SCHEDULING').setValue(false)

    await campo.setValue('Agendamos citas y cobramos en caja.')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()

    // La agenda se sigue nombrando en el relato, y sigue fuera porque él la sacó.
    expect(cotizador.modulos.value).toEqual(['CASH_REGISTER'])
  })

  it('el total de entrada ya lleva el núcleo y los cuatro premarcados, sin escribir nada', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    await vi.advanceTimersByTimeAsync(2000)
    const bloque = wrapper.get('.lcc-precio')

    expect(bloque.text()).toContain('desde')
    expect(bloque.text()).toContain(importeEstimado(TOTAL_PREMARCADO))
    expect(bloque.text()).toContain('al mes, IVA incluido (19 %)')
    // Y sigue siendo una suma local: la portada no gasta el cupo de /quotes/preview.
    expect(pedirCotizacion).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })

  /**
   * La divulgación proactiva no puede llegar al final del embudo: el conteo de lo
   * marcado y lo que se queda fuera están junto a la cifra desde el primer
   * pintado, y los dos siguen la casilla en el mismo gesto.
   */
  it('quitar un módulo baja el total y sube el conteo de lo que no se paga', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    await vi.advanceTimersByTimeAsync(2000)
    const bloque = () => wrapper.get('.lcc-precio').text()

    expect(bloque()).toContain('Clientes y mascotas + 4 módulos')
    expect(bloque()).toContain('No pagas los otros 2 módulos.')
    expect(bloque()).toContain('Un punto de partida')

    await casilla(wrapper, 'VACCINATION_DEWORMING').setValue(false)

    expect(bloque()).toContain('Clientes y mascotas + 3 módulos')
    expect(bloque()).toContain('No pagas los otros 3 módulos.')
    expect(bloque()).toContain(importeEstimado(195_160))
    // El rótulo se cae con la combinación que describía: a partir de ahí lo
    // marcado es del visitante y no un punto de partida que ofreciera nadie.
    expect(bloque()).not.toContain('Un punto de partida')
  })

  /**
   * «La que más eligen» era una afirmación sobre la conducta de otros clientes
   * que nadie ha medido, y el art. 30 de la Ley 1480 exige que lo que se afirma
   * en publicidad sea verificable. El rótulo que la sustituye orienta sin
   * afirmar nada de nadie (#375).
   */
  it('el rótulo del premarcado no afirma nada sobre lo que eligen otros clientes', async () => {
    const { wrapper } = await conCatalogo({ conPrecio: false })
    await vi.advanceTimersByTimeAsync(1000)
    const carril = wrapper.get('.ds-rail').text()

    expect(carril).toContain('Un punto de partida: cámbialo a tu gusto')
    expect(carril).not.toMatch(/más eligen|más elegid|más contratad|la mayoría|popular/i)
  })

  it('mientras el catálogo no llega no hay cifra, y lo dice', () => {
    const bloque = montar({ conPrecio: false }).wrapper.get('.lcc-precio')

    expect(bloque.text()).toContain('Calculando con los precios de hoy')
    // Nunca un `$ 0`: se lee como «no cuesta nada».
    expect(bloque.text()).not.toContain('$')
  })

  it('con el catálogo caído no inventa cifra y el camino sigue abierto', async () => {
    traerCatalogo.mockRejectedValue(new Error('Network Error'))

    const { wrapper } = await conCatalogo({ conPrecio: false })

    expect(wrapper.get('.lcc-precio').text()).not.toContain('$')
    await wrapper.find('form').trigger('submit')
    expect(push).toHaveBeenCalledWith({ name: 'planes' })
  })

  it('marcar anuncia el total nuevo por la región viva del importe', async () => {
    const { wrapper, cotizador } = await conCatalogo({ conPrecio: false })

    await casilla(wrapper, 'GROOMING').setValue(true)
    await vi.advanceTimersByTimeAsync(ANUNCIO_MS)

    // Núcleo, los cuatro premarcados y el quinto recién marcado, con su IVA.
    expect(cotizador.regionViva.value).toContain(importeEstimado(278_460))
    expect(cotizador.regionViva.value).toContain('IVA incluido (19 %)')
    // Y llega a la región viva del carril, que es la del importe.
    expect(wrapper.get('.ds-sr-only[aria-live="polite"]').text()).toBe(cotizador.regionViva.value)
  })
})
