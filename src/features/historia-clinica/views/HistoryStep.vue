<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, FileDown, Plus, Search } from 'lucide-vue-next'
import PawLoader from '@/components/ui/PawLoader.vue'
import MonthTimelineGroup from '../components/MonthTimelineGroup.vue'
import EventDetailModal from '../components/EventDetailModal.vue'
import { useHistoriaSelection } from '../composables/useHistoriaSelection'
import { useClinicalHistory } from '../composables/useClinicalHistory'
import { useClinicalHistoryExport } from '../composables/useClinicalHistoryExport'
import { EVENT_TYPES, EVENT_TYPE_DETAILABLE, TYPE_COLORS } from '../constants/eventTypes'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { mapOwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.mapper'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { mapAnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import { useNuevaConsultaDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { showResumeOrNewDialog } from '@/composables/useConsultaResumeGuard'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import type { ClinicalEvent, ClinicalEventType } from '../types/historia'

const route = useRoute()
const router = useRouter()
const { state, setOwner, setPet } = useHistoriaSelection()
const draft = useNuevaConsultaDraft()
const { can } = useAuthorization()
const canCreateConsultation = can(PERMISSIONS.CONSULTATION_CREATE)

const ownerIdParam = computed(() => String(route.params.ownerId ?? ''))
const petIdParam = computed(() => {
  const v = route.params.petId
  return v ? String(v) : null
})

const hydrating = ref(false)
const hydrateError = ref<string | null>(null)

async function hydrate() {
  hydrating.value = true
  hydrateError.value = null
  try {
    const ownerNum = Number(ownerIdParam.value)
    const petNum = Number(petIdParam.value ?? '')
    if (!Number.isFinite(ownerNum) || !Number.isFinite(petNum)) {
      hydrateError.value = 'Ruta inválida.'
      return
    }
    if (!state.owner || state.owner.id !== ownerIdParam.value) {
      const o = await ownerApi.findById(ownerNum)
      setOwner(mapOwnerResponse(o))
    }
    if (!state.pet || state.pet.id !== petIdParam.value) {
      const a = await animalApi.findById(petNum)
      setPet(mapAnimalResponse(a))
    }
  } catch {
    hydrateError.value = 'No se pudo cargar la mascota.'
  } finally {
    hydrating.value = false
  }
}

onMounted(hydrate)
watch([ownerIdParam, petIdParam], hydrate)

const { events, loading, error } = useClinicalHistory(petIdParam)

const filter = ref<ClinicalEventType | 'ALL'>('ALL')
const search = ref('')

const eventsSorted = computed(() =>
  [...events.value].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
)

const typeCounts = computed(() => {
  const counts: Partial<Record<ClinicalEventType, number>> = {}
  for (const ev of eventsSorted.value) {
    counts[ev.eventType] = (counts[ev.eventType] ?? 0) + 1
  }
  return Object.entries(counts).map(([type, count]) => ({
    type: type as ClinicalEventType,
    count: count!,
  }))
})

const filtered = computed(() =>
  eventsSorted.value.filter((ev) => {
    if (filter.value !== 'ALL' && ev.eventType !== filter.value) return false
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    return (
      ev.summary.toLowerCase().includes(q) ||
      EVENT_TYPES[ev.eventType].label.toLowerCase().includes(q)
    )
  }),
)

const grouped = computed(() => {
  const map = new Map<string, ClinicalEvent[]>()
  for (const ev of filtered.value) {
    const key = ev.eventDate.slice(0, 7)
    const arr = map.get(key)
    if (arr) arr.push(ev)
    else map.set(key, [ev])
  }
  return Array.from(map.entries())
})

const sexLabel = computed(() => (state.pet?.gender === 'FEMALE' ? 'Hembra' : 'Macho'))
const weightLabel = computed(() => {
  const p = state.pet
  if (!p) return ''
  const unit =
    p.weightType === 'GRAMS' ? 'g' : p.weightType === 'POUNDS' ? 'lb' : 'kg'
  return `${p.weight} ${unit}`
})

function back() {
  router.push({
    name: 'consulta-historial-pet',
    params: { ownerId: ownerIdParam.value },
  })
}

function tokensFor(type: ClinicalEventType) {
  return TYPE_COLORS[EVENT_TYPES[type].color]
}

const detailModalOpen = ref(false)
const selectedEvent = ref<ClinicalEvent | null>(null)

function openEvent(ev: ClinicalEvent) {
  if (!EVENT_TYPE_DETAILABLE.has(ev.eventType)) return
  selectedEvent.value = ev
  detailModalOpen.value = true
}

function closeEventDetail() {
  detailModalOpen.value = false
}

const { exporting, error: exportError, exportPdf } = useClinicalHistoryExport()

async function onExport() {
  if (!state.pet) return
  const animalId = Number(state.pet.id)
  if (!Number.isFinite(animalId)) return
  await exportPdf(animalId, {
    types: filter.value !== 'ALL' ? [filter.value] : undefined,
  })
}

function goNuevaConsulta() {
  if (!canCreateConsultation.value || !state.owner || !state.pet) return
  const ownerSnapshot = state.owner
  const petSnapshot = state.pet
  const launch = () => {
    draft.reset()
    draft.setOwner({ ...ownerSnapshot })
    draft.setPet({ ...petSnapshot })
    router.push({ name: 'consulta-nueva', query: { paso: '3' } })
  }
  if (draft.state.owner) {
    showResumeOrNewDialog({
      ownerName: draft.state.owner.name,
      petName: draft.state.pet?.name,
      step: draft.state.step,
      onContinue: () =>
        router.push({
          name: 'consulta-nueva',
          query: { paso: String(draft.state.step) },
        }),
      onCreateNew: launch,
    })
    return
  }
  launch()
}
</script>

<template>
  <div class="step">
    <header class="patient-head">
      <button type="button" class="back-btn" @click="back">
        <ArrowLeft :size="14" :stroke-width="1.7" />
        Cambiar mascota
      </button>

      <div v-if="hydrating" class="hydrating">
        <PawLoader :size="32" :glow="false" :speed="900" />
      </div>

      <div v-else-if="hydrateError" class="banner error">
        {{ hydrateError }}
      </div>

      <div v-else-if="state.pet" class="patient">
        <div class="avatar">
          {{ state.pet.name.slice(0, 2).toUpperCase() }}
        </div>
        <div class="patient-body">
          <h1 class="patient-name">{{ state.pet.name }}</h1>
          <div class="pills">
            <span class="pill">{{ state.pet.specie.name }}</span>
            <span class="pill">{{ state.pet.breed.name }}</span>
            <span class="pill">{{ sexLabel }}</span>
            <span class="pill">{{ weightLabel }}</span>
            <span v-if="state.pet.color" class="pill">{{ state.pet.color }}</span>
          </div>
          <div v-if="state.owner" class="owner-line">
            Propietario:
            <strong>{{ state.owner.name }}</strong>
            <template v-if="state.owner.phone"> · {{ state.owner.phone }}</template>
          </div>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn-ghost"
            :disabled="exporting || !state.pet"
            @click="onExport"
          >
            <FileDown :size="14" :stroke-width="1.7" />
            {{ exporting ? 'Generando…' : 'Exportar PDF' }}
          </button>
          <button
            v-if="canCreateConsultation"
            type="button"
            class="btn-primary"
            @click="goNuevaConsulta"
          >
            <Plus :size="14" :stroke-width="1.8" />
            Nueva consulta
          </button>
        </div>
      </div>

      <div v-if="exportError" class="banner error export-error">
        {{ exportError }}
      </div>
    </header>

    <div class="filters">
      <div class="chips">
        <button
          type="button"
          class="chip"
          :class="{ active: filter === 'ALL' }"
          @click="filter = 'ALL'"
        >
          Todos · {{ eventsSorted.length }}
        </button>
        <button
          v-for="row in typeCounts"
          :key="row.type"
          type="button"
          class="chip"
          :class="{ active: filter === row.type }"
          :style="
            filter === row.type
              ? {
                  background: tokensFor(row.type).bg,
                  color: tokensFor(row.type).fg,
                  borderColor: tokensFor(row.type).dot,
                }
              : {}
          "
          @click="filter = row.type"
        >
          <span class="chip-icon">{{ EVENT_TYPES[row.type].icon }}</span>
          {{ EVENT_TYPES[row.type].label }} · {{ row.count }}
        </button>
      </div>

      <div class="search-box">
        <Search :size="14" :stroke-width="1.7" class="search-icon" />
        <input
          v-model="search"
          placeholder="Buscar en eventos…"
          class="search-input"
        />
      </div>
    </div>

    <div class="timeline-wrap">
      <div v-if="loading" class="loading-row">
        <PawLoader :size="42" :glow="false" :speed="900" />
      </div>

      <div v-else-if="error" class="banner error">{{ error }}</div>

      <div
        v-else-if="filtered.length === 0"
        class="empty-card"
      >
        {{
          eventsSorted.length === 0
            ? 'Sin historia clínica registrada todavía.'
            : 'Ningún evento coincide con los filtros.'
        }}
      </div>

      <MonthTimelineGroup
        v-for="[key, items] in grouped"
        :key="key"
        :month-key="key"
        :events="items"
        @select="openEvent"
      />
    </div>

    <EventDetailModal
      :open="detailModalOpen"
      :event="selectedEvent"
      @close="closeEventDetail"
    />
  </div>
</template>

<style scoped>
.step {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.patient-head {
  padding: 24px 36px;
  background: linear-gradient(180deg, var(--amatista-50), var(--warm-50));
  border-bottom: 1px solid var(--warm-200);
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--warm-600);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  margin-bottom: 14px;
}
.back-btn:hover {
  color: var(--amatista-700);
}
.patient {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: var(--amatista-200);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 22px;
  flex-shrink: 0;
  font-family: 'Instrument Serif', serif;
}
.patient-body {
  flex: 1;
  min-width: 0;
}
.patient-name {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  margin: 0;
  line-height: 1.1;
}
.pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.pill {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--warm-200);
  color: var(--warm-700);
  font-size: 11.5px;
  font-weight: 500;
}
.owner-line {
  font-size: 13px;
  color: var(--warm-600);
  margin-top: 8px;
}
.owner-line strong {
  color: var(--warm-900);
}
.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  background: var(--amatista-700);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.btn-primary:hover {
  background: var(--amatista-600);
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  background: var(--warm-50);
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filters {
  padding: 18px 36px 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--warm-50);
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.chip:hover {
  border-color: var(--amatista-300);
}
.chip.active {
  background: var(--amatista-700);
  color: white;
  border-color: var(--amatista-700);
  font-weight: 500;
}
.chip-icon {
  font-size: 13px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 18px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.search-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: var(--warm-100);
  border-radius: 7px;
  padding: 7px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--warm-900);
  min-width: 0;
}

.timeline-wrap {
  padding: 0 36px 40px;
}
.loading-row {
  display: grid;
  place-items: center;
  padding: 60px 0;
}
.banner.error {
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  border-radius: 10px;
  background: oklch(97% 0.02 25);
  color: oklch(48% 0.18 25);
  border: 1px solid oklch(85% 0.06 25);
}
.export-error {
  margin-top: 12px;
  margin-bottom: 0;
}
.empty-card {
  padding: 50px 20px;
  text-align: center;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  font-size: 14px;
}
.hydrating {
  display: grid;
  place-items: center;
  padding: 16px 0;
}
</style>
