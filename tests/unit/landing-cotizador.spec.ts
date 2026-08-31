import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import LandingCotizador from '@/features/landing/components/LandingCotizador.vue'
import { EJEMPLOS_COTIZADOR, MIN_DESCRIPCION } from '@/features/asistente/content/copy.content'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import { http } from '@/services/http/http.client'
import { elemento } from '../helpers/exigir'

/**
 * LA CAJA DE ARRANQUE DEL HERO.
 *
 * ── Qué protege cada caso ──────────────────────────────────────────────────
 * Los cuatro primeros fijan las cuatro decisiones que un rediseño posterior
 * puede deshacer sin darse cuenta, y el orden es el de lo que cuesta perderlo:
 *
 *  1. **Vacío + enviar navega, sin error.** El hero no puede ser una puerta
 *     cerrada; un error en el primer pliegue castiga a quien todavía no había
 *     decidido escribir.
 *  2. **Corto + enviar NO navega.** Lo intentó: arreglarlo aquí cuesta un
 *     segundo, y hacerlo tras una navegación es una regañina en otra pantalla.
 *  3. **Texto válido siembra el store Y navega.** Sembrar sin navegar deja el
 *     párrafo huérfano; navegar sin sembrar obliga a reescribirlo.
 *  4. **Un ejemplo AÑADE, nunca reemplaza.** El texto ya tecleado es lo más
 *     caro de esta pantalla y no se destruye jamás.
 *
 * ── La afirmación que necesita control positivo ────────────────────────────
 * «No llama a ninguna API» y «no lo compruebo» producen exactamente la misma
 * salida verde si el espía no está conectado al módulo que el componente
 * importa. Por eso el último caso, después de afirmar el cero, provoca una
 * llamada a mano y exige que el mismo espía la registre.
 */

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)

function montar() {
  return mount(LandingCotizador, { attachTo: document.body })
}

describe('LandingCotizador — siembra y navega, sin llamar a nadie', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('vacío y enviar: navega a /planes y NO enseña ningún error', async () => {
    const wrapper = montar()
    await wrapper.find('form').trigger('submit')

    expect(push).toHaveBeenCalledWith({ name: 'planes' })
    // El cero de `role="alert"` es la afirmación: no basta con que el texto del
    // error no esté, tiene que no haber región de error ninguna.
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
  })

  it('texto por debajo del mínimo: enseña el error y NO navega', async () => {
    const wrapper = montar()
    const campo = wrapper.find('textarea')
    await campo.setValue('perro')
    expect('perro'.length).toBeLessThan(MIN_DESCRIPCION)

    await wrapper.find('form').trigger('submit')

    expect(push).not.toHaveBeenCalled()
    const error = wrapper.find('[role="alert"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('Con eso no nos alcanza')
    // El error tiene que estar atado al campo, o el lector de pantalla no lo
    // relaciona con nada.
    expect(campo.attributes('aria-invalid')).toBe('true')
    expect(campo.attributes('aria-describedby')).toContain(error.attributes('id'))
  })

  it('texto válido: siembra el store y navega', async () => {
    const wrapper = montar()
    await wrapper.find('textarea').setValue('Clínica de barrio, consulta general y vacunas')
    await wrapper.find('form').trigger('submit')

    expect(usePropuestaStore().texto).toBe('Clínica de barrio, consulta general y vacunas')
    expect(push).toHaveBeenCalledWith({ name: 'planes' })
  })

  it('un ejemplo AÑADE al final y no destruye lo que el usuario ya escribió', async () => {
    const wrapper = montar()
    const campo = wrapper.find('textarea')
    await campo.setValue('Atendemos perros y gatos')

    const ejemplo = elemento(EJEMPLOS_COTIZADOR, 0, 'los ejemplos del cotizador')
    const botones = wrapper.findAll('.lcot-ejemplos button')
    await elemento(botones, 0, 'los botones de ejemplo').trigger('click')

    const resultado = usePropuestaStore().texto
    expect(resultado).toContain('Atendemos perros y gatos')
    expect(resultado).toContain(ejemplo)
    expect(resultado).toBe(`Atendemos perros y gatos ${ejemplo}`)
  })

  it('los ejemplos rellenan y NO envían', async () => {
    const wrapper = montar()
    const botones = wrapper.findAll('.lcot-ejemplos button')
    expect(botones).toHaveLength(EJEMPLOS_COTIZADOR.length)
    // `type="button"` dentro de un `<form>` no es adorno: sin él, el navegador
    // lo trata como envío y el ejemplo dispararía la navegación.
    for (const boton of botones) expect(boton.attributes('type')).toBe('button')

    await elemento(botones, 1, 'los botones de ejemplo').trigger('click')

    expect(push).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })

  it('ni escribir ni enviar llama a ninguna API — con control positivo del espía', async () => {
    const wrapper = montar()
    await wrapper.find('textarea').setValue('Consulta general, vacunas y desparasitación')
    await wrapper.find('form').trigger('submit')

    expect(post).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()

    // CONTROL POSITIVO. Sin esto, un espía desconectado del módulo que el
    // componente importa daría el mismo verde que un componente mudo, y la
    // prueba estaría afirmando «no lo compruebo».
    void http.post('/assistant/proposal', {})
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('la sección destino tiene nombre accesible: sin él no se expone como región', () => {
    // Dos enlaces de la landing traen el FOCO hasta aquí («Cuéntanos qué
    // necesitas» del cierre, y «decirnos con tus palabras qué necesitas» de la
    // nota de precio). Un `<section>` sin nombre accesible no es una `region`
    // para la API de accesibilidad: quien seguía esos enlaces aterrizaba en un
    // contenedor mudo, mientras el camino simétrico —`#planes`, con su
    // `aria-labelledby`— sí anunciaba el suyo. El camino que la landing quiere
    // destacar era el peor tratado.
    const seccion = montar().get('section#cotizador')

    const nombre = seccion.attributes('aria-label') ?? seccion.attributes('aria-labelledby')
    expect(nombre, 'la sección #cotizador necesita nombre accesible').toBeTruthy()
    expect(seccion.attributes('aria-label')).toBe('Cuéntanos qué necesitas')
    // Y sigue siendo alcanzable por programa: el nombre no sustituye al foco.
    expect(seccion.attributes('tabindex')).toBe('-1')
  })

  it('cada ejemplo pasa la validación que la propia caja aplica', () => {
    // Es el fallo que `copy.content.ts` documenta como ya ocurrido: la interfaz
    // ofreciendo un botón que su propia validación rechaza. En desarrollo nadie
    // pulsa los botones de relleno, así que sin esto vuelve en producción.
    for (const ejemplo of EJEMPLOS_COTIZADOR) {
      expect(ejemplo.trim().length, ejemplo).toBeGreaterThanOrEqual(MIN_DESCRIPCION)
    }
  })
})
