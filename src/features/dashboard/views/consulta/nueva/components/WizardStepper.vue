<script setup lang="ts">
import { Check } from 'lucide-vue-next'

interface Step {
  n: 1 | 2 | 3 | 4
  label: string
}

const steps: Step[] = [
  { n: 1, label: 'Propietario' },
  { n: 2, label: 'Mascota' },
  { n: 3, label: 'Consulta' },
  { n: 4, label: 'Resumen' },
]

defineProps<{ active: 1 | 2 | 3 | 4 }>()

defineEmits<{ navigate: [step: 1 | 2 | 3 | 4] }>()
</script>

<template>
  <nav
    class="stepper"
    role="progressbar"
    :aria-valuenow="active"
    :aria-valuemin="1"
    :aria-valuemax="4"
  >
    <template v-for="(s, i) in steps" :key="s.n">
      <button
        type="button"
        class="item"
        :class="{
          done: s.n < active,
          current: s.n === active,
          future: s.n > active,
        }"
        :disabled="s.n >= active"
        @click="s.n < active && $emit('navigate', s.n)"
      >
        <span class="bullet">
          <Check v-if="s.n < active" :size="13" :stroke-width="2" />
          <span v-else>{{ s.n }}</span>
        </span>
        <span class="label">{{ s.label }}</span>
      </button>
      <div
        v-if="i < steps.length - 1"
        class="sep"
        :class="{ done: s.n < active }"
      />
    </template>
  </nav>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  padding: 0;
  font-family: inherit;
  flex-shrink: 0;
}
.item:not(:disabled) {
  cursor: pointer;
}
.item:disabled {
  cursor: default;
}
.bullet {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.2s;
}
.item.future .bullet {
  background: var(--warm-150);
  color: var(--warm-500);
  border: 1px solid var(--warm-200);
}
.item.done .bullet {
  background: var(--amatista-100);
  color: var(--amatista-700);
  border: 1px solid transparent;
}
.item.current .bullet {
  background: var(--amatista-700);
  color: white;
  border: none;
}
.label {
  font-size: 13px;
  letter-spacing: -0.005em;
  white-space: nowrap;
}
.item.future .label {
  color: var(--warm-500);
}
.item.done .label {
  color: var(--warm-600);
}
.item.current .label {
  color: var(--warm-900);
  font-weight: 600;
}
.sep {
  flex: 1;
  height: 1px;
  margin: 0 14px;
  background: var(--warm-200);
  min-width: 24px;
}
.sep.done {
  background: var(--amatista-700);
  opacity: 0.4;
}
.item:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: 4px;
  border-radius: 6px;
}
</style>
