<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Check } from 'lucide-vue-next'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import IdentityStep from './IdentityStep.vue'
import ResolutionsStep from './ResolutionsStep.vue'
import ReviewStep from './ReviewStep.vue'

const props = withDefaults(defineProps<{ initialStep?: number }>(), { initialStep: 1 })
const emit = defineEmits<{ exit: [] }>()

const { profileOk, invoiceResolutionOk } = useFacturacionEnablement()

const STEPS = [
  { n: 1, label: 'Identidad fiscal' },
  { n: 2, label: 'Resoluciones' },
  { n: 3, label: 'Revisión' },
]

const step = ref(Math.min(3, Math.max(1, props.initialStep)))

const okByStep = computed<Record<number, boolean>>(() => ({
  1: profileOk.value,
  2: invoiceResolutionOk.value,
  3: false,
}))

function go(n: number) {
  if (n >= 1 && n <= 3) step.value = n
}
</script>

<template>
  <div class="wizard ds-stack">
    <header class="wiz-top">
      <button type="button" class="wiz-exit ds-hover-accent" @click="emit('exit')">
        <ArrowLeft :size="15" :stroke-width="1.8" /> Volver al estado
      </button>
      <span class="wiz-title">Habilitar facturación electrónica</span>
    </header>

    <div class="ds-flex-row ds-flex-row--6">
      <template v-for="(s, i) in STEPS" :key="s.n">
        <button
          type="button"
          class="wstep"
          :class="{ cur: s.n === step, done: okByStep[s.n] && s.n < step }"
          @click="go(s.n)"
        >
          <span class="wstep-dot ds-tone--neutral">
            <Check v-if="okByStep[s.n] && s.n < step" :size="13" :stroke-width="2.6" />
            <template v-else>{{ s.n }}</template>
          </span>
          <span class="wstep-lbl">{{ s.label }}</span>
        </button>
        <span v-if="i < STEPS.length - 1" class="wstep-bar" :class="{ done: s.n < step }" />
      </template>
    </div>

    <div class="wiz-body">
      <IdentityStep v-if="step === 1" @back="emit('exit')" @next="go(2)" />
      <ResolutionsStep v-else-if="step === 2" @back="go(1)" @next="go(3)" />
      <ReviewStep v-else @edit-step="go" @exit="emit('exit')" />
    </div>
  </div>
</template>

<style scoped>
/* Layout: `.ds-stack` en la columna raíz; su gap (24px) no está catalogado y queda aquí. */
.wizard {
  gap: 24px;
}

.wiz-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wiz-exit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--warm-600);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
}

/* El hover del "volver" es `.ds-hover-accent` (primitives.css), igual que en
   `FeDocumentDetail` (`.back`): es la variante de BOTÓN DE TEXTO del trío de
   acento, no `.ds-tone--accent-soft`, que carece de forma `:hover` y en reposo
   perdería contra `.wiz-exit[data-v-…]`. Con (0,3,0) gana a ese (0,2,0), y su
   `border-color: amatista-300` es inerte porque el botón declara `border:
   none`. */

.wiz-title {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--warm-900);
}

.wstep {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  color: var(--warm-500);
}

.wstep-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 600;
}

.wstep.cur .wstep-dot {
  background: var(--amatista-600);
  color: var(--warm-50);
}

.wstep.done .wstep-dot {
  background: var(--success-dot);
  color: var(--warm-50);
}

.wstep-lbl {
  font-size: 12.5px;
  font-weight: 500;
}

.wstep.cur .wstep-lbl {
  color: var(--warm-900);
}

.wstep-bar {
  flex: 1;
  height: 2px;
  background: var(--warm-200);
  border-radius: 2px;
  min-width: 14px;
}

.wstep-bar.done {
  background: var(--success-border);
}
</style>
