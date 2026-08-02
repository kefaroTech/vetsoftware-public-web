<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { useId } from 'vue'

defineProps<{
  label: string
  required?: boolean
  hint?: string
  error?: string
}>()

const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id" class="label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <slot :id="id" />
    <p v-if="hint && !error" class="hint">{{ hint }}</p>
    <p v-if="error" class="error">
      <TriangleAlert :size="11" :stroke-width="1.8" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
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
  color: oklch(55% 0.18 25deg);
}

.hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--warm-500);
}

.error {
  margin: 0;
  font-size: 11.5px;
  color: oklch(55% 0.18 25deg);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
