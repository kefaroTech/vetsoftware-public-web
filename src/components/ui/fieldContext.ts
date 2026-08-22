import type { ComputedRef, InjectionKey } from 'vue'

/**
 * Contexto que `BaseField` publica y que consumen las primitivas de campo
 * (`BaseInput`, `BaseTextarea`, `BaseSelect`, `SearchableSelect`, `DateInput`,
 * `SegmentedRadio`).
 *
 * Existe por A11Y-04: hasta aquí `BaseField` generaba el id, lo pintaba en su
 * `<label :for>` y lo OFRECÍA por slot. De los 289 usos del tenant, 119 no lo
 * recogían, así que el `for` apuntaba a un elemento inexistente: la etiqueta se
 * veía, y no nombraba nada. Inyectarlo lo arregla en la primitiva —una vez— en
 * lugar de en 119 consumidores.
 *
 * Las primitivas leen SIEMPRE su prop explícita primero y este contexto después
 * (`props.id ?? field?.controlId`), para que sigan funcionando fuera de
 * `BaseField` y para que ningún consumidor actual cambie de comportamiento.
 */
export interface FieldContext {
  /**
   * id del control. Es el mismo valor que el slot ofrece como `{ id }`: el
   * `useId()` de `BaseField`, o el que el padre le pase por la prop `id` cuando
   * necesita conocerlo de antemano (los enlaces de `ErrorSummary`, FORM-05).
   * `BaseField` lo publica como *getter*, así que leerlo dentro de un `computed`
   * sigue siendo reactivo.
   */
  controlId: string
  /**
   * id del `<label>`. Imprescindible para los grupos: `<label for>` solo alcanza
   * a elementos etiquetables, y sobre un `role="radiogroup"` es inerte. Ahí el
   * nombre viaja por `aria-labelledby` contra este id.
   */
  labelId: string
  /** id de la pista o del error, el que aplique. Lo que va en `aria-describedby`. */
  describedBy: ComputedRef<string | undefined>
  /**
   * Si el campo está en error. Se publica para quien lo necesite; las primitivas
   * NO lo usan para teñirse —eso sigue viniendo de su prop `invalid`— porque
   * derivarlo aquí pintaría de rojo controles que hoy no lo están.
   */
  invalid: ComputedRef<boolean>
  /** Si el campo es obligatorio. Alimenta el `aria-required` de las primitivas (FORM-04). */
  required: ComputedRef<boolean>
}

export const FieldKey: InjectionKey<FieldContext> = Symbol('ds-field')
