<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'

/**
 * Selector de hora de inicio simple y coherente con el design system: dos
 * listbox (hora 00–23 y minuto en pasos de 5). Emite "HH:mm".
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string | null // "HH:mm"
    invalid?: boolean
    disabled?: boolean
  }>(),
  { modelValue: '09:00' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hourOptions = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0')
  return { value: v, label: v }
})
const minuteOptions = Array.from({ length: 12 }, (_, i) => {
  const v = String(i * 5).padStart(2, '0')
  return { value: v, label: v }
})

const hour = computed(() => (props.modelValue ?? '09:00').slice(0, 2))
const minute = computed(() => (props.modelValue ?? '09:00').slice(3, 5))

function setHour(h: string) {
  emit('update:modelValue', `${h}:${minute.value}`)
}
function setMinute(m: string) {
  emit('update:modelValue', `${hour.value}:${m}`)
}
</script>

<template>
  <div class="time-input">
    <BaseSelect
      :model-value="hour"
      :options="hourOptions"
      :invalid="invalid"
      :disabled="disabled"
      @update:model-value="setHour"
    />
    <span class="sep">:</span>
    <BaseSelect
      :model-value="minute"
      :options="minuteOptions"
      :invalid="invalid"
      :disabled="disabled"
      @update:model-value="setMinute"
    />
  </div>
</template>

<style scoped>
.time-input {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 6px;
}
.sep {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--warm-500);
}
</style>
