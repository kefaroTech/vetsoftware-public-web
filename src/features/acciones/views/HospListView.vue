<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import StatusPill from '../components/StatusPill.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import HospCreateModal from '../modals/HospCreateModal.vue'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  hospitalizationApi,
  type HospitalizationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'

const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.HOSPITALIZATION_CREATE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const items = ref<HospitalizationResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const modalOpen = ref(false)

async function onSelect(info: { owner: Owner; animal: AnimalResponse } | null) {
  if (!info) return
  selection.value = info
  loading.value = true
  error.value = null
  items.value = []
  try {
    items.value = await hospitalizationApi.listByAnimal(info.animal.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las hospitalizaciones'
  } finally {
    loading.value = false
  }
}

function onReset() {
  selection.value = null
  patientId.value = null
  items.value = []
  error.value = null
}

function onCreated(item: HospitalizationResponse) {
  items.value = [item, ...items.value]
}

function searchFn(item: HospitalizationResponse, q: string) {
  return item.reason.toLowerCase().includes(q)
}

function typeLabel(type: HospitalizationResponse['type']): string {
  return type === 'HOSPITALIZATION' ? 'Hospitalización' : 'Ambulatoria'
}

function isActive(item: HospitalizationResponse): boolean {
  return !item.endDate && !item.reasonLeaving
}
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <div class="kicker">Acciones clínicas</div>
        <h1 class="title">Hospitalizaciones</h1>
        <div class="lead">Ingresos hospitalarios y ambulatorios independientes de una consulta.</div>
      </div>
      <button
        v-if="canCreate && selection"
        type="button"
        class="cta"
        @click="modalOpen = true"
      >
        <Plus :size="16" :stroke-width="1.8" /> Nueva hospitalización
      </button>
    </div>

    <div v-if="error" class="banner error">{{ error }}</div>

    <PatientCascadePicker
      v-if="!selection"
      v-model="patientId"
      @update:selection="onSelect"
    />

    <template v-else>
      <OwnerAnimalBreadcrumb
        :owner="selection.owner"
        :animal="selection.animal"
        @reset="onReset"
      />
      <ListBody
        :items="items"
        :loading="loading"
        :search-fn="searchFn"
        placeholder="Buscar razón…"
        empty-text="Este paciente aún no tiene hospitalizaciones registradas."
      >
        <template #header>
          <tr>
            <th>Inicio</th>
            <th>Tipo</th>
            <th>Razón</th>
            <th>Estado</th>
          </tr>
        </template>
        <template #row="{ item }">
          <tr>
            <td>{{ formatDateShort(item.startDate) }}</td>
            <td>{{ typeLabel(item.type) }}</td>
            <td class="ellipsis">{{ item.reason }}</td>
            <td>
              <StatusPill
                v-if="isActive(item)"
                label="Activa"
                tone="warn"
              />
              <StatusPill v-else label="Cerrada" tone="success" />
            </td>
          </tr>
        </template>
      </ListBody>
    </template>

    <HospCreateModal
      :open="modalOpen"
      :pre-selected-animal="selection?.animal ?? null"
      @close="modalOpen = false"
      @created="onCreated"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.kicker { font-size: 12px; color: var(--warm-500); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
.title { margin: 0; font-family: var(--font-serif); font-size: 38px; line-height: 1.05; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); }
.lead { font-size: 14px; color: var(--warm-600); margin-top: 6px; }
.cta {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  font-size: 13.5px; font-weight: 500;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: white; border: none; border-radius: 9px; cursor: pointer; font-family: inherit;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
  white-space: nowrap;
}
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.ellipsis { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
