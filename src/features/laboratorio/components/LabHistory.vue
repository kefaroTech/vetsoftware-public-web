<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Filter, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import PatientCascadePicker from '@/features/acciones/components/PatientCascadePicker.vue'
import Pagination from '@/features/acciones/components/Pagination.vue'
import LabPriorityPill from './LabPriorityPill.vue'
import { useLabHistory } from '../composables/useLabHistory'
import { labCode } from '../types/lab'
import { useTestTypes } from '@/features/dashboard/views/consulta/nueva/composables/useTestTypes'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { Owner } from '@/types/domain'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { LaboratoryTestPriority } from '@/types/domain'

const emit = defineEmits<{ open: [item: LaboratoryTestResponse] }>()

const history = useLabHistory()
const { options: testOptions, loading: loadingTypes } = useTestTypes()

const local = reactive({
  testTypeId: '' as string,
  prioridad: '' as '' | LaboratoryTestPriority,
  dateFrom: '' as string,
  dateTo: '' as string,
})
const patientLabel = ref<string | null>(null)
const patientPickerOpen = ref(false)
const pickerId = ref<number | null>(null)

function apply() {
  history.applyFilters({
    animalId: history.filters.value.animalId,
    testTypeId: local.testTypeId ? Number(local.testTypeId) : null,
    prioridad: local.prioridad || null,
    dateFrom: local.dateFrom || null,
    dateTo: local.dateTo || null,
  })
}

function onPatientSelect(info: { owner: Owner; animal: AnimalResponse } | null) {
  if (!info) return
  history.filters.value.animalId = info.animal.id
  patientLabel.value = `${info.animal.name} · ${info.owner.name}`
  patientPickerOpen.value = false
  pickerId.value = null
  apply()
}
function clearPatient() {
  history.filters.value.animalId = null
  patientLabel.value = null
  apply()
}

function clearAll() {
  local.testTypeId = ''
  local.prioridad = ''
  local.dateFrom = ''
  local.dateTo = ''
  patientLabel.value = null
  history.clearFilters()
}

onMounted(() => history.fetch())
</script>

<template>
  <div class="history">
    <div class="filters">
      <div v-if="patientLabel" class="chip">
        {{ patientLabel }}
        <button type="button" aria-label="Quitar paciente" @click="clearPatient">
          <X :size="12" :stroke-width="2" />
        </button>
      </div>
      <button v-else type="button" class="filter-btn" @click="patientPickerOpen = true">
        <Filter :size="14" :stroke-width="1.8" /> Filtrar por paciente
      </button>

      <div class="field">
        <SearchableSelect
          v-model="local.testTypeId"
          :options="testOptions"
          :loading="loadingTypes"
          placeholder="Tipo de examen"
          @update:model-value="apply"
        />
      </div>

      <select v-model="local.prioridad" class="select" @change="apply">
        <option value="">Toda prioridad</option>
        <option value="NORMAL">Rutina</option>
        <option value="URGENTE">Urgente</option>
      </select>

      <div class="field date">
        <DateInput v-model="local.dateFrom" placeholder="Desde" @update:model-value="apply" />
      </div>
      <div class="field date">
        <DateInput v-model="local.dateTo" placeholder="Hasta" @update:model-value="apply" />
      </div>

      <button type="button" class="clear" @click="clearAll">Limpiar</button>
    </div>

    <div v-if="history.error.value" class="banner error">{{ history.error.value }}</div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Examen</th>
            <th>Paciente</th>
            <th>Prioridad</th>
            <th>Validado</th>
            <th>Por</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="history.loading.value">
            <td colspan="6" class="state">Cargando…</td>
          </tr>
          <tr v-else-if="history.items.value.length === 0">
            <td colspan="6" class="state">No hay exámenes validados con esos filtros.</td>
          </tr>
          <tr
            v-for="item in history.items.value"
            v-else
            :key="item.id"
            class="clickable-row"
            @click="emit('open', item)"
          >
            <td class="mono">{{ labCode(item.id, item.date) }}</td>
            <td>{{ item.testType.name }}</td>
            <td>{{ item.animal.name }}</td>
            <td><LabPriorityPill :prioridad="item.prioridad" /></td>
            <td>{{ item.processedDate ? formatDateShort(item.processedDate) : '—' }}</td>
            <td>{{ item.processedBy?.name ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      :page="history.page.value"
      :page-count="history.totalPages.value"
      :total="history.totalElements.value"
      :page-size="history.pageSize.value"
      @update:page="history.setPage"
    />

    <ModalShell
      :open="patientPickerOpen"
      :icon="Filter"
      title="Filtrar por paciente"
      :width="560"
      @close="patientPickerOpen = false"
    >
      <template #body>
        <PatientCascadePicker v-model="pickerId" @update:selection="onPatientSelect" />
      </template>
    </ModalShell>
  </div>
</template>

<style scoped>
.history { font-family: var(--font-sans); }
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.field { min-width: 180px; }
.field.date { min-width: 150px; }
.filter-btn,
.clear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid var(--warm-200);
  background: transparent;
  color: var(--warm-700);
  cursor: pointer;
}
.filter-btn:hover,
.clear:hover {
  background: var(--warm-100);
  border-color: var(--warm-300);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 999px;
  padding: 6px 8px 6px 12px;
}
.chip button {
  background: transparent;
  border: none;
  color: var(--amatista-700);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 2px;
  border-radius: 50%;
}
.chip button:hover { background: var(--amatista-100); }
.select {
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 9px 12px;
  cursor: pointer;
}
.select:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.banner.error {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
.table-wrap {
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--warm-500);
  padding: 12px 16px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--warm-150, var(--warm-100));
  color: var(--warm-800);
}
.table tbody tr:last-child td { border-bottom: none; }
.mono { font-family: var(--font-mono); font-size: 12px; color: var(--warm-600); }
.state { text-align: center; color: var(--warm-500); padding: 24px 16px; }
.clickable-row { cursor: pointer; transition: background 0.12s ease; }
.clickable-row:hover td { background: var(--amatista-50); }
</style>
