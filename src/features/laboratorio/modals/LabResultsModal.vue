<script setup lang="ts">
import { ref, watch } from 'vue'
import { UploadCloud, FileText, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { laboratoryTestFileApi } from '../api/laboratoryTestFile.api'
import { labCode } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

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
    error.value = e instanceof Error ? e.message : 'No se pudieron subir los archivos'
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
      <div v-if="error" class="banner error">{{ error }}</div>

      <label class="label">Archivos de resultado</label>
      <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="onDrop">
        <UploadCloud :size="22" :stroke-width="1.6" />
        <span>Haz clic para adjuntar o arrastra archivos aquí</span>
        <small>PDF o imágenes</small>
      </div>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="application/pdf,image/*"
        class="sr-only"
        @change="onFiles"
      />

      <ul v-if="files.length" class="files">
        <li v-for="(f, i) in files" :key="i" class="file">
          <FileText :size="15" :stroke-width="1.7" />
          <span class="name">{{ f.name }}</span>
          <span class="size">{{ prettySize(f.size) }}</span>
          <button type="button" class="rm" aria-label="Quitar" @click="removeAt(i)">
            <X :size="13" :stroke-width="1.9" />
          </button>
        </li>
      </ul>
    </template>

    <template #footer-left>
      <span class="count">{{ files.length }} archivo(s) adjunto(s)</span>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" :disabled="busy" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="btn-primary"
        :disabled="files.length === 0 || busy"
        @click="submit"
      >
        {{ busy ? 'Subiendo…' : 'Enviar a validación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner.error {
  background: oklch(95% 0.06 25deg);
  border: 1px solid oklch(85% 0.12 25deg);
  color: oklch(40% 0.18 25deg);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  margin-bottom: 12px;
}

.label {
  display: block;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warm-600);
  margin-bottom: 8px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px;
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
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file {
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

.file .name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file .size {
  font-size: 11.5px;
  color: var(--warm-500);
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
  background: oklch(95% 0.06 25deg);
  color: oklch(45% 0.18 25deg);
}

.count {
  font-size: 12px;
  color: var(--warm-500);
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

.btn-ghost:hover:not(:disabled) {
  background: var(--warm-100);
}

.btn-primary {
  background: var(--amatista-700);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
