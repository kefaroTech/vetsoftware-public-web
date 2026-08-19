<script setup lang="ts">
import { ref, watch } from 'vue'
import { UploadCloud, FileText, X } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import { laboratoryTestFileApi } from '../api/laboratoryTestFile.api'
import { labCode } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{ open: boolean; test: LaboratoryTestResponse | null }>()
const emit = defineEmits<{ close: []; uploaded: [] }>()

const files = ref<File[]>([])
const busy = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) {
      files.value = []
      error.value = null
      busy.value = false
    }
  },
)

function pick() {
  fileInput.value?.click()
}
function onFiles(e: Event) {
  const list = (e.target as HTMLInputElement).files
  if (list) files.value.push(...Array.from(list))
  ;(e.target as HTMLInputElement).value = ''
}
function onDrop(e: DragEvent) {
  if (e.dataTransfer?.files) files.value.push(...Array.from(e.dataTransfer.files))
}
function removeAt(i: number) {
  files.value.splice(i, 1)
}
function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function submit() {
  if (!props.test || files.value.length === 0 || busy.value) return
  busy.value = true
  error.value = null
  try {
    for (const f of files.value) {
      await laboratoryTestFileApi.upload(props.test.id, f)
    }
    emit('uploaded')
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudieron subir los archivos')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="UploadCloud"
    title="Cargar resultados"
    :subtitle="test ? `${labCode(test.id, test.date)} · ${test.testType.name}` : ''"
    :width="620"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="error" class="ds-banner ds-banner--sm ds-banner--error">{{ error }}</div>

      <label class="label ds-label">Archivos de resultado</label>
      <div class="dropzone ds-stack" @click="pick" @dragover.prevent @drop.prevent="onDrop">
        <UploadCloud :size="22" :stroke-width="1.6" />
        <span>Haz clic para adjuntar o arrastra archivos aquí</span>
        <small>PDF o imágenes</small>
      </div>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="application/pdf,image/*"
        class="ds-sr-only"
        @change="onFiles"
      />

      <ul v-if="files.length" class="files ds-list-reset ds-stack">
        <li v-for="(f, i) in files" :key="i" class="file ds-flex-row">
          <FileText :size="15" :stroke-width="1.7" />
          <span class="ds-flex-fill ds-truncate">{{ f.name }}</span>
          <span class="ds-hint">{{ prettySize(f.size) }}</span>
          <button type="button" class="rm" aria-label="Quitar" @click="removeAt(i)">
            <X :size="13" :stroke-width="1.9" />
          </button>
        </li>
      </ul>
    </template>

    <template #footer-left>
      <span class="ds-meta">{{ files.length }} archivo(s) adjunto(s)</span>
    </template>
    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--snug"
        :disabled="files.length === 0 || busy"
        @click="submit"
      >
        {{ busy ? 'Subiendo…' : 'Enviar a validación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Resto sobre `.ds-label`: rótulo un tono más oscuro. */
.label {
  display: block;
  margin-bottom: var(--space-8);
  color: var(--warm-600);
}

.dropzone {
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-26);
  border: 1.5px dashed var(--warm-300);
  border-radius: 12px;
  color: var(--warm-600);
  cursor: pointer;
  text-align: center;
  font-size: 13px;
  transition:
    border-color 0.15s ease,
    background 0.12s ease;
}

.dropzone:hover {
  border-color: var(--amatista-400);
  background: var(--amatista-50);
}

.dropzone small {
  font-size: 11.5px;
  color: var(--warm-500);
}

.files {
  gap: var(--space-6);
  margin: var(--space-14) 0 0;
}

.file {
  padding: var(--space-8) var(--space-12);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  font-size: 12.5px;
  color: var(--warm-800);
}

.rm {
  background: transparent;
  border: none;
  color: var(--warm-500);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 2px;
  border-radius: 5px;
}

.rm:hover {
  background: var(--danger-100);
  color: oklch(45% 0.18 25deg);
}

/* El estado deshabilitado lo cubre `.ds-btn:disabled` (primitives.css), y el
   clip de accesibilidad del input nativo, `.ds-sr-only`. */
</style>
