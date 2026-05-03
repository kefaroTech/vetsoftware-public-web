<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    rows?: number
    id?: string
  }>(),
  { rows: 4 },
)

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <textarea
    :id="id"
    class="textarea"
    :rows="rows"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>

<style scoped>
.textarea {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--warm-900);
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.textarea:focus {
  outline: none;
  border-color: var(--amatista-700);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.textarea::placeholder {
  color: var(--warm-500);
}
</style>
