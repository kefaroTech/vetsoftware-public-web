<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Stethoscope } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  petName?: string
  saving?: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const confirmBtn = ref<HTMLButtonElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) requestAnimationFrame(() => confirmBtn.value?.focus())
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" role="alertdialog" aria-modal="true">
      <div class="card">
        <div class="icon">
          <Stethoscope :size="22" :stroke-width="1.8" />
        </div>
        <h2 class="title">¿Guardar la consulta?</h2>
        <p class="desc">
          Se registrará la consulta<span v-if="petName">
            de <strong>{{ petName }}</strong></span
          >
          y los procedimientos que hayas agregado. A continuación podrás facturarla.
        </p>
        <div class="actions">
          <button type="button" class="btn ghost" :disabled="saving" @click="$emit('cancel')">
            Seguir editando
          </button>
          <button
            ref="confirmBtn"
            type="button"
            class="btn primary"
            :disabled="saving"
            @click="$emit('confirm')"
          >
            {{ saving ? 'Guardando…' : 'Confirmar y guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(30 20 50 / 45%);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  z-index: 100;
  animation: fade 0.15s ease-out;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

.card {
  width: 440px;
  max-width: calc(100vw - 32px);
  background: var(--warm-50);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 60px rgb(40 20 80 / 30%);
  font-family: var(--font-sans);
}

.icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  margin-bottom: 14px;
}

.title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--warm-900);
}

.desc {
  margin: 0 0 22px;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.55;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}

.btn.ghost:hover:not(:disabled) {
  background: var(--warm-100);
}

.btn.primary {
  background: var(--amatista-700);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: 2px;
}
</style>
