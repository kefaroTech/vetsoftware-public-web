<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, ArrowRight, Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { formatDateLong } from '../composables/format'

const router = useRouter()

interface SuccessState {
  ownerName?: string
  petName?: string
  consultationType?: string
  date?: string
}

const state = ref<SuccessState>({})

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
      <div class="actions">
        <button type="button" class="btn primary" @click="goDetail">
          <span>Ver detalle</span>
          <ArrowRight :size="13" :stroke-width="1.8" />
        </button>
        <button type="button" class="btn ghost" @click="createAnother">
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
  background: linear-gradient(135deg, oklch(58% 0.16 145), oklch(48% 0.18 150));
  color: white;
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
  box-shadow: 0 12px 32px -8px oklch(50% 0.18 145 / 0.45);
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
.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn.primary {
  background: var(--amatista-700);
  color: white;
}
.btn.primary:hover {
  filter: brightness(1.05);
}
.btn.ghost {
  background: var(--warm-50);
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn.ghost:hover {
  background: var(--warm-100);
}
</style>
