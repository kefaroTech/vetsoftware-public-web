<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BaseTabPanel from '@/components/ui/BaseTabPanel.vue'
import type { TabItem } from '@/components/ui/tabs'
import { useBranches } from '@/features/branches/composables/useBranches'
import LabBoard from '../components/LabBoard.vue'
import LabHistory from '../components/LabHistory.vue'
import LabDetailModal from '../modals/LabDetailModal.vue'
import LabResultsModal from '../modals/LabResultsModal.vue'
import { Syringe } from 'lucide-vue-next'
import { labCode } from '../types/lab'
import { useLabQueue } from '../composables/useLabQueue'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import type { LabActionKind } from '../components/LabSampleCard.vue'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'

const toast = useToast()
const { confirm } = useConfirmDialog()
const queue = useLabQueue()
const { selectedBranchId } = useBranches()

const tab = ref<'board' | 'history'>('board')
const LAB_TABS: TabItem<'board' | 'history'>[] = [
  { value: 'board', label: 'Bandeja activa' },
  { value: 'history', label: 'Histórico' },
]
const viewing = ref<LaboratoryTestResponse | null>(null)
const resultsFor = ref<LaboratoryTestResponse | null>(null)

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
    void askCollect(item)
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
    toast.errorFrom('Ocurrió un error', e, 'No se pudo actualizar la muestra.')
  }
}

/**
 * Tomar muestra requiere confirmación previa: mueve la muestra de estado y no
 * hay vuelta atrás desde la bandeja.
 *
 * El énfasis del cuerpo va en SEGMENTOS, no en `v-html`: el nombre y el código
 * del paciente son datos escritos por el usuario y la plantilla del diálogo es
 * quien pone el `<strong>`.
 */
async function askCollect(item: LaboratoryTestResponse) {
  try {
    const ok = await confirm({
      title: 'Tomar muestra',
      subtitle: `${labCode(item.id, item.date)} · ${item.testType.name}`,
      icon: Syringe,
      accent: 'amatista',
      message: [
        'Confirma que la muestra de ',
        { strong: `${item.animal.name} · ${item.animal.code}` },
        ' ya fue recolectada. Pasará a ',
        { strong: 'En cola' },
        ' para su procesamiento.',
      ],
      confirmLabel: 'Tomar muestra',
      busyLabel: 'Tomando muestra…',
      action: () => queue.transition(item, 'PENDING_PROCESSING'),
    })
    if (!ok) return
    toast.success('Muestra recolectada', 'La muestra pasó a En cola.')
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo tomar la muestra.')
  }
}

async function onResultsUploaded() {
  const item = resultsFor.value
  if (!item) return
  try {
    await queue.transition(item, 'PENDING_VALIDATION')
    toast.success('Resultados cargados', 'La muestra pasó a Por validar.')
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo enviar a validación.')
  } finally {
    resultsFor.value = null
  }
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Laboratorio"
      title="Bandeja de muestras"
      lead="Procesa las muestras solicitadas: toma, carga de resultados y validación firmada."
    />

    <BaseTabs
      v-model="tab"
      :tabs="LAB_TABS"
      name="laboratorio"
      tablist-label="Vista de la bandeja"
      class="tabs"
    />

    <BaseTabPanel name="laboratorio" :value="tab">
      <template v-if="tab === 'board'">
        <!-- EST-01: la rama de error va ANTES que el tablero. Detrás de él, un 500
             se lee como cuatro columnas «Sin muestras», que es lo contrario. -->
        <div v-if="queue.error.value" class="ds-banner ds-banner--error" role="alert">
          {{ queue.error.value }}
        </div>
        <LabBoard
          v-else
          :items="queue.items.value"
          :loading="queue.loading.value"
          @open="viewing = $event"
          @action="handleAction"
        />
      </template>
      <LabHistory v-else @open="viewing = $event" />
    </BaseTabPanel>

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
  </div>
</template>

<style scoped>
.tabs {
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 20px;
}
</style>
