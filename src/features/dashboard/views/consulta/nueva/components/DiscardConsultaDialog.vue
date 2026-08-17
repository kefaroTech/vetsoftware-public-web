<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { TriangleAlert, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  petName?: string
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const keepBtn = ref<HTMLButtonElement | null>(null)

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
    if (open) {
      requestAnimationFrame(() => keepBtn.value?.focus())
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ds-dialog-overlay overlay" role="alertdialog" aria-modal="true">
      <div class="ds-dialog-card">
        <div class="ds-dialog-icon icon">
          <TriangleAlert :size="22" :stroke-width="1.8" />
        </div>
        <h2 class="ds-title">¿Descartar esta consulta?</h2>
        <p class="ds-dialog-body desc">
          Perderás todos los datos ingresados<span v-if="petName">
            de <strong>{{ petName }}</strong></span
          >. Esta acción no se puede deshacer.
        </p>
        <div class="ds-actions">
          <button ref="keepBtn" type="button" class="ds-btn ds-btn--ghost" @click="$emit('cancel')">
            Seguir editando
          </button>
          <button type="button" class="ds-btn danger" @click="$emit('confirm')">
            <Trash2 :size="13" :stroke-width="1.8" />
            <span>Descartar</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Residuo sobre `.ds-dialog-overlay`: z-index y animación de entrada. */
.overlay {
  z-index: 100;
  animation: fade 0.15s ease-out;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

/* NO es `.ds-tone--danger` (danger-200 / oklch(50% 0.2 25deg)): este par es
   danger-150 / danger-600, un rojo más claro de fondo y menos saturado de
   texto. Se queda local sobre `.ds-dialog-icon`. */
.icon {
  background: var(--danger-150);
  color: var(--danger-600);
}

/* Residuo sobre `.ds-dialog-body` (el margen difiere entre los 4 diálogos). */
.desc {
  margin: 0 0 22px;
}

.danger {
  background: var(--danger-600);
  color: white;
}

.danger:hover {
  filter: brightness(1.05);
}
</style>
