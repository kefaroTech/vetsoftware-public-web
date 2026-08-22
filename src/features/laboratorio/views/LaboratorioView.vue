<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
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

    <div class="tabs">
      <button type="button" :class="{ active: tab === 'board' }" @click="tab = 'board'">
        Bandeja activa
      </button>
      <button type="button" :class="{ active: tab === 'history' }" @click="tab = 'history'">
        Histórico
      </button>
    </div>

    <div v-if="queue.error.value" class="ds-banner ds-banner--error">{{ queue.error.value }}</div>

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
  </div>
</template>

<style scoped>
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
.tabs button:hover {
  color: var(--warm-800);
}

.tabs button.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-700);
}
</style>
