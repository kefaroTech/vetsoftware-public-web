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
    <div v-if="open" class="ds-dialog-overlay overlay" role="alertdialog" aria-modal="true">
      <div class="ds-dialog-card">
        <div class="ds-dialog-icon ds-tone--accent">
          <Stethoscope :size="22" :stroke-width="1.8" />
        </div>
        <h2 class="ds-title">¿Guardar la consulta?</h2>
        <p class="ds-dialog-body desc">
          Se registrará la consulta<span v-if="petName">
            de <strong>{{ petName }}</strong></span
          >
          y los procedimientos que hayas agregado. A continuación podrás facturarla.
        </p>
        <div class="ds-actions">
          <button
            type="button"
            class="ds-btn ds-btn--ghost"
            :disabled="saving"
            @click="$emit('cancel')"
          >
            Seguir editando
          </button>
          <button
            ref="confirmBtn"
            type="button"
            class="ds-btn ds-btn--solid"
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
/* Residuo sobre `.ds-dialog-overlay`: el z-index y la animación de entrada no
   entran en la primitiva (sólo 2 de los 4 diálogos animan). */
.overlay {
  z-index: 100;
  animation: fade 0.15s ease-out;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

/* Residuo sobre `.ds-dialog-body` (el margen difiere entre los 4 diálogos). */
.desc {
  margin: 0 0 22px;
}
</style>
