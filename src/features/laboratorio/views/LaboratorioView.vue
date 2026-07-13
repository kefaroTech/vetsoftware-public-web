<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useBranches } from '@/features/branches/composables/useBranches'
import LabBoard from '../components/LabBoard.vue'
import LabHistory from '../components/LabHistory.vue'
import LabDetailModal from '../modals/LabDetailModal.vue'
import LabResultsModal from '../modals/LabResultsModal.vue'
import LabCollectConfirmDialog from '../modals/LabCollectConfirmDialog.vue'
import { useLabQueue } from '../composables/useLabQueue'
import { useToast } from '@/composables/useToast'
import type { LabActionKind } from '../components/LabSampleCard.vue'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

const toast = useToast()
const queue = useLabQueue()
const { selectedBranchId } = useBranches()

const tab = ref<'board' | 'history'>('board')
const viewing = ref<LaboratoryTestResponse | null>(null)
const resultsFor = ref<LaboratoryTestResponse | null>(null)
const collectFor = ref<LaboratoryTestResponse | null>(null)
const collecting = ref(false)

onMounted(() => queue.load())
// La bandeja es por sede: al cambiar la sede del menú principal, se recarga con las muestras de esa sede.
watch(selectedBranchId, () => queue.load())

async function handleAction(item: LaboratoryTestResponse, kind: LabActionKind) {
  if (kind === 'load') {
    resultsFor.value = item
    if (viewing.value?.id === item.id) viewing.value = null
    return
  }
  if (kind === 'collect') {
    // Tomar muestra requiere confirmación previa.
    collectFor.value = item
    if (viewing.value?.id === item.id) viewing.value = null
    return
  }
  try {
    if (kind === 'take') {
      await queue.transition(item, 'IN_PROGRESS')
      toast.success('Muestra tomada', 'La muestra pasó a En proceso.')
    } else if (kind === 'return') {
      await queue.transition(item, 'IN_PROGRESS')
      toast.info('Muestra devuelta', 'Volvió a En proceso para revisión.')
    } else if (kind === 'validate') {
      await queue.transition(item, 'COMPLETED')
      toast.success('Examen validado', 'Se archivó en el histórico.')
    }
    if (viewing.value?.id === item.id) viewing.value = null
  } catch (e) {
    toast.error('Ocurrió un error', e instanceof Error ? e.message : 'No se pudo actualizar la muestra.')
  }
}

async function confirmCollect() {
  const item = collectFor.value
  if (!item || collecting.value) return
  collecting.value = true
  try {
    await queue.transition(item, 'PENDING_PROCESSING')
    toast.success('Muestra recolectada', 'La muestra pasó a En cola.')
    collectFor.value = null
  } catch (e) {
    toast.error('Ocurrió un error', e instanceof Error ? e.message : 'No se pudo tomar la muestra.')
  } finally {
    collecting.value = false
  }
}

async function onResultsUploaded() {
  const item = resultsFor.value
  if (!item) return
  try {
    await queue.transition(item, 'PENDING_VALIDATION')
    toast.success('Resultados cargados', 'La muestra pasó a Por validar.')
  } catch (e) {
    toast.error('Ocurrió un error', e instanceof Error ? e.message : 'No se pudo enviar a validación.')
  } finally {
    resultsFor.value = null
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Laboratorio"
      title="Bandeja de muestras"
      lead="Procesa las muestras solicitadas: toma, carga de resultados y validación firmada."
    />

    <div class="tabs">
      <button type="button" :class="{ active: tab === 'board' }" @click="tab = 'board'">
        Bandeja activa
      </button>
      <button type="button" :class="{ active: tab === 'history' }" @click="tab = 'history'">
        Histórico
      </button>
    </div>

    <div v-if="queue.error.value" class="banner error">{{ queue.error.value }}</div>

    <LabBoard
      v-if="tab === 'board'"
      :items="queue.items.value"
      :loading="queue.loading.value"
      @open="viewing = $event"
      @action="handleAction"
    />
    <LabHistory v-else @open="viewing = $event" />

    <LabDetailModal
      :open="viewing !== null"
      :test="viewing"
      @close="viewing = null"
      @action="(kind) => viewing && handleAction(viewing, kind)"
    />

    <LabResultsModal
      :open="resultsFor !== null"
      :test="resultsFor"
      @close="resultsFor = null"
      @uploaded="onResultsUploaded"
    />

    <LabCollectConfirmDialog
      :open="collectFor !== null"
      :test="collectFor"
      :busy="collecting"
      @confirm="confirmCollect"
      @close="collectFor = null"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 20px;
}
.tabs button {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-600);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 14px;
  margin-bottom: -1px;
  cursor: pointer;
}
.tabs button:hover { color: var(--warm-800); }
.tabs button.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-700);
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
</style>
