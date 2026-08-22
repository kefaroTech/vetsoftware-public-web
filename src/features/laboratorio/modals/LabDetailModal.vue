<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Beaker, Download, FileText } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import DetailField from '@/features/historia-clinica/components/DetailField.vue'
import LabStatusPill from '@/features/acciones/components/LabStatusPill.vue'
import LabPriorityPill from '../components/LabPriorityPill.vue'
import type { LabActionKind } from '../components/LabSampleCard.vue'
import { laboratoryTestFileApi } from '../api/laboratoryTestFile.api'
import type { LaboratoryTestFileResponse } from '../types/laboratoryTestFile.types'
import { labCode } from '../types/lab'
import { formatDateShort } from '@/composables/format'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  test: LaboratoryTestResponse | null
  /**
   * FORM-10 — transición en vuelo, controlada por la vista. Aquí `saving` no
   * basta: las cinco acciones son transiciones de estado EXCLUYENTES, así que
   * hay que saber CUÁL está en curso para cambiar solo el texto de su botón.
   * Poner los cinco en «Guardando…» sería mentira. Opcional: sin pasarlo el
   * modal se protege igual con su propia bandera (`emitted`).
   */
  pendingAction?: LabActionKind | null
}>()
const emit = defineEmits<{ close: []; action: [kind: LabActionKind] }>()

/**
 * FORM-10 — guarda de reenvío. Los cinco botones emitían `action` directamente
 * desde el marcado y seguían activos hasta que la vista cerrara el modal: dos
 * pulsaciones son dos transiciones sobre la misma muestra. Deshabilitar los
 * cinco mientras hay una en curso es correcto —son excluyentes—, pero solo el
 * de la acción en curso cambia de texto.
 */
const emitted = ref<LabActionKind | null>(null)
const pending = computed<LabActionKind | null>(() => props.pendingAction ?? emitted.value)

function act(kind: LabActionKind) {
  if (pending.value !== null) return
  emitted.value = kind
  emit('action', kind)
}

const attachments = ref<LaboratoryTestFileResponse[]>([])
const loadingFiles = ref(false)
const filesError = ref<string | null>(null)

watch(
  () => [props.open, props.test?.id],
  () => {
    emitted.value = null
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
    filesError.value = getProblemDetailMessage(e, 'No se pudieron cargar los adjuntos')
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
  () => props.test?.status === 'PENDING_VALIDATION' || props.test?.status === 'COMPLETED',
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
    <template v-if="test" #body>
      <div class="detail-grid ds-detail-grid">
        <DetailField label="Paciente" :value="`${test.animal.name} · ${test.animal.code}`" />
        <DetailField label="Fecha" :value="formatDateShort(test.date)" />
        <DetailField label="Cantidad" :value="test.quantity" />
        <DetailField label="Diagnóstico / motivo" :value="test.diagnosis" span="full" />
      </div>

      <div class="pills">
        <div class="pill-group ds-stack">
          <span class="pill-label">Estado</span>
          <LabStatusPill :status="test.status" />
        </div>
        <div class="pill-group ds-stack">
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
        <ul v-else class="att-list ds-list-reset ds-stack">
          <li v-for="att in attachments" :key="att.id" class="att ds-flex-row">
            <FileText :size="15" :stroke-width="1.7" />
            <span class="ds-flex-fill ds-truncate">{{ att.originalFileName }}</span>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--accent"
              title="Descargar"
              @click="downloadFile(att)"
            >
              <Download :size="15" :stroke-width="1.7" />
            </button>
          </li>
        </ul>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="emit('close')">
        Cerrar
      </button>
      <template v-if="test">
        <button
          v-if="test.status === 'PENDING_COLLECTION'"
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="pending !== null"
          @click="act('collect')"
        >
          {{ pending === 'collect' ? 'Guardando…' : 'Tomar muestra' }}
        </button>
        <button
          v-else-if="test.status === 'PENDING_PROCESSING'"
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="pending !== null"
          @click="act('take')"
        >
          {{ pending === 'take' ? 'Guardando…' : 'Procesar muestra' }}
        </button>
        <button
          v-else-if="test.status === 'IN_PROGRESS'"
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="pending !== null"
          @click="act('load')"
        >
          {{ pending === 'load' ? 'Guardando…' : 'Cargar resultados' }}
        </button>
        <template v-else-if="test.status === 'PENDING_VALIDATION'">
          <button
            type="button"
            class="ds-btn ds-btn--ghost ds-btn--snug"
            :disabled="pending !== null"
            @click="act('return')"
          >
            {{ pending === 'return' ? 'Devolviendo…' : 'Devolver' }}
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--solid ds-btn--snug"
            :disabled="pending !== null"
            @click="act('validate')"
          >
            {{ pending === 'validate' ? 'Validando…' : 'Validar y firmar' }}
          </button>
        </template>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Resto sobre `.ds-detail-grid`: gap de fila propio (la primitiva usa 10/24).
   Mismas 2 columnas y mismo colapso a 1 en 560px que antes. */
.detail-grid {
  gap: var(--space-18) var(--space-24);
}

.pills {
  display: flex;
  gap: 28px;
  margin-top: 18px;
}

.pill-group {
  gap: var(--space-6);
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
  color: oklch(40% 0.13 150deg);
  background: oklch(95% 0.05 150deg);
  border: 1px solid oklch(85% 0.08 150deg);
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
  color: oklch(45% 0.18 25deg);
}

.att-list {
  gap: var(--space-6);
}

.att {
  padding: var(--space-8) var(--space-12);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  font-size: 12.5px;
  color: var(--warm-800);
}
</style>
