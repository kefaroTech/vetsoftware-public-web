import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import AsistenteEntrada from '@/features/asistente/components/AsistenteEntrada.vue'
import PlanesRelatoPlegable from '@/features/landing/components/PlanesRelatoPlegable.vue'
import PlanesView from '@/features/landing/views/PlanesView.vue'
import { http } from '@/services/http/http.client'

/**
 * EL ESQUEMA DE ENCABEZADOS DE `/planes`.
 *
 * ── El defecto que fija ────────────────────────────────────────────────────
 * El contenido principal de la pantalla —la caja de texto libre— tenía por todo
 * rótulo un `<label>` de 13 px, mientras el contenido secundario lo encabezaba
 * un `<summary>` de 16 px en negrita. Un `<summary>` **no es un encabezado**, así
 * que para quien navega por encabezados —el modo mayoritario con lector de
 * pantalla— el contenido principal de `/planes` sencillamente no existía en el
 * esquema del documento. Eso es §1.3.1 *Info and Relationships*, nivel A: la
 * importancia relativa que transmite la presentación no estaba en la estructura.
 *
 * ── Por qué muerde ─────────────────────────────────────────────────────────
 * No comprueba que «haya un h2»: comprueba **cuál** es el elemento y qué dice.
 * Devolver el `<details open>` con su `<summary>`, o bajar el rótulo de la
 * entrada a `<p>`, pone los casos en rojo. Lo que ninguna prueba unitaria puede
 * ver es el peso tipográfico relativo; eso vive en la instantánea ARIA y en la
 * revisión de teclado.
 */

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'planes', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

const PublicLayoutFalso = { template: '<div><slot /></div>' }

function montarVista() {
  return mount(PlanesView, {
    shallow: true,
    global: { stubs: { PublicLayout: PublicLayoutFalso } },
  })
}

describe('El contenido principal de /planes existe en el esquema de la página', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(http.get).mockResolvedValue({ data: { currency: 'COP', plans: [] } } as never)
  })

  it('la vista conserva un único `h1` y le da nombre al camino a medida', () => {
    const wrapper = montarVista()
    const h1 = wrapper.findAll('h1')
    expect(h1).toHaveLength(1)
    expect(wrapper.get('h1').text()).toBe('Tu plan, con el precio exacto')
  })

  it('el relato plegado conserva su `h2`, y el disparador va dentro', () => {
    const wrapper = mount(PlanesRelatoPlegable, {
      props: { sinPaquetes: false },
      shallow: true,
    })

    const h2 = wrapper.get('#relato-h2')
    expect(h2.element.tagName).toBe('H2')
    expect(h2.text()).toContain('¿No sabes qué módulos necesitas?')

    // El disparador DENTRO del encabezado es lo que conserva el relato en el
    // esquema estando plegado. Con un `<details>`/`<summary>` —o con el botón
    // suelto— desaparecería del índice por el que navega quien usa lector, que
    // es exactamente el defecto que este archivo existe para fijar.
    const boton = h2.get('button')
    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(boton.attributes('aria-controls')).toBe('relato-panel')
    expect(wrapper.find('details').exists()).toBe(false)
    expect(wrapper.find('summary').exists()).toBe(false)

    // Y la sección se nombra con ese mismo encabezado.
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe('relato-h2')
  })

  it('la entrada de texto libre trae su propio `h2`, y conserva la etiqueta del campo', () => {
    const wrapper = mount(AsistenteEntrada, {
      props: { texto: '', email: '', ocupado: false },
      global: { stubs: { LegalConsentCheckbox: true } },
    })

    const h2 = wrapper.get('h2')
    expect(h2.element.tagName).toBe('H2')
    expect(h2.text()).toBe('Cuéntanos qué hace tu negocio')

    // El `h2` NO sustituye a la etiqueta: el campo sigue teniendo la suya, y
    // apuntando a él. Un encabezado no es una etiqueta programática (§3.3.2).
    const campo = wrapper.get('textarea')
    const idCampo = campo.attributes('id')
    const etiqueta = wrapper.get(`label[for="${idCampo}"]`)
    expect(etiqueta.text()).toBe('¿A qué se dedica tu negocio?')
  })

  it('los ejemplos de la entrada no aparecen cuando ya se llega con texto escrito', () => {
    const conTexto = mount(AsistenteEntrada, {
      props: { texto: 'Clínica de barrio, consulta general y vacunas', email: '', ocupado: false },
      global: { stubs: { LegalConsentCheckbox: true } },
    })
    expect(conTexto.findAll('.aen-ejemplos button')).toHaveLength(0)

    const vacia = mount(AsistenteEntrada, {
      props: { texto: '', email: '', ocupado: false },
      global: { stubs: { LegalConsentCheckbox: true } },
    })
    expect(vacia.findAll('.aen-ejemplos button').length).toBeGreaterThan(0)
  })
})
