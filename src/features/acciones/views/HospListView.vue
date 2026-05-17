<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import StatusPill from '../components/StatusPill.vue'
import HospCreateModal from '../modals/HospCreateModal.vue'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  hospitalizationApi,
  type HospitalizationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'

const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.HOSPITALIZATION_CREATE)

const items = ref<HospitalizationResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const modalOpen = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    items.value = await hospitalizationApi.listAll()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las hospitalizaciones'
  } finally {
    loading.value = false
  }
})

function onCreated(item: HospitalizationResponse) {
  items.value = [item, ...items.value]
}

function searchFn(item: HospitalizationResponse, q: string) {
  return (
    item.animal.name.toLowerCase().includes(q) ||
    item.animal.code.toLowerCase().includes(q) ||
    item.reason.toLowerCase().includes(q)
  )
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
      <button v-if="canCreate" type="button" class="cta" @click="modalOpen = true">
        <Plus :size="16" :stroke-width="1.8" /> Nueva hospitalización
      </button>
    </div>

    <div v-if="error" class="banner error">{{ error }}</div>

    <ListBody
      :items="items"
      :loading="loading"
      :search-fn="searchFn"
      placeholder="Buscar paciente o razón…"
      empty-text="Aún no hay hospitalizaciones registradas."
    >
      <template #header>
        <tr>
          <th>Inicio</th>
          <th>Paciente</th>
          <th>Tipo</th>
          <th>Razón</th>
          <th>Estado</th>
        </tr>
      </template>
      <template #row="{ item }">
        <tr>
          <td>{{ formatDateShort(item.startDate) }}</td>
          <td>
            <div class="patient">
              <span class="name">{{ item.animal.name }}</span>
              <span class="code">{{ item.animal.code }}</span>
            </div>
          </td>
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

    <HospCreateModal :open="modalOpen" @close="modalOpen = false" @created="onCreated" />
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
.patient { display: flex; flex-direction: column; }
.patient .name { font-weight: 500; color: var(--warm-900); }
.patient .code { font-size: 11.5px; color: var(--warm-500); font-family: var(--font-mono, monospace); }
.ellipsis { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
