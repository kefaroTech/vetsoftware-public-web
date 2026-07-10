<script setup lang="ts">
/** Wrapper de campo: label (+ *), contador, hint/error (handoff reg-fields `Field`). */
defineProps<{
  label?: string
  required?: boolean
  hint?: string
  error?: string
  counter?: string
}>()
</script>

<template>
  <div class="pub-field">
    <div v-if="label" class="pub-field-head">
      <label class="pub-field-label">
        {{ label }}<span v-if="required" class="pub-field-req">*</span>
      </label>
      <span v-if="counter != null" class="pub-field-counter">{{ counter }}</span>
    </div>
    <slot />
    <span v-if="error" class="pub-field-error" role="alert">
      <v-icon size="12">mdi-alert-circle-outline</v-icon> {{ error }}
    </span>
    <span v-else-if="hint" class="pub-field-hint">{{ hint }}</span>
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
  color: var(--pub-err-tx);
  margin-left: 3px;
}
.pub-field-counter {
  font-size: 11px;
  color: #a08bbd;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.pub-field-error {
  font-size: 11.5px;
  color: var(--pub-err-tx);
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 5px;
}
.pub-field-hint {
  font-size: 11.5px;
  color: var(--pub-ink-400);
  line-height: 1.4;
}
</style>
