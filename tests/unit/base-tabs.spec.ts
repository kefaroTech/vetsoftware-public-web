import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises, type DOMWrapper } from '@vue/test-utils'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import { panelId, tabId, type TabItem } from '@/components/ui/tabs'

/**
 * GUARDA DE TECLADO DE `BaseTabs` (issue #197).
 *
 * `BaseTabs` es primitiva nueva y ya gobierna tres pantallas —caja, cuentas y
 * reportes—, así que su teclado no es un detalle de una vista: es el teclado de
 * las tres a la vez y un cambio aquí las rompe todas de golpe. Hasta ahora no
 * tenía ni una prueba.
 *
 * Lo que se fija, y por qué cada cosa:
 *
 *  1. **Flechas y Home/End mueven el FOCO.** Es lo que el patrón *Tabs* del APG
 *     exige y lo único que hace la tira usable sin ratón.
 *  2. **ACTIVACIÓN MANUAL.** Mover el foco NO puede cambiar de pestaña. No es
 *     preferencia: la pestaña «Historial» de caja dispara una carga al servidor,
 *     así que con activación automática atravesarla con la flecha lanzaría una
 *     petición por pestaña. Hace falta Enter o Espacio.
 *  3. **TABINDEX MÓVIL, y su caso roto de verdad.** La tira de `CajaView`
 *     ENCOGE: «Mi caja abierta» desaparece al cerrar la caja e «Historial» no
 *     existe sin permiso. Con el índice de foco crudo, un `focusIndex` que
 *     quedaba fuera de rango dejaba a TODAS las pestañas con `tabindex="-1"` y
 *     sacaba la tira entera del orden de tabulación, sin forma de volver a
 *     entrar con el teclado. Ese es el caso que se va a volver a romper y por eso
 *     tiene su propio bloque.
 *
 * Se monta con `attachTo: document.body` porque el foco real no existe en un
 * wrapper desprendido: sin eso, `document.activeElement` sería siempre `<body>`
 * y los casos de navegación pasarían sin comprobar nada.
 */

type CashTab = 'mine' | 'open' | 'history'

/** La tira REAL de `CajaView`: punto de estado, contadores y tres posiciones. */
const TABS_CAJA: TabItem<CashTab>[] = [
  { value: 'mine', label: 'Mi caja abierta', dot: true },
  { value: 'open', label: 'Cajas abiertas', badge: 2 },
  { value: 'history', label: 'Historial', badge: 128 },
]

/** La misma tira después de cerrar la caja: «Mi caja abierta» ya no existe. */
const TABS_SIN_MIA: TabItem<CashTab>[] = TABS_CAJA.filter((t) => t.value !== 'mine')

/** Y el extremo: una sola pestaña viva. */
const TABS_UNA: TabItem<CashTab>[] = TABS_CAJA.filter((t) => t.value === 'open')

function crear(modelValue: CashTab, tabs: TabItem<CashTab>[]) {
  return mount(BaseTabs, {
    props: { modelValue, tabs, tablistLabel: 'Secciones de caja', name: 'caja' },
    attachTo: document.body,
  })
}

type Tira = ReturnType<typeof crear>

/** Se desmonta todo al terminar: `attachTo` inyecta en `document.body`. */
const montadas: Tira[] = []

function montar(modelValue: CashTab = 'open', tabs: TabItem<CashTab>[] = TABS_CAJA): Tira {
  const tira = crear(modelValue, tabs)
  montadas.push(tira)
  return tira
}

afterEach(() => {
  while (montadas.length > 0) montadas.pop()?.unmount()
})

/** Los `<button role="tab">` de la tira, en orden de marcado. */
function pestanas(tira: Tira): DOMWrapper<Element>[] {
  return tira.findAll('button')
}

/** La pestaña `i`, o un fallo con nombre: un `undefined` silencioso aquí no ayuda. */
function pestana(tira: Tira, i: number): DOMWrapper<Element> {
  const b = pestanas(tira)[i]
  if (!b) throw new Error(`no hay pestaña en el índice ${i}`)
  return b
}

/** El `tabindex` de cada pestaña. Es la lectura completa: importa el conjunto. */
function tabindices(tira: Tira): (string | undefined)[] {
  return pestanas(tira).map((b) => b.attributes('tabindex'))
}

function seleccionadas(tira: Tira): (string | undefined)[] {
  return pestanas(tira).map((b) => b.attributes('aria-selected'))
}

/** Índice de la pestaña que tiene el foco del documento, o -1. */
function indiceEnfocado(tira: Tira): number {
  return pestanas(tira).findIndex((b) => b.element === document.activeElement)
}

async function teclear(tira: Tira, indice: number, key: string): Promise<void> {
  await pestana(tira, indice).trigger('keydown', { key })
  // `move()` enfoca dentro de un `nextTick`: hay que dejar correr la cola antes
  // de leer `document.activeElement`.
  await flushPromises()
}

describe('BaseTabs — marcado y enlace ARIA', () => {
  it('es un tablist con nombre y una pestaña por descriptor', () => {
    const tira = montar()

    const lista = tira.find('[role="tablist"]')
    expect(lista.exists()).toBe(true)
    expect(lista.attributes('aria-label')).toBe('Secciones de caja')
    expect(tira.findAll('[role="tab"]')).toHaveLength(3)

    // Rótulo, contador e icono salen del descriptor y no de marcado escrito por
    // el anfitrión: es lo que permitió migrar las tres pantallas a la primitiva.
    // Se comprueba por contención y no por igualdad porque el compilador de Vue
    // condensa el espacio entre `<span>`s, y esa costura no es la promesa.
    expect(pestana(tira, 0).text()).toContain('Mi caja abierta')
    expect(pestana(tira, 1).text()).toContain('Cajas abiertas')
    expect(pestana(tira, 1).text()).toContain('2')
    expect(pestana(tira, 2).text()).toContain('Historial')
    expect(pestana(tira, 2).text()).toContain('128')

    // El punto de estado es decoración: marca «tienes una caja abierta» y no es
    // un contador, así que no puede leerse como contenido.
    expect(pestana(tira, 0).find('.ds-status-dot').attributes('aria-hidden')).toBe('true')
  })

  it('la pestaña seleccionada se declara y es la ÚNICA que apunta a su panel', () => {
    // `aria-controls` solo en la seleccionada: es la única cuyo panel existe en
    // el DOM (los anfitriones montan `BaseTabPanel` con `v-if`), y un
    // `aria-controls` que apunta a un id ausente es peor que no ponerlo.
    const tira = montar('open')

    expect(seleccionadas(tira)).toEqual(['false', 'true', 'false'])
    expect(pestanas(tira).map((b) => b.attributes('aria-controls'))).toEqual([
      undefined,
      panelId('caja', 'open'),
      undefined,
    ])
    expect(pestana(tira, 1).attributes('id')).toBe(tabId('caja', 'open'))
  })
})

describe('BaseTabs — el foco se mueve con el teclado', () => {
  it('ArrowRight y ArrowDown pasan a la siguiente y dan la vuelta al final', async () => {
    const tira = montar('open')

    await teclear(tira, 0, 'ArrowRight')
    expect(indiceEnfocado(tira)).toBe(1)

    await teclear(tira, 1, 'ArrowDown')
    expect(indiceEnfocado(tira)).toBe(2)

    // Circular: desde la última se vuelve a la primera.
    await teclear(tira, 2, 'ArrowRight')
    expect(indiceEnfocado(tira)).toBe(0)
  })

  it('ArrowLeft y ArrowUp pasan a la anterior y dan la vuelta al principio', async () => {
    const tira = montar('open')

    await teclear(tira, 2, 'ArrowLeft')
    expect(indiceEnfocado(tira)).toBe(1)

    await teclear(tira, 1, 'ArrowUp')
    expect(indiceEnfocado(tira)).toBe(0)

    await teclear(tira, 0, 'ArrowLeft')
    expect(indiceEnfocado(tira)).toBe(2)
  })

  it('Home va a la primera y End a la última', async () => {
    const tira = montar('open')

    await teclear(tira, 1, 'End')
    expect(indiceEnfocado(tira)).toBe(2)

    await teclear(tira, 2, 'Home')
    expect(indiceEnfocado(tira)).toBe(0)
  })

  it('una tecla que no es de navegación no mueve el foco', async () => {
    const tira = montar('open')
    await teclear(tira, 1, 'End')
    expect(indiceEnfocado(tira)).toBe(2)

    await teclear(tira, 2, 'a')

    expect(indiceEnfocado(tira), 'escribir una letra no navega la tira').toBe(2)
  })
})

describe('BaseTabs — la activación es MANUAL, no automática', () => {
  it('mover el foco con las flechas NO cambia de pestaña', async () => {
    // El caso que protege la carga al servidor de «Historial»: si esto empieza a
    // emitir, atravesar la tira con la flecha dispara una petición por pestaña.
    const tira = montar('mine')

    await teclear(tira, 0, 'ArrowRight')
    await teclear(tira, 1, 'ArrowRight')
    await teclear(tira, 2, 'Home')
    await teclear(tira, 0, 'End')

    expect(
      tira.emitted('update:modelValue'),
      'la tira pasó a activación automática: atravesar «Historial» con la flecha dispararía su carga al servidor',
    ).toBeUndefined()
  })

  it('Enter activa la pestaña que tiene el foco', async () => {
    const tira = montar('mine')

    await teclear(tira, 0, 'ArrowRight')
    await teclear(tira, 1, 'Enter')

    expect(tira.emitted('update:modelValue')).toEqual([['open']])
  })

  it('Espacio activa igual que Enter', async () => {
    const tira = montar('mine')

    await teclear(tira, 0, 'End')
    await teclear(tira, 2, ' ')

    expect(tira.emitted('update:modelValue')).toEqual([['history']])
  })

  it('el clic activa directamente, sin pasar por el teclado', async () => {
    const tira = montar('mine')

    await pestana(tira, 2).trigger('click')

    expect(tira.emitted('update:modelValue')).toEqual([['history']])
  })

  it('no cambia de pestaña por su cuenta: el marcado sigue al modelValue del padre', async () => {
    // Controlado, como `SegTabs`. Tras activar, mientras el padre no actualice
    // el v-model la seleccionada sigue siendo la anterior.
    const tira = montar('mine')

    await pestana(tira, 2).trigger('click')

    expect(seleccionadas(tira)).toEqual(['true', 'false', 'false'])

    await tira.setProps({ modelValue: 'history' })

    expect(seleccionadas(tira)).toEqual(['false', 'false', 'true'])
  })
})

describe('BaseTabs — tabindex móvil', () => {
  it('exactamente una pestaña es tabulable, y al montar es la seleccionada', () => {
    const tira = montar('open')

    expect(tabindices(tira)).toEqual(['-1', '0', '-1'])
  })

  it('el tabindex sigue al FOCO, no a la selección', async () => {
    // Consecuencia directa de la activación manual: mientras se navega con la
    // flecha sin activar, la seleccionada y la enfocada son distintas, y el
    // punto de reentrada con Tab tiene que ser la enfocada.
    const tira = montar('open')

    await teclear(tira, 1, 'End')

    expect(tabindices(tira)).toEqual(['-1', '-1', '0'])
    expect(
      pestana(tira, 1).attributes('aria-selected'),
      'la seleccionada no cambió: solo se movió el foco',
    ).toBe('true')
  })

  it('al cambiar la selección desde el padre, el tabindex vuelve a ella', async () => {
    const tira = montar('open')
    await teclear(tira, 1, 'End')
    expect(tabindices(tira)).toEqual(['-1', '-1', '0'])

    await tira.setProps({ modelValue: 'mine' })
    await flushPromises()

    expect(tabindices(tira)).toEqual(['0', '-1', '-1'])
  })

  /**
   * EL CASO GRAVE, y el que se va a volver a romper.
   *
   * Se reproduce la secuencia real de `CajaView`: el usuario tiene el foco
   * roaming en «Historial» (índice 2) con «Mi caja abierta» seleccionada, cierra
   * la caja y la tira pierde su primera pestaña. El índice de la seleccionada NO
   * cambia —era 0 y `findIndex` devuelve -1, que el componente normaliza a 0—,
   * así que el `watch` que resincroniza el foco no dispara y `focusIndex` se
   * queda en 2 sobre una lista de 2 elementos.
   *
   * Con el índice crudo, `i === focusIndex` es falso para las dos pestañas que
   * quedan: la tira entera sale del orden de tabulación y no hay forma de volver
   * a entrar con el teclado. Lo corrige `rovingIndex` (BaseTabs.vue:75), que
   * acota el foco al número de pestañas VIVAS.
   */
  it('si la tira ENCOGE y el foco queda fuera de rango, sigue habiendo una pestaña tabulable', async () => {
    const tira = montar('mine')

    await teclear(tira, 0, 'End')
    expect(tabindices(tira), 'el foco quedó en «Historial», índice 2').toEqual(['-1', '-1', '0'])

    // Se cierra la caja: «Mi caja abierta» desaparece de la tira.
    await tira.setProps({ tabs: TABS_SIN_MIA })
    await flushPromises()

    const indices = tabindices(tira)
    expect(
      indices.filter((t) => t === '0'),
      'la tira entera quedó con tabindex="-1": está fuera del orden de tabulación y no hay ' +
        'forma de volver a entrar con el teclado. Es el defecto que `rovingIndex` corrige ' +
        'acotando el foco al número de pestañas vivas.',
    ).toHaveLength(1)
    // Y la tabulable es la última viva, que es hacia donde el foco iba.
    expect(indices).toEqual(['-1', '0'])
  })

  it('la tira encogida sigue navegándose con el teclado', async () => {
    // No basta con que exista un `tabindex="0"`: hay que poder salir de ahí. Si
    // el foco se quedara fuera de rango también para las flechas, el usuario
    // entraría en la tira y no podría moverse dentro de ella.
    const tira = montar('mine')
    await teclear(tira, 0, 'End')
    await tira.setProps({ tabs: TABS_SIN_MIA })
    await flushPromises()

    await teclear(tira, 1, 'Home')

    expect(indiceEnfocado(tira)).toBe(0)
    expect(tabindices(tira)).toEqual(['0', '-1'])
  })

  it('una tira de una sola pestaña deja esa pestaña tabulable', async () => {
    // Frontera de `Math.min(focusIndex, tabs.length - 1)`: con una sola pestaña
    // el tope es 0, y la tira no puede quedarse muda.
    const tira = montar('mine')
    await teclear(tira, 0, 'End')

    await tira.setProps({ tabs: TABS_UNA })
    await flushPromises()

    expect(tabindices(tira)).toEqual(['0'])
  })
})
