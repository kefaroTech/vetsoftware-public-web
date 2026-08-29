import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'

/**
 * El resumen de errores — la pieza que sustituyó a «revisa los campos marcados
 * en rojo».
 *
 * Aquel texto **solo funciona si ves el color**: incumple §1.4.1 Use of Color y
 * deja sin salida a quien usa lector de pantalla, a quien no distingue el rojo y
 * a cualquiera con el brillo bajo al sol. La sustitución no es «poner una lista»:
 * son tres propiedades concretas, y esta prueba sujeta las tres porque ninguna
 * se ve en una captura de pantalla.
 *
 *  1. El texto de cada entrada es el **literal** del error en línea. Reformularlo
 *     («falta el motivo» arriba, «Escribe por qué revocas este medio de pago»
 *     abajo) obliga a adivinar que son el mismo error.
 *  2. El orden es el del **DOM**, no el de las claves del objeto de errores.
 *  3. El ancla mueve el **FOCO**, no solo el hash.
 */

describe('toSummaryItems · el orden es el del formulario', () => {
  it('respeta el orden declarado, no el de las claves del objeto', () => {
    // El objeto llega con las claves al revés a propósito: el orden de claves de
    // un objeto no garantiza el orden visual en cuanto alguien reordena el
    // `computed` que produce `errors`.
    const errores = { telefono: 'Falta el teléfono', nombre: 'Falta el nombre' }
    const ids = { nombre: 'id-nombre', telefono: 'id-telefono' }

    const items = toSummaryItems(errores, ids, ['nombre', 'telefono'])

    expect(items.map((i) => i.id)).toEqual(['id-nombre', 'id-telefono'])
  })

  it('el texto es el mismo objeto de cadena que el error en línea, sin reformular', () => {
    const mensaje = 'Escribe por qué revocas este medio de pago.'
    const items = toSummaryItems({ reason: mensaje }, { reason: 'id-reason' }, ['reason'])

    expect(items[0]!.text).toBe(mensaje)
  })

  it('omite los campos sin error y los que no tienen id al que apuntar', () => {
    const items = toSummaryItems(
      { a: 'Error de A', b: null, c: 'Error de C' },
      { a: 'id-a', b: 'id-b' }, // `c` no tiene id: un ancla suya no llevaría a ningún sitio
      ['a', 'b', 'c'],
    )

    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe('id-a')
  })

  it('apunta al id del CONTROL, que es el mismo del `<label for>`', () => {
    // Si apuntara al id del MENSAJE, el ancla llevaría el foco a un párrafo y
    // quien lo siguiera no podría escribir la corrección.
    const items = toSummaryItems({ x: 'mal' }, { x: 'campo-x' }, ['x'])
    expect(items[0]!.id).toBe('campo-x')
  })
})

describe('ErrorSummary · lo que pinta', () => {
  const items = [
    { id: 'campo-uno', text: 'Falta el nombre' },
    { id: 'campo-dos', text: 'Falta el teléfono' },
  ]

  it('no se monta cuando no hay errores: nada de una caja roja vacía', () => {
    const w = mount(ErrorSummary, { props: { items: [] } })
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('cuenta los problemas y concuerda en número', () => {
    expect(mount(ErrorSummary, { props: { items: items.slice(0, 1) } }).text()).toContain(
      'Hay 1 problema en este formulario',
    )
    expect(mount(ErrorSummary, { props: { items } }).text()).toContain(
      'Hay 2 problemas en este formulario',
    )
  })

  it('lista el texto literal de cada error, en el orden recibido', () => {
    const enlaces = mount(ErrorSummary, { props: { items } }).findAll('a')
    expect(enlaces.map((a) => a.text())).toEqual(['Falta el nombre', 'Falta el teléfono'])
    expect(enlaces.map((a) => a.attributes('href'))).toEqual(['#campo-uno', '#campo-dos'])
  })

  it('es `alert` y focalizable: el padre le manda el foco tras un envío fallido', () => {
    // Aquí sí `alert`: acaba de ocurrir algo por una acción del usuario y le
    // impide continuar. Es el caso que `assertive` existe para cubrir.
    const raiz = mount(ErrorSummary, { props: { items } }).find('[role="alert"]')
    expect(raiz.exists()).toBe(true)
    expect(raiz.attributes('tabindex')).toBe('-1')
  })

  it('el ancla mueve el FOCO al control, no solo el hash', async () => {
    // El contenedor de scroll suele ser un `div` con `overflow: auto`, y el salto
    // por hash del navegador no lo desplaza: sin esto, el enlace parece muerto.
    const control = document.createElement('input')
    control.id = 'campo-uno'
    document.body.appendChild(control)
    const enfocar = vi.spyOn(control, 'focus')
    // jsdom no implementa `scrollIntoView`.
    control.scrollIntoView = vi.fn()

    try {
      const w = mount(ErrorSummary, { props: { items } })
      await w.findAll('a')[0]!.trigger('click')

      expect(enfocar).toHaveBeenCalled()
      expect(control.scrollIntoView).toHaveBeenCalled()
    } finally {
      control.remove()
    }
  })

  it('un ancla hacia un id que no existe no revienta la pantalla', async () => {
    const w = mount(ErrorSummary, { props: { items: [{ id: 'no-existe', text: 'mal' }] } })
    await expect(w.findAll('a')[0]!.trigger('click')).resolves.not.toThrow()
  })
})
