<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, ArrowRight, Plus, Printer } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { formatDateLong } from '../composables/format'
import { usePrescriptionExport } from '../composables/usePrescriptionExport'

const router = useRouter()

interface SavedPrescription {
  id: number
  label: string
}
interface SuccessState {
  ownerName?: string
  petName?: string
  consultationType?: string
  date?: string
  prescriptions?: SavedPrescription[]
}

const state = ref<SuccessState>({})
const { exporting: printing, exportPdf } = usePrescriptionExport()
const prescriptions = computed<SavedPrescription[]>(() => state.value.prescriptions ?? [])

const code = computed(() => {
  const n = String(Math.floor(Math.random() * 9000) + 1000)
  const y = new Date().getFullYear()
  return `#C-${y}-${n}`
})

onMounted(() => {
  const s = (history.state ?? {}) as SuccessState
  state.value = {
    ownerName: s.ownerName ?? '—',
    petName: s.petName ?? '—',
    consultationType: s.consultationType ?? '',
    date: s.date ?? '',
    prescriptions: Array.isArray(s.prescriptions) ? s.prescriptions : [],
  }
})

function goDetail() {
  router.push({ name: 'consulta-historial' })
}
function createAnother() {
  router.push({ name: 'consulta-nueva' })
}
</script>

<template>
  <div class="success">
    <div class="inner">
      <div class="badge">
        <Check :size="34" :stroke-width="2" />
      </div>
      <h1 class="title">Consulta guardada</h1>
      <p class="who">
        {{ state.petName }}<span v-if="state.ownerName"> · {{ state.ownerName }}</span>
      </p>
      <p class="meta">
        <span v-if="state.date">{{ formatDateLong(state.date) }}</span>
        <span v-if="state.consultationType"> · {{ state.consultationType }}</span>
        <span> · {{ code }}</span>
      </p>
      <div v-if="prescriptions.length" class="rx-block">
        <div class="rx-title">
          {{ prescriptions.length === 1 ? 'Receta de esta consulta' : 'Recetas de esta consulta' }}
        </div>
        <div class="rx-buttons">
          <button
            v-for="rx in prescriptions"
            :key="rx.id"
            type="button"
            class="ds-btn rx"
            :disabled="printing"
            @click="exportPdf(rx.id)"
          >
            <Printer :size="13" :stroke-width="1.8" />
            <span>
              {{ printing ? 'Generando…' : 'Imprimir receta' }}
              <template v-if="prescriptions.length > 1"> · {{ rx.label }}</template>
            </span>
          </button>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="ds-btn ds-btn--solid" @click="goDetail">
          <span>Ver detalle</span>
          <ArrowRight :size="13" :stroke-width="1.8" />
        </button>
        <button type="button" class="ds-btn ds-btn--ghost" @click="createAnother">
          <Plus :size="13" :stroke-width="1.8" />
          <span>Crear otra consulta</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success {
  flex: 1;
  min-height: 0;
  background: var(--warm-100);
  font-family: var(--font-sans);
  display: grid;
  place-items: center;
  overflow: auto;
}

.inner {
  text-align: center;
  max-width: 460px;
  padding: 40px;
}

.badge {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: oklch(92% 0.06 145deg);
  color: oklch(45% 0.15 145deg);
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
  box-shadow: 0 8px 32px -8px oklch(50% 0.15 145deg / 40%);
}

.title {
  margin: 0 0 8px;
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--warm-900);
  letter-spacing: -0.01em;
}

.who {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--warm-600);
}

.meta {
  margin: 0 0 28px;
  font-size: 13px;
  color: var(--warm-500);
}

.rx-block {
  margin: 0 0 20px;
  padding: 14px 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
}

.rx-title {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 10px;
}

.rx-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.rx {
  background: white;
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}

.rx:hover:not(:disabled) {
  background: var(--amatista-50);
}

.rx:disabled {
  opacity: 0.6;
  cursor: default;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
