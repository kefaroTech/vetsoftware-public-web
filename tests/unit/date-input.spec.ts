import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateInput from '@/components/ui/DateInput.vue'

/**
 * `DateInput` pasaba `:editable="false"` al datepicker, y la librería traduce
 * eso a `readonly` en el `<input>` (`PickerInput`: `readonly: !props.editable`).
 * Un campo `readonly` no se puede rellenar con teclado: la única forma de poner
 * una fecha era abrir el calendario y navegarlo con el ratón — WCAG 2.2 §2.1.1
 * en los ~54 sitios que montan este componente, incluida la fecha de nacimiento
 * del paciente y la de cada receta.
 *
 * El arreglo (A11Y-02) es literalmente un booleano. **Por eso el aserto que más
 * vale es el más tonto**: comprobar que el `input` renderizado NO tiene
 * `readonly`. Volver atrás es un cambio de una letra, no lo va a ver nadie en
 * una revisión, y ninguna otra prueba del repositorio lo notaría.
 *
 * Los otros dos casos vigilan lo que el arreglo NO debía romper: el contrato
 * del `v-model` sigue siendo `YYYY-MM-DD`, y un texto que no case con el
 * formato no emite nada en vez de emitir basura.
 */

const montar = (props: Record<string, unknown> = {}) =>
  mount(DateInput, { props: { modelValue: '', ...props } })

describe('DateInput — el campo se puede teclear', () => {
  it('el input NO es readonly', () => {
    // El aserto de una letra. Si vuelve `:editable="false"`, aquí sale ''.
    const wrapper = montar()

    expect(wrapper.find('input').attributes('readonly')).toBeUndefined()
  })

  it('sigue sin ser readonly cuando el campo está marcado como inválido', () => {
    // `invalid` inyecta `input-attr`, que es lo que la librería mezcla ENCIMA
    // de `readonly`. Un `input-attr` mal construido podría reintroducirlo.
    const wrapper = montar({ invalid: true, id: 'bod' })

    const input = wrapper.find('input')
    expect(input.attributes('readonly')).toBeUndefined()
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('id')).toBe('bod')
  })

  it('deshabilitado sí bloquea, y eso es correcto: no es lo mismo que readonly', () => {
    const wrapper = montar({ disabled: true })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })
})

describe('DateInput — lo que se teclea sale como YYYY-MM-DD', () => {
  it('«20 ago 2026» emite «2026-08-20»', async () => {
    const wrapper = montar()
    const input = wrapper.find('input')

    await input.setValue('20 ago 2026')
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-08-20']])
  })

  it('«20/08/2026» no emite nada: no case con el formato declarado', async () => {
    // El contrato del v-model no cambió con A11Y-02. La librería parsea contra
    // `DD MMM YYYY`, descarta lo que no case y revierte el input. Si esto
    // empezara a emitir, el consumidor recibiría una fecha que no pidió nadie.
    const wrapper = montar()
    const input = wrapper.find('input')

    await input.setValue('20/08/2026')
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('un texto sin sentido tampoco emite', async () => {
    const wrapper = montar()
    const input = wrapper.find('input')

    await input.setValue('tururu')
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('respeta `max`: una fecha fuera de rango no se emite', async () => {
    // `disabled-date` es lo que impide teclear una fecha de nacimiento futura
    // ahora que el campo acepta texto. Sin esto, abrir el teclado habría
    // abierto también un agujero de validación.
    const wrapper = montar({ max: '2026-08-20' })
    const input = wrapper.find('input')

    await input.setValue('21 ago 2026')
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it.skip('DEFECTO ABIERTO #109 — «32 ago 2026» debería rechazarse, pero se guarda como 2026-09-01', async () => {
    // https://github.com/kefaroTech/vetsoftware-public-web/issues/109
    //
    // No está escrito como si pasara a propósito: HOY FALLA. El parser de la
    // librería normaliza el desbordamiento de día en vez de rechazarlo, así que
    // el campo acepta un día que no existe y lo corre al mes siguiente en
    // silencio. Es un defecto real de A11Y-02: solo se puede teclear un 32
    // desde que el campo dejó de ser readonly.
    //
    // Reactivar este `skip` es la comprobación de que #109 quedó cerrado.
    const wrapper = montar()
    const input = wrapper.find('input')

    await input.setValue('32 ago 2026')
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
