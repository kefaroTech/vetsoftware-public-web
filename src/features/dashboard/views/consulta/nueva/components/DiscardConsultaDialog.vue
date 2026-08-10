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
    <div v-if="open" class="overlay" role="alertdialog" aria-modal="true">
      <div class="card">
        <div class="icon">
          <TriangleAlert :size="22" :stroke-width="1.8" />
        </div>
        <h2 class="ds-title">¿Descartar esta consulta?</h2>
        <p class="desc">
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
  background: var(--danger-150);
  color: var(--danger-600);
  display: grid;
  place-items: center;
  margin-bottom: 14px;
}

.desc {
  margin: 0 0 22px;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.55;
}

.danger {
  background: var(--danger-600);
  color: white;
}

.danger:hover {
  filter: brightness(1.05);
}
</style>
