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
        class="ds-dialog-overlay overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resume-title"
      >
        <div class="ds-dialog-card ds-dialog-card--wide">
          <div class="ds-dialog-icon ds-tone--accent">
            <PawPrint :size="22" :stroke-width="1.8" />
          </div>
          <h2 id="resume-title" class="title">Tienes una consulta en marcha</h2>
          <p class="ds-dialog-body desc">
            Estás registrando una consulta
            <template v-if="ownerName">
              para <strong class="ds-text-strong">{{ ownerName }}</strong>
            </template>
            <template v-if="petName">
              y su mascota <strong class="ds-text-strong">{{ petName }}</strong> </template
            >. ¿Quieres retomarla donde la dejaste o empezar una nueva desde cero?
          </p>
          <div class="step-chip ds-tone--accent">{{ stepLabel }}</div>

          <div class="actions ds-actions">
            <button type="button" class="ds-btn ds-btn--ghost" @click="emit('createNew')">
              <Sparkles :size="14" :stroke-width="1.8" />
              <span>Crear una nueva</span>
            </button>
            <button
              ref="continueBtn"
              type="button"
              class="ds-btn ds-btn--solid"
              @click="emit('continue')"
            >
              <span>Continuar consulta</span>
              <ArrowRight :size="14" :stroke-width="1.8" />
            </button>
          </div>
          <p class="hint ds-meta">
            Si creas una nueva se borrarán los datos del propietario, mascota y consulta actuales.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Residuo sobre `.ds-dialog-overlay`: este diálogo necesita ganarle a otros
   modales, por eso su z-index es 1500 y no el 100 de los otros tres. */
.overlay {
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

.title {
  margin: 0 0 8px;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
}

/* Residuo sobre `.ds-dialog-body`: éste usa 14px de margen, los otros tres 22. */
.desc {
  margin: 0 0 14px;
}

/* No es `.ds-pill`: su padding es 3/9 y añade `gap`/`white-space`. Sólo el par
   de color sube, vía `.ds-tone--accent`. */
.step-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  margin-bottom: 22px;
}

/* Añadidos sobre `.ds-actions`: más aire entre botones y salto de línea. */
.actions {
  gap: 10px;
  flex-wrap: wrap;
}

/* Residuo sobre `.ds-meta` (warm-500 / 12px). */
.hint {
  margin: 14px 0 0;
  line-height: 1.5;
  text-align: right;
}
</style>
