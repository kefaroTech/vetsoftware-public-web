<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Beaker, Download, FileText } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import DetailField from '@/features/historia-clinica/components/DetailField.vue'
import LabStatusPill from '@/features/acciones/components/LabStatusPill.vue'
import LabPriorityPill from '../components/LabPriorityPill.vue'
import type { LabActionKind } from '../components/LabSampleCard.vue'
import {
  laboratoryTestFileApi,
  type LaboratoryTestFileResponse,
} from '../api/laboratoryTestFile.api'
import { labCode } from '../types/lab'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

const props = defineProps<{ open: boolean; test: LaboratoryTestResponse | null }>()
const emit = defineEmits<{ close: []; action: [kind: LabActionKind] }>()

const attachments = ref<LaboratoryTestFileResponse[]>([])
const loadingFiles = ref(false)
const filesError = ref<string | null>(null)

watch(
  () => [props.open, props.test?.id],
  () => {
    if (props.open && props.test) loadFiles(props.test.id)
    else attachments.value = []
  },
)

async function loadFiles(testId: number) {
  loadingFiles.value = true
  filesError.value = null
  attachments.value = []
  try {
    attachments.value = await laboratoryTestFileApi.listByTest(testId)
  } catch (e) {
    filesError.value = e instanceof Error ? e.message : 'No se pudieron cargar los adjuntos'
  } finally {
    loadingFiles.value = false
  }
}

async function downloadFile(att: LaboratoryTestFileResponse) {
  const blob = await laboratoryTestFileApi.download(att.id)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = att.originalFileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const showAttachments = computed(
  () =>
    props.test?.status === 'PENDING_VALIDATION' ||
    props.test?.status === 'COMPLETED',
)
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Beaker"
    :title="test ? labCode(test.id, test.date) : ''"
    :subtitle="test?.testType.name"
    :width="640"
    @close="emit('close')"
  >
    <template #body v-if="test">
      <div class="detail-grid">
        <DetailField label="Paciente" :value="`${test.animal.name} · ${test.animal.code}`" />
        <DetailField label="Fecha" :value="formatDateShort(test.date)" />
        <DetailField label="Cantidad" :value="test.quantity" />
        <DetailField label="Diagnóstico / motivo" :value="test.diagnosis" span="full" />
      </div>

      <div class="pills">
        <div class="pill-group">
          <span class="pill-label">Estado</span>
          <LabStatusPill :status="test.status" />
        </div>
        <div class="pill-group">
          <span class="pill-label">Prioridad</span>
          <LabPriorityPill :prioridad="test.prioridad" />
        </div>
      </div>

      <div v-if="test.status === 'COMPLETED' && test.processedBy" class="validated">
        ✓ Procesado por {{ test.processedBy.name }}
        <span v-if="test.processedDate"> · {{ formatDateShort(test.processedDate) }}</span>
      </div>

      <div v-if="showAttachments" class="attachments">
        <div class="att-label">Resultados adjuntos</div>
        <p v-if="loadingFiles" class="att-state">Cargando adjuntos…</p>
        <p v-else-if="filesError" class="att-state error">{{ filesError }}</p>
        <p v-else-if="attachments.length === 0" class="att-state">Sin archivos adjuntos.</p>
        <ul v-else class="att-list">
          <li v-for="att in attachments" :key="att.id" class="att">
            <FileText :size="15" :stroke-width="1.7" />
            <span class="att-name">{{ att.originalFileName }}</span>
            <button type="button" class="dl" title="Descargar" @click="downloadFile(att)">
              <Download :size="15" :stroke-width="1.7" />
            </button>
          </li>
        </ul>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cerrar</button>
      <template v-if="test">
        <button
          v-if="test.status === 'PENDING_COLLECTION'"
          type="button"
          class="btn-primary"
          @click="emit('action', 'collect')"
        >
          Tomar muestra
        </button>
        <button
          v-else-if="test.status === 'PENDING_PROCESSING'"
          type="button"
          class="btn-primary"
          @click="emit('action', 'take')"
        >
          Procesar muestra
        </button>
        <button
          v-else-if="test.status === 'IN_PROGRESS'"
          type="button"
          class="btn-primary"
          @click="emit('action', 'load')"
        >
          Cargar resultados
        </button>
        <template v-else-if="test.status === 'PENDING_VALIDATION'">
          <button type="button" class="btn-ghost" @click="emit('action', 'return')">
            Devolver
          </button>
          <button type="button" class="btn-primary" @click="emit('action', 'validate')">
            Validar y firmar
          </button>
        </template>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
@media (max-width: 560px) { .detail-grid { grid-template-columns: 1fr; } }
.pills {
  display: flex;
  gap: 28px;
  margin-top: 18px;
}
.pill-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pill-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--warm-500);
}
.validated {
  margin-top: 16px;
  font-size: 12.5px;
  color: oklch(40% 0.13 150);
  background: oklch(95% 0.05 150);
  border: 1px solid oklch(85% 0.08 150);
  border-radius: 8px;
  padding: 8px 12px;
}
.attachments {
  margin-top: 18px;
}
.att-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--warm-500);
  margin-bottom: 8px;
}
.att-state {
  font-size: 12.5px;
  color: var(--warm-500);
}
.att-state.error {
  color: oklch(45% 0.18 25);
}
.att-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.att {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  font-size: 12.5px;
  color: var(--warm-800);
}
.att-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl {
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
  border-radius: 7px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.dl:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-700);
}
.btn-ghost:hover {
  background: var(--warm-100);
}
.btn-primary {
  background: var(--amatista-700);
  color: white;
}
.btn-primary:hover {
  filter: brightness(1.05);
}
</style>
