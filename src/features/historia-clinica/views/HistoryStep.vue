<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, Search, TrendingUp } from 'lucide-vue-next'
import PawLoader from '@/components/feedback/PawLoader.vue'
import MonthTimelineGroup from '../components/MonthTimelineGroup.vue'
import EventDetailModal from '../components/EventDetailModal.vue'
import PatientHeader from '../components/PatientHeader.vue'
import WeightHistoryPanel from '../components/WeightHistoryPanel.vue'
import { useHistoriaSelection } from '../composables/useHistoriaSelection'
import { fetchConsultationChildren, useClinicalHistory } from '../composables/useClinicalHistory'
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
const canEditWeight = can(PERMISSIONS.ANIMAL_CREATE)

// El historial de peso arranca COLAPSADO: se muestra solo si el usuario lo abre
// (el panel se monta on-demand, difiriendo la carga de /weight-records).
const showWeight = ref(false)

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
    // Propietario y mascota son dos lecturas independientes; en un enlace directo
    // o un F5 faltan las dos y en serie se pagaba la suma (#254). Las dos son
    // imprescindibles para pintar la pantalla, así que `all` y no `allSettled`:
    // el `catch` de abajo sigue siendo el mismo camino de error que ya había.
    const [o, a] = await Promise.all([
      !state.owner || state.owner.id !== ownerIdParam.value ? ownerApi.findById(ownerNum) : null,
      !state.pet || state.pet.id !== petIdParam.value ? animalApi.findById(petNum) : null,
    ])
    if (o) setOwner(mapOwnerResponse(o))
    if (a) setPet(mapAnimalResponse(a))
  } catch {
    hydrateError.value = 'No se pudo cargar la mascota.'
  } finally {
    hydrating.value = false
  }
}

onMounted(hydrate)
watch([ownerIdParam, petIdParam], hydrate)

// Tras registrar/eliminar un peso, refresca la mascota para reflejar el peso actual derivado.
async function refreshPet() {
  const petNum = Number(petIdParam.value ?? '')
  if (!Number.isFinite(petNum)) return
  try {
    const a = await animalApi.findById(petNum)
    setPet(mapAnimalResponse(a))
  } catch {
    /* el panel ya muestra su propio error; el header queda con el valor previo */
  }
}

const filter = ref<ClinicalEventType | 'ALL'>('ALL')
const search = ref('')

// BE-06: el chip de tipo, el buscador y la paginación los resuelve el servidor. Filtrar en
// cliente sobre una lista paginada mostraría solo lo ya scrolleado — en una historia clínica,
// esconder eventos sin avisar.
const { events, loading, error, isEmpty, observe, typeCounts, totalEvents } = useClinicalHistory(
  petIdParam,
  { type: filter, search },
)

const sentinel = ref<HTMLElement | null>(null)
watch(sentinel, (el) => observe(el))

// El backend ya devuelve la historia de más reciente a más antigua; aquí solo se agrupa por mes.
const grouped = computed(() => {
  const map = new Map<string, ClinicalEvent[]>()
  for (const ev of events.value) {
    const key = ev.eventDate.slice(0, 7)
    const arr = map.get(key)
    if (arr) arr.push(ev)
    else map.set(key, [ev])
  }
  return Array.from(map.entries())
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
// Evento "padre" (la consulta) cuando se entra a un procedimiento asociado desde
// su detalle: al cerrar el procedimiento se vuelve a la consulta, no se cierra todo.
const parentEvent = ref<ClinicalEvent | null>(null)

// Apertura de nivel superior (desde la timeline): resetea la pila de navegación.
function openEvent(ev: ClinicalEvent) {
  if (!EVENT_TYPE_DETAILABLE.has(ev.eventType)) return
  parentEvent.value = null
  selectedEvent.value = ev
  detailModalOpen.value = true
}

// Apertura de un procedimiento asociado DESDE el detalle de una consulta:
// recuerda la consulta como padre para poder volver al cerrarlo.
function openChildEvent(child: ClinicalEvent) {
  if (!EVENT_TYPE_DETAILABLE.has(child.eventType)) return
  parentEvent.value = selectedEvent.value
  selectedEvent.value = child
}

function closeEventDetail() {
  // Si venimos de una consulta, "cerrar" el procedimiento vuelve a ella.
  if (parentEvent.value) {
    selectedEvent.value = parentEvent.value
    parentEvent.value = null
    return
  }
  detailModalOpen.value = false
}

// Los procedimientos derivados de una consulta se piden al servidor: con la historia paginada
// pueden estar en una página que el usuario no ha scrolleado.
const selectedEventChildren = ref<ClinicalEvent[]>([])
watch(selectedEvent, async (ev) => {
  const animalNum = Number(petIdParam.value ?? '')
  if (!ev || ev.eventType !== 'CONSULTATION' || !Number.isFinite(animalNum)) {
    selectedEventChildren.value = []
    return
  }
  try {
    selectedEventChildren.value = await fetchConsultationChildren(animalNum, ev.sourceId)
  } catch {
    selectedEventChildren.value = []
  }
})

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
  <div class="step ds-stack">
    <PatientHeader
      :pet="state.pet"
      :owner="state.owner"
      :hydrating="hydrating"
      :hydrate-error="hydrateError"
      :exporting="exporting"
      :export-error="exportError"
      :can-create-consultation="canCreateConsultation"
      @back="back"
      @export="onExport"
      @new-consultation="goNuevaConsulta"
    />

    <div v-if="state.pet" class="weight-section">
      <button
        type="button"
        class="weight-toggle ds-btn"
        :class="{ open: showWeight }"
        :aria-expanded="showWeight"
        @click="showWeight = !showWeight"
      >
        <TrendingUp :size="15" :stroke-width="1.8" />
        <span>{{ showWeight ? 'Ocultar historial de peso' : 'Ver historial de peso' }}</span>
        <ChevronDown class="chev" :size="15" :stroke-width="1.8" />
      </button>

      <WeightHistoryPanel
        v-if="showWeight"
        :animal-id="Number(state.pet.id)"
        :default-unit="state.pet.weightType"
        :can-edit="canEditWeight"
        @changed="refreshPet"
      />
    </div>

    <div class="filters">
      <div class="chips">
        <button
          type="button"
          class="chip ds-pill"
          :class="{ active: filter === 'ALL' }"
          @click="filter = 'ALL'"
        >
          Todos · {{ totalEvents }}
        </button>
        <button
          v-for="row in typeCounts"
          :key="row.eventType"
          type="button"
          class="chip ds-pill"
          :class="{ active: filter === row.eventType }"
          :style="
            filter === row.eventType
              ? {
                  background: tokensFor(row.eventType).bg,
                  color: tokensFor(row.eventType).fg,
                  borderColor: tokensFor(row.eventType).dot,
                }
              : {}
          "
          @click="filter = row.eventType"
        >
          <span class="chip-icon">{{ EVENT_TYPES[row.eventType].icon }}</span>
          {{ EVENT_TYPES[row.eventType].label }} · {{ row.count }}
        </button>
      </div>

      <div class="search-box ds-flex-row">
        <Search :size="14" :stroke-width="1.7" class="ds-icon-muted" />
        <input
          v-model="search"
          placeholder="Buscar en eventos…"
          class="search-input ds-flex-fill"
        />
      </div>
    </div>

    <div class="timeline-wrap">
      <div v-if="loading && events.length === 0" class="loading-row">
        <PawLoader :size="42" :glow="false" :speed="900" />
      </div>

      <div v-else-if="error" class="banner error">{{ error }}</div>

      <div v-else-if="isEmpty" class="empty-card ds-empty">
        {{
          totalEvents === 0
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

      <!-- Centinela del scroll infinito: al entrar en viewport pide la página siguiente. -->
      <div v-if="!isEmpty" ref="sentinel" class="sentinel" aria-hidden="true">
        <PawLoader v-if="loading && events.length > 0" :size="28" :glow="false" :speed="900" />
      </div>
    </div>

    <EventDetailModal
      :open="detailModalOpen"
      :event="selectedEvent"
      :children="selectedEventChildren"
      @close="closeEventDetail"
      @select-event="openChildEvent"
    />
  </div>
</template>

<style scoped>
.step {
  flex: 1;
  overflow: auto;
}

/* La cabecera del paciente (incluidos su avatar, píldoras, línea de propietario y
   sus dos acciones) vive en `components/PatientHeader.vue`. */

.weight-section {
  padding: 18px 36px 0;
}

/* Resto sobre `.ds-btn` (base, sin `--ghost`: este control conserva su fondo
   y su propio `:hover`, que sólo tiñe borde y texto).

   El par borde+texto de acento (amatista-300 / amatista-700) es el cuerpo de
   `.ds-tone--accent-border`, pero aquí los dos estados que lo usan son `:hover` y
   `.open` y la primitiva no tiene forma `:hover` — añadírsela toca
   `primitives.css`, que es gemelo TR-02. Se resuelve con el mismo mecanismo que
   ya usa `.ds-btn--solid` (`--ds-btn-solid-bg`): el tono entra por variable, así
   que el par deja de estar copiado como cuerpo de regla. */
.weight-toggle {
  gap: var(--space-8);
  padding: var(--space-9) var(--space-14);
  border-color: var(--wt-border, var(--warm-450));
  border-radius: var(--radius-panel);
  background: var(--warm-50);
  color: var(--wt-fg, var(--warm-700));
}

/* A11Y-09 · los dos estados bajaban del reposo: `--amatista-300` da 1,99:1
   sobre `--warm-50` y 1,87:1 sobre el `--amatista-50` que pinta `.open`, contra
   los 3,54:1 del reposo `--warm-450`. Y el peor era `.open`, que es el estado
   activo: se veía menos que el botón sin abrir. La jerarquía queda
   reposo (3,54:1) < hover (3,69:1) < abierto (4,17:1). */
.weight-toggle:hover {
  --wt-border: var(--amatista-450);
  --wt-fg: var(--amatista-700);
}

.weight-toggle.open {
  --wt-border: var(--amatista-500);
  --wt-fg: var(--amatista-700);

  background: var(--amatista-50);
  margin-bottom: 12px;
}

.weight-toggle .chev {
  transition: transform 0.15s ease;
}

.weight-toggle.open .chev {
  transform: rotate(180deg);
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
  padding: var(--space-5) var(--space-11);
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  color: var(--warm-700);
  font-size: var(--text-xs);
  font-weight: var(--weight-normal);
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

/* A11Y-09: `--amatista-300` daba 1,99:1, por debajo del reposo `--warm-450`
   (3,54:1). `--amatista-450` da 3,69:1. */
.chip:hover {
  border-color: var(--amatista-450);
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
  padding: var(--space-10) var(--space-12);
  margin-bottom: 18px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 10px;
}

.search-input {
  border: none;
  outline: none;
  background: var(--warm-100);
  border-radius: 7px;
  padding: 7px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--warm-900);
}

.timeline-wrap {
  padding: 0 36px 40px;
}

.loading-row {
  display: grid;
  place-items: center;
  padding: 60px 0;
}

/* Centinela del scroll infinito. Con alto propio el observer lo ve antes del borde. */
.sentinel {
  min-height: 40px;
  display: grid;
  place-items: center;
}

.banner.error {
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  border-radius: 10px;
  background: oklch(97% 0.02 25deg);
  color: var(--danger-700);
  border: 1px solid oklch(85% 0.06 25deg);
}

.export-error {
  margin-top: 12px;
  margin-bottom: 0;
}

.empty-card {
  padding: 50px var(--space-20);
  background: var(--warm-50);
  border: 1px dashed var(--warm-200);
  border-radius: 12px;
  font-size: 14px;
}

.hydrating {
  display: grid;
  place-items: center;
  padding: 16px 0;
}
</style>
