import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ContadorCantidad from '@/features/landing/components/ContadorCantidad.vue'
import { MAX_CANTIDAD_LINEA, MAX_CANTIDAD_LINEA_TXT } from '@/constants/cantidades'
import { elemento, exigir } from '../helpers/exigir'

/**
 * EL CONTADOR DE SEDES Y PERSONAS.
 *
 * <p>Lo que estas pruebas fijan es lo que un rediseño posterior deshace sin
 * darse cuenta: que el `<input>` sigue existiendo —con 10.000 de techo, la
 * versión de solo botones cuesta treinta y nueve pulsaciones para cuarenta
 * sedes—, y que en el límite el botón NO se deshabilita. `disabled` lo saca del
 * orden de tabulación, así que quien llega al mínimo pulsando `−` con el teclado
 * pierde el foco al vacío en ese mismo instante.
 */
function montar(valor: number) {
  return mount(ContadorCantidad, {
    attachTo: document.body,
    props: {
      modelValue: valor,
      etiqueta: 'Sedes',
      unidadSingular: 'sede',
      unidadPlural: 'sedes',
      incluidas: 1,
    },
  })
}

describe('ContadorCantidad — el número se teclea, y el límite no roba el foco', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('el número es un <input type="number"> real, con su etiqueta y sus topes', () => {
    const wrapper = montar(3)
    const campo = wrapper.find('input[type="number"]')

    expect(campo.exists()).toBe(true)
    expect((campo.element as HTMLInputElement).value).toBe('3')
    expect(campo.attributes('min')).toBe('1')
    expect(campo.attributes('max')).toBe(String(MAX_CANTIDAD_LINEA))

    const etiqueta = wrapper.find('label')
    expect(etiqueta.attributes('for')).toBe(campo.attributes('id'))
    expect(etiqueta.text()).toContain('Sedes')
    expect(etiqueta.text()).toContain('· 1 incluida')
  })

  it('los dos botones se nombran como manda el copy y suman uno a uno', async () => {
    const wrapper = montar(3)
    const [menos, mas] = wrapper.findAll('button')

    expect(exigir(menos, 'el botón de restar').attributes('aria-label')).toBe('Una sede menos')
    expect(exigir(mas, 'el botón de sumar').attributes('aria-label')).toBe('Una sede más')

    await exigir(mas, 'el botón de sumar').trigger('click')
    await exigir(menos, 'el botón de restar').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[4], [2]])
  })

  it('en el mínimo el botón conserva el foco, no emite, y dice por qué', async () => {
    const wrapper = montar(1)
    const menos = elemento(wrapper.findAll('button'), 0, 'los botones del contador')
    const boton = menos.element as HTMLButtonElement

    boton.focus()
    expect(document.activeElement).toBe(boton)

    await menos.trigger('click')

    // Lo que de verdad importa: sigue enfocado y sigue siendo tabulable.
    expect(document.activeElement).toBe(boton)
    expect(menos.attributes('disabled')).toBeUndefined()
    expect(menos.attributes('aria-disabled')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    const motivo = wrapper.find(`#${exigir(menos.attributes('aria-describedby'), 'el motivo')}`)
    expect(motivo.text()).toBe('Ya estás en el mínimo: 1 sede.')
  })

  it('en el máximo pasa lo mismo, y el motivo nombra el límite que se aplica', async () => {
    const wrapper = montar(MAX_CANTIDAD_LINEA)
    const mas = elemento(wrapper.findAll('button'), 1, 'los botones del contador')

    await mas.trigger('click')

    expect(mas.attributes('disabled')).toBeUndefined()
    expect(mas.attributes('aria-disabled')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    const motivo = wrapper.find(`#${exigir(mas.attributes('aria-describedby'), 'el motivo')}`)
    expect(motivo.text()).toBe(`Ya estás en el máximo: ${MAX_CANTIDAD_LINEA_TXT} sedes.`)
  })

  it('fuera del límite el botón no lleva aria-disabled ni descripción', () => {
    const wrapper = montar(5)
    for (const boton of wrapper.findAll('button')) {
      expect(boton.attributes('aria-disabled')).toBeUndefined()
      expect(boton.attributes('aria-describedby')).toBeUndefined()
    }
  })

  it('un número por encima del techo se recorta Y se dice', async () => {
    const wrapper = montar(3)
    await wrapper.find('input[type="number"]').setValue(String(MAX_CANTIDAD_LINEA + 1))

    expect(wrapper.emitted('update:modelValue')).toEqual([[MAX_CANTIDAD_LINEA]])
    const aviso = wrapper.find('[role="status"]')
    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain(MAX_CANTIDAD_LINEA_TXT)
  })

  it('sin recorte no hay aviso: el techo solo se nombra cuando muerde', async () => {
    const wrapper = montar(3)
    await wrapper.find('input[type="number"]').setValue('40')

    expect(wrapper.emitted('update:modelValue')).toEqual([[40]])
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
  })
})
