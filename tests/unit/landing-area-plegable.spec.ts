import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AreaPlegable from '@/features/landing/components/AreaPlegable.vue'
import { exigir } from '../helpers/exigir'

/**
 * LA CABECERA DE ÁREA.
 *
 * <p>Tres decisiones que se fijan aquí porque las tres son invisibles mirando la
 * pantalla: que el disparador es un `<button>` dentro de un `<h3>` —con trece
 * casillas abiertas se navega por encabezado, no tabulando—, que la insignia
 * forma parte del nombre accesible **a propósito** (plegada, es lo único que
 * dice qué hay dentro) y que el resumen de rótulos NO forma parte de él, porque
 * se repite íntegro dentro del cuerpo.
 */
function montar(over: Partial<InstanceType<typeof AreaPlegable>['$props']> = {}) {
  return mount(AreaPlegable, {
    attachTo: document.body,
    props: {
      nombre: 'Atención a los pacientes',
      resumen: 'Agenda · Historia clínica',
      abierta: false,
      marcados: 2,
      total: 4,
      ...over,
    },
    slots: { default: '<label class="fila"><input type="checkbox" /> Agenda</label>' },
  })
}

describe('AreaPlegable — encabezado real, un solo disparador y ninguna región viva', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('el disparador es un <button type="button"> dentro del <h3>', () => {
    const wrapper = montar()
    const boton = wrapper.find('h3 button')

    expect(boton.exists()).toBe(true)
    expect(boton.attributes('type')).toBe('button')
    // Un `<button>` nativo trae Enter y Espacio de fábrica: nada de `@keydown`.
    expect(boton.attributes('tabindex')).toBeUndefined()
  })

  it('plegada: sin cuerpo, aria-expanded en falso y aria-controls apuntando al id futuro', () => {
    const wrapper = montar()
    const boton = wrapper.find('h3 button')

    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('fieldset').exists()).toBe(false)
    expect(boton.attributes('aria-controls')).toBeTruthy()
  })

  it('abierta: el cuerpo es un <fieldset> con <legend> oculto, y aria-controls casa con su id', () => {
    const wrapper = montar({ abierta: true })
    const boton = wrapper.find('h3 button')
    const cuerpo = wrapper.find('fieldset')

    expect(boton.attributes('aria-expanded')).toBe('true')
    expect(cuerpo.attributes('id')).toBe(boton.attributes('aria-controls'))

    const leyenda = cuerpo.find('legend')
    expect(leyenda.text()).toBe('Atención a los pacientes')
    expect(leyenda.classes()).toContain('ds-sr-only')
    expect(cuerpo.find('.fila').exists()).toBe(true)
  })

  it('el nombre accesible es «nombre + insignia»; el resumen baja a descripción', () => {
    const wrapper = montar()
    const boton = wrapper.find('h3 button')
    const partes = exigir(boton.attributes('aria-labelledby'), 'el nombre accesible').split(' ')

    expect(partes).toHaveLength(2)
    expect(wrapper.find(`#${exigir(partes[0], 'el id del nombre')}`).text()).toBe(
      'Atención a los pacientes',
    )
    expect(wrapper.find(`#${exigir(partes[1], 'el id de la insignia')}`).text()).toBe(
      '2 de 4 módulos marcados',
    )

    const idResumen = exigir(boton.attributes('aria-describedby'), 'la descripción')
    expect(partes).not.toContain(idResumen)
    expect(wrapper.find(`#${idResumen}`).text()).toBe('Agenda · Historia clínica')
  })

  it('«ninguno» a secas no significa nada leído de corrido: se completa para el lector', () => {
    const wrapper = montar({ marcados: 0 })
    const insignia = wrapper.find('.lsm-badge')

    expect(insignia.text()).toBe('ninguno de 4 módulos marcados')
    expect(insignia.classes()).toContain('pub-badge--off')
    expect(insignia.find('.ds-sr-only').text()).toBe('de 4 módulos marcados')
  })

  it('la insignia NO es una región viva: marcar una casilla ya se anuncia sola', () => {
    const wrapper = montar()

    expect(wrapper.findAll('[aria-live]')).toHaveLength(0)
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
    expect(wrapper.find('.lsm-badge').classes()).toContain('pub-badge--on')
  })

  it('pulsar la cabecera solo pide alternar: quien decide es el padre', async () => {
    const wrapper = montar()
    await wrapper.find('h3 button').trigger('click')

    expect(wrapper.emitted('alternar')).toHaveLength(1)
  })

  it('expone cómo recoger el foco cuando alguien cierra el área desde fuera', () => {
    const wrapper = montar({ abierta: true })
    ;(wrapper.vm as unknown as { enfocar: () => void }).enfocar()

    expect(document.activeElement).toBe(wrapper.find('h3 button').element)
  })
})
