<script setup lang="ts">
import { computed } from 'vue'
import { Calendar } from 'lucide-vue-next'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { es } from 'date-fns/locale'

const props = defineProps<{
  modelValue?: string | null
  id?: string
  placeholder?: string
  min?: string
  max?: string
  invalid?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const dateValue = computed<Date | null>(() => {
  if (!props.modelValue) return null
  const [y, m, d] = props.modelValue.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
})

const minDate = computed(() => (props.min ? new Date(props.min) : undefined))
const maxDate = computed(() => (props.max ? new Date(props.max) : undefined))

function handleUpdate(v: Date | null) {
  if (!v) {
    emit('update:modelValue', '')
    return
  }
  const yyyy = v.getFullYear()
  const mm = String(v.getMonth() + 1).padStart(2, '0')
  const dd = String(v.getDate()).padStart(2, '0')
  emit('update:modelValue', `${yyyy}-${mm}-${dd}`)
}
</script>

<template>
  <div class="date-wrap" :class="{ invalid, disabled }">
    <VueDatePicker
      :uid="id"
      :model-value="dateValue"
      :min-date="minDate"
      :max-date="maxDate"
      :disabled="disabled"
      :locale="es"
      format="dd MMM yyyy"
      :enable-time-picker="false"
      auto-apply
      teleport="body"
      :clearable="false"
      :placeholder="placeholder ?? 'Seleccionar fecha'"
      :month-change-on-scroll="false"
      week-start="1"
      @update:model-value="handleUpdate"
      @closed="emit('blur')"
    >
      <template #input-icon>
        <Calendar :size="14" :stroke-width="1.6" class="icon" />
      </template>
    </VueDatePicker>
  </div>
</template>

<style scoped>
.date-wrap {
  --dp-font-family: var(--font-sans);
  --dp-border-radius: 8px;
  --dp-border-color: var(--warm-200);
  --dp-border-color-hover: var(--warm-300);
  --dp-border-color-focus: var(--amatista-500);
  --dp-background-color: var(--warm-50);
  --dp-text-color: var(--warm-900);
  --dp-input-padding: 10px 14px 10px 40px;
  --dp-input-icon-padding: 14px;
  --dp-font-size: 13.5px;
  --dp-primary-color: var(--amatista-600);
  --dp-primary-text-color: white;
  --dp-hover-color: var(--warm-100);
  --dp-icon-color: var(--warm-500);
  --dp-menu-border-color: var(--warm-200);
}
.date-wrap.invalid {
  --dp-border-color: oklch(60% 0.20 25);
  --dp-border-color-focus: oklch(55% 0.22 25);
  --dp-icon-color: oklch(55% 0.22 25);
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.date-wrap.disabled {
  opacity: 0.6;
}
.icon {
  color: var(--warm-500);
}
.date-wrap.invalid .icon {
  color: oklch(55% 0.22 25);
}
@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
:deep(.dp__input) {
  font-family: var(--font-sans);
  font-weight: 400;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 14px 10px 40px;
  font-size: 13.5px;
  color: var(--warm-900);
  transition: border-color 0.15s, box-shadow 0.15s;
}
:deep(.dp__input:hover) {
  border-color: var(--warm-300);
}
:deep(.dp__input_focus) {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--amatista-500) 18%, transparent);
}
.date-wrap.invalid :deep(.dp__input) {
  border-color: oklch(60% 0.20 25);
  background: oklch(98.5% 0.02 25);
}
.date-wrap.invalid :deep(.dp__input_focus) {
  border-color: oklch(55% 0.22 25);
  box-shadow: 0 0 0 3px oklch(92% 0.06 25);
}
:deep(.dp__input_icon) {
  color: var(--warm-500);
}
</style>
