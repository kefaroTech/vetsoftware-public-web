<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  resultsCount: number
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  enter: []
}>()

const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (props.autofocus) inputEl.value?.focus()
})

watch(
  () => props.autofocus,
  (v) => {
    if (v) inputEl.value?.focus()
  },
)

const focused = ref(false)
</script>

<template>
  <div class="search" :class="{ active: focused || (modelValue && modelValue.length > 0) }">
    <Search :size="17" :stroke-width="1.6" class="icon" />
    <input
      ref="inputEl"
      :value="modelValue"
      type="text"
      placeholder="Buscar propietario por nombre, documento o email…"
      autocomplete="off"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.enter.prevent="emit('enter')"
    />
    <span v-if="modelValue && modelValue.length > 0" class="count">
      {{ resultsCount }} resultado{{ resultsCount === 1 ? '' : 's' }}
    </span>
    <span v-else class="count muted">0 resultados</span>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--warm-150);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 12px 14px;
  transition:
    background 0.15s,
    border 0.15s,
    box-shadow 0.15s;
}

.search.active {
  background: var(--warm-50);
  border: 1.5px solid var(--amatista-700);
  box-shadow: var(--ring);
}

.icon {
  color: var(--warm-500);
  flex-shrink: 0;
}

.search.active .icon {
  color: var(--amatista-700);
}

input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 14.5px;
  color: var(--warm-900);
  min-width: 0;
}

input::placeholder {
  color: var(--warm-500);
}

.count {
  font-size: 11px;
  color: var(--warm-600);
  flex-shrink: 0;
}

.count.muted {
  color: var(--warm-500);
}
</style>
