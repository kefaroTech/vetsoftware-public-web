<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { computed, inject, ref } from 'vue'
import { FieldKey } from '@/components/ui/fieldContext'

/** Select nativo estilizado con estado loading (handoff reg-fields `SelectInput`). */
const props = withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    options: { value: string; label: string }[]
    placeholder?: string
    invalid?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  { invalid: false, disabled: false, loading: false },
)
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'blur'): void
}>()

/** TAREA 0 — mismo cableado que `AuthInput`: la prop explícita primero, el
 * contexto de `AuthField` después. Ver el comentario de `AuthField.vue`. */
const field = inject(FieldKey, null)

const controlId = computed(() => props.id ?? field?.controlId)
const describedBy = computed(() => field?.describedBy.value)
const ariaRequired = computed(() => (field?.required.value ? true : undefined))

const focused = ref(false)
function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value)
}
function onBlur() {
  focused.value = false
  emit('blur')
}
</script>

<template>
  <div class="pub-select" :class="{ 'is-focused': focused, 'is-invalid': invalid }">
    <select
      :id="controlId"
      :value="modelValue"
      :disabled="disabled || loading"
      :aria-invalid="invalid"
      :aria-describedby="describedBy"
      :aria-required="ariaRequired"
      :class="{ 'is-placeholder': !modelValue }"
      @change="onChange"
      @focus="focused = true"
      @blur="onBlur"
    >
      <option v-if="placeholder" value="">{{ loading ? 'Cargando…' : placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <span class="pub-select-tail">
      <span v-if="loading" class="pub-select-spin" />
      <ChevronDown v-else :size="15" class="pub-select-chev" aria-hidden="true" />
    </span>
  </div>
</template>

<style scoped>
.pub-select {
  position: relative;
}

.pub-select select {
  width: 100%;
  appearance: none;
  padding: 10px 38px 10px 12px;
  font-family: inherit;
  font-size: 14px;
  color: var(--pub-ink-900);
  background: var(--pub-surface);
  border: 1px solid var(--pub-ame-600);
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

/* El marcador de posición de este select no es decorativo: en la cascada
   geográfica dice «Cargando…» mientras baja el catálogo, y es el único canal
   que informa de la espera. Necesita contraste de texto, no de marcador. */
.pub-select select.is-placeholder {
  color: var(--pub-ink-500);
}

.pub-select select:disabled {
  background: var(--pub-tint-mute);
  cursor: not-allowed;
  opacity: 0.6;
}

.pub-select.is-focused select {
  border-color: var(--pub-ame-500);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--pub-ame-500) 14%, transparent);
}

.pub-select.is-invalid select {
  border-color: var(--pub-err-tx-2);
}

.pub-select.is-invalid.is-focused select {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--pub-err-tx-2) 12%, transparent);
}

.pub-select-tail {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--pub-ink-500);
  display: grid;
  place-items: center;
}

.pub-select-spin {
  width: 14px;
  height: 14px;

  /* La pista del anillo es el contorno de un indicador de estado, no un
     adorno: le aplica el 3:1 de §1.4.11. */
  border: 2px solid var(--pub-ame-500);
  border-top-color: var(--pub-ame-700);
  border-radius: 50%;
  display: block;
  animation: pub-spin 0.7s linear infinite;
}
</style>
