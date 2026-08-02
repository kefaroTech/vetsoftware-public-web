<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Download, Eye, FileText } from 'lucide-vue-next'
import {
  laboratoryTestFileApi,
  type LaboratoryTestFileResponse,
} from '@/features/laboratorio/api/laboratoryTestFile.api'

/**
 * Adjuntos de resultado de una solicitud de laboratorio. Se usa dentro del
 * detalle de `acciones/laboratorio` para poder VER (abrir en pestaña) o
 * descargar el documento de resultado ya cargado. Solo se renderiza cuando hay
 * archivos (o mientras carga / si hay error).
 */
const props = defineProps<{ testId: number }>()

const attachments = ref<LaboratoryTestFileResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(load)

async function load() {
  loading.value = true
  error.value = null
  try {
    attachments.value = await laboratoryTestFileApi.listByTest(props.testId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar los adjuntos'
  } finally {
    loading.value = false
  }
}

async function blobUrl(att: LaboratoryTestFileResponse): Promise<string> {
  const blob = await laboratoryTestFileApi.download(att.id)
  return URL.createObjectURL(blob)
}

async function viewFile(att: LaboratoryTestFileResponse) {
  const url = await blobUrl(att)
  // Nueva pestaña con el blob → PDF/imagen se previsualizan inline en el navegador.
  window.open(url, '_blank', 'noopener')
  // Se revoca tarde para no romper la pestaña recién abierta.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function downloadFile(att: LaboratoryTestFileResponse) {
  const url = await blobUrl(att)
  const a = document.createElement('a')
  a.href = url
  a.download = att.originalFileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div v-if="loading || error || attachments.length" class="attachments">
    <div class="att-label">Resultados adjuntos</div>
    <p v-if="loading" class="att-state">Cargando adjuntos…</p>
    <p v-else-if="error" class="att-state error">{{ error }}</p>
    <ul v-else class="att-list">
      <li v-for="att in attachments" :key="att.id" class="att">
        <FileText :size="15" :stroke-width="1.7" class="att-icon" />
        <button type="button" class="att-name" title="Ver archivo" @click="viewFile(att)">
          {{ att.originalFileName }}
        </button>
        <button type="button" class="icon" title="Ver" @click="viewFile(att)">
          <Eye :size="15" :stroke-width="1.7" />
        </button>
        <button type="button" class="icon" title="Descargar" @click="downloadFile(att)">
          <Download :size="15" :stroke-width="1.7" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
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

.att-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}

.att-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--amatista-700);
  cursor: pointer;
}

.att-name:hover {
  text-decoration: underline;
}

.icon {
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
  border-radius: 7px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.icon:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
</style>
