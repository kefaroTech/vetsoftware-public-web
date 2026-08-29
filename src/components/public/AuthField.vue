<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed, provide, useId } from 'vue'
import { FieldKey, type FieldContext } from '@/components/ui/fieldContext'

/**
 * Wrapper de campo de la zona pública: label (+ *), contador, hint/error
 * (handoff reg-fields `Field`).
 *
 * TAREA 0 — la zona pública no asociaba NADA. Hasta aquí este componente era el
 * único `<label>` de todo `components/public/` y no llevaba `for`; el error era
 * un `<span role="alert">` hermano, sin `id` y sin que ningún control lo
 * apuntara con `aria-describedby`. Con el control dentro de un `<slot>`, un
 * lector de pantalla anunciaba el campo sin nombre y sin su error: cuatro
 * incumplimientos de nivel A (§1.3.1, §3.3.1, §3.3.2, §1.4.1) repartidos por las
 * siete pantallas públicas, incluida la de registro.
 *
 * La reparación NO inventa nada: reutiliza el `FieldContext` que `BaseField` ya
 * publica en `components/ui/` desde A11Y-04, y por el mismo motivo que allí —
 * el cableado no puede depender de que cada consumidor abra el slot y recoja el
 * `id`. Aquí no había ni slot con `id` que recoger, así que la inyección es la
 * única vía que arregla los 22 usos de una sola vez.
 *
 * `fieldContext.ts` es tenant-only (no existe en la consola), así que esto no
 * toca ningún fichero gemelo TR-02.
 */
const props = defineProps<{
  label?: string
  required?: boolean
  hint?: string
  error?: string
  counter?: string
  /**
   * id del CONTROL, cuando el formulario necesita conocerlo ANTES de renderizar.
   * Es el caso de `ErrorSummary`: sus enlaces apuntan al id del control, y con
   * el id generado aquí dentro el padre no podría construir la lista.
   */
  id?: string
}>()

const uid = useId()
const controlId = computed(() => props.id ?? uid)
const labelId = `${uid}-label`
const hintId = `${uid}-hint`
const errorId = `${uid}-error`

// El error sustituye a la pista, así que en cada momento solo uno de los dos
// puede describir al control.
const describedBy = computed(() => (props.error ? errorId : props.hint ? hintId : undefined))

const field: FieldContext = {
  // Getter y no valor congelado, igual que en `BaseField`: `props.id` puede
  // venir de una expresión del padre y las primitivas lo leen dentro de un
  // `computed`.
  get controlId() {
    return controlId.value
  },
  labelId,
  describedBy,
  invalid: computed(() => !!props.error),
  required: computed(() => !!props.required),
}

provide(FieldKey, field)
</script>

<template>
  <div class="pub-field">
    <div v-if="label" class="pub-field-head">
      <label :id="labelId" :for="controlId" class="pub-field-label">
        {{ label }}<span v-if="required" class="pub-field-req" aria-hidden="true">*</span>
        <span v-if="required" class="ds-sr-only"> (obligatorio)</span>
      </label>
      <span v-if="counter != null" class="pub-field-counter">{{ counter }}</span>
    </div>
    <slot :id="controlId" :field="field" />
    <p v-if="hint && !error" :id="hintId" class="pub-field-hint">{{ hint }}</p>
    <!-- Contenedor PERSISTENTE con `aria-live="polite"`, no `role="alert"`: el
         mismo criterio que `BaseField` y que `AuthBanner` (`assertive` se
         reserva a lo que hace perder trabajo). Persistente porque una región
         viva que nace junto con su contenido no se anuncia. `display: contents`
         la deja sin caja, así que el hueco de la pila no se mueve. -->
    <div class="pub-field-msg" aria-live="polite">
      <p v-if="error" :id="errorId" class="pub-field-error">
        <TriangleAlert :size="12" :stroke-width="1.8" aria-hidden="true" />
        <span><span class="ds-sr-only">Error: </span>{{ error }}</span>
      </p>
    </div>
    <!-- Salida de un callejón sin salida: un error que dice el problema y no da
         el camino («Ese correo ya está registrado») deja al usuario parado. Va
         DESPUÉS del mensaje y fuera de la región viva, para que el lector
         anuncie el error una vez y el enlace se encuentre tabulando. -->
    <slot name="after" />
  </div>
</template>

<style scoped>
.pub-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.pub-field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pub-field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-ink-700);
  letter-spacing: 0.01em;
}

.pub-field-req {
  color: var(--pub-err-tx-2);
  margin-left: 3px;
}

.pub-field-counter {
  font-size: 11px;
  color: var(--pub-ink-500);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* Sin caja: la región viva no puede introducir un hueco en la pila. */
.pub-field-msg {
  display: contents;
}

/* `--pub-err-tx` sobre `--pub-err-bg` mide 4,41:1 y falla §1.4.3 por 0,09.
   `--pub-err-tx-2` ya estaba declarado y mide 5,91:1. */
.pub-field-error {
  margin: 0;
  font-size: 11.5px;
  color: var(--pub-err-tx-2);
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* `--pub-ink-400` mide 4,05:1 sobre blanco y falla §1.4.3 para texto normal.
   La pista PORTA información (formato del documento, para qué sirve el correo
   fiscal) y ahora además la anuncia `aria-describedby`: no puede quedarse por
   debajo del umbral. `--pub-ink-500` mide 6,12:1. */
.pub-field-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--pub-ink-500);
  line-height: 1.4;
}
</style>
