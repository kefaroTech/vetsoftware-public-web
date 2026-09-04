<script setup lang="ts">
import { Lock, TriangleAlert } from 'lucide-vue-next'
import { computed, provide, useId } from 'vue'
import { FieldKey, type FieldContext } from './fieldContext'

const props = defineProps<{
  label: string
  required?: boolean
  readonly?: boolean
  hint?: string
  error?: string
  /**
   * id del CONTROL, cuando el formulario necesita conocerlo ANTES de renderizar.
   * Es el caso de `ErrorSummary` (FORM-05): sus enlaces apuntan al id del
   * control, y con el id generado aquí dentro el padre no podía construir la
   * lista. Opcional: sin él todo sigue exactamente igual que hasta ahora.
   */
  id?: string
}>()

/**
 * A11Y-04 · FORM-01 · FORM-02 · FORM-04 — el cableado deja de depender del consumidor.
 *
 * `controlId` conserva EXACTAMENTE el `useId()` que el slot venía entregando
 * MIENTRAS no se pase la prop `id`: los ~170 consumidores que hacen
 * `v-slot="{ id }"` siguen recibiendo el mismo valor y su marcado no cambia ni
 * un byte. Lo nuevo es que, además, el contexto se inyecta, y las primitivas
 * hijas lo recogen solas — así el `for` resuelve también en los 119 usos que
 * nunca abrieron el slot.
 *
 * Los ids DERIVADOS (label, hint, error) se quedan colgando de `uid` y no del
 * id recibido: `uid` es único por instancia, así que siguen sin colisionar
 * aunque dos formularios elijan el mismo `id` de control, y `aria-labelledby` /
 * `aria-describedby` no cambian de valor en ningún uso existente.
 */
const uid = useId()
const controlId = computed(() => props.id ?? uid)
const labelId = `${uid}-label`
const hintId = `${uid}-hint`
const errorId = `${uid}-error`

// El error sustituye a la pista (así se pinta desde siempre), así que en cada
// momento solo uno de los dos puede describir al control.
const describedBy = computed(() => (props.error ? errorId : props.hint ? hintId : undefined))

const field: FieldContext = {
  // Getter, no valor congelado: `props.id` puede venir de una expresión del
  // padre y las primitivas leen `field.controlId` dentro de un `computed`, así
  // que el acceso perezoso lo mantiene reactivo sin tocar el tipo del contexto
  // (y sin obligar a las seis primitivas que ya lo consumen a desenvolver un ref).
  get controlId() {
    return controlId.value
  },
  labelId,
  describedBy,
  invalid: computed(() => !!props.error),
  // §5.4: `required` y `readonly` no conviven —MDN: el atributo no está
  // permitido junto a `readonly`—, y un campo que no se edita no puede fallar
  // una validación. Se apaga aquí para que ninguna primitiva emita
  // `aria-required` sobre un control bloqueado.
  required: computed(() => !!props.required && !props.readonly),
}

provide(FieldKey, field)
</script>

<template>
  <div class="field ds-stack">
    <label :id="labelId" :for="controlId" class="label">
      {{ label }}
      <!-- El candado es el canal VISUAL del estado de solo lectura, y no es
           decorativo: el fondo hundido mide 1,059:1 contra el de deshabilitado
           y 1,125:1 contra el de reposo, así que por sí solo no se ve.
           `aria-hidden` porque el canal auditivo ya lo lleva el `readonly` /
           `aria-readonly` del propio control: duplicarlo haría que el lector
           dijera «Fecha de inicio, candado, solo lectura». -->
      <Lock
        v-if="readonly"
        :size="13"
        :stroke-width="1.8"
        class="ds-icon-muted"
        aria-hidden="true"
      />
      <!-- FORM-04: el asterisco es decoración. El dato lo lleva el texto oculto
           (y el `aria-required` que las primitivas ponen desde el contexto);
           un `*` a secas no se anuncia como «obligatorio» en ningún lector.
           No se pinta en solo lectura (§5.4). -->
      <span v-if="required && !readonly" class="required" aria-hidden="true">*</span>
      <span v-if="required && !readonly" class="ds-sr-only">(obligatorio)</span>
    </label>
    <slot :id="controlId" :readonly="readonly" :field="field" />
    <p v-if="hint && !error" :id="hintId" class="hint ds-hint">{{ hint }}</p>
    <!-- FORM-02: contenedor PERSISTENTE con `aria-live="polite"`. Nunca
         `role="alert"`: estos formularios validan mientras se escribe y un
         `alert` interrumpe al usuario en mitad de la palabra. Persistente
         porque una región viva que nace junto con su contenido no se anuncia.
         `display: contents` la deja sin caja, así que el <p> sigue siendo hijo
         directo de la pila y el hueco de 6px no se mueve en los 289 usos. -->
    <div class="msg" aria-live="polite">
      <p v-if="error" :id="errorId" class="error">
        <TriangleAlert :size="11" :stroke-width="1.8" aria-hidden="true" />
        <span><span class="ds-sr-only">Error: </span>{{ error }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.field {
  gap: 6px;
  min-width: 0;
}

.label {
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-900);
  display: flex;
  align-items: center;
  gap: 4px;
  letter-spacing: -0.005em;
}

.required {
  color: var(--danger-500);
}

.hint {
  margin: 0;
}

/* Sin caja: la región viva no puede introducir un hueco de la pila. */
.msg {
  display: contents;
}

.error {
  margin: 0;
  font-size: 11.5px;
  color: var(--danger-500);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
