<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { PawPrint, Sparkles, ArrowRight } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  ownerName?: string
  petName?: string
  step?: number
}>()

const emit = defineEmits<{ continue: []; createNew: []; cancel: [] }>()

const continueBtn = ref<HTMLButtonElement | null>(null)

const stepLabel = computed(() => {
  switch (props.step) {
    case 2:
      return 'paso 2 de 4 · Mascota'
    case 3:
      return 'paso 3 de 4 · Consulta'
    case 4:
      return 'paso 4 de 4 · Resumen'
    default:
      return 'paso 1 de 4 · Propietario'
  }
})

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
    if (open) requestAnimationFrame(() => continueBtn.value?.focus())
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="resume-fade">
      <div
        v-if="open"
        class="overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resume-title"
      >
        <div class="card">
          <div class="icon">
            <PawPrint :size="22" :stroke-width="1.8" />
          </div>
          <h2 id="resume-title" class="title">Tienes una consulta en marcha</h2>
          <p class="desc">
            Estás registrando una consulta
            <template v-if="ownerName">
              para <strong>{{ ownerName }}</strong>
            </template>
            <template v-if="petName">
              y su mascota <strong>{{ petName }}</strong>
            </template>.
            ¿Quieres retomarla donde la dejaste o empezar una nueva desde cero?
          </p>
          <div class="step-chip">{{ stepLabel }}</div>

          <div class="actions">
            <button
              type="button"
              class="btn ghost"
              @click="emit('createNew')"
            >
              <Sparkles :size="14" :stroke-width="1.8" />
              <span>Crear una nueva</span>
            </button>
            <button
              ref="continueBtn"
              type="button"
              class="btn primary"
              @click="emit('continue')"
            >
              <span>Continuar consulta</span>
              <ArrowRight :size="14" :stroke-width="1.8" />
            </button>
          </div>
          <p class="hint">
            Si creas una nueva se borrarán los datos del propietario, mascota y consulta actuales.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(30, 20, 50, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  z-index: 1500;
}
.resume-fade-enter-active,
.resume-fade-leave-active {
  transition: opacity 0.18s ease;
}
.resume-fade-enter-from,
.resume-fade-leave-to {
  opacity: 0;
}
.card {
  width: 480px;
  max-width: calc(100vw - 32px);
  background: var(--warm-50);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(40, 20, 80, 0.3);
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
  margin: 0 0 8px;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
}
.desc {
  margin: 0 0 14px;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.55;
}
.desc strong {
  color: var(--warm-900);
  font-weight: 500;
}
.step-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  margin-bottom: 22px;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn.ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn.ghost:hover {
  background: var(--warm-100);
}
.btn.primary {
  background: var(--amatista-700);
  color: white;
}
.btn.primary:hover {
  filter: brightness(1.05);
}
.btn:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: 2px;
}
.hint {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--warm-500);
  line-height: 1.5;
  text-align: right;
}
</style>
