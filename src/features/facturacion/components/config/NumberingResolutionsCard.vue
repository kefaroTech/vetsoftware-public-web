<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import { useFacturacionAccess } from '../../composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import { numberingResolutionApi } from '../../api/numberingResolution.api'
import ResolutionFormModal from './ResolutionFormModal.vue'
import { DOC_TYPE_LABEL, type NumberingResolutionResponse } from '../../types/facturacion'

const toast = useToast()
const { can } = useFacturacionAccess()
const canCreate = can(PERMISSIONS.NUMBERING_RESOLUTION_CREATE)
const canUpdate = can(PERMISSIONS.NUMBERING_RESOLUTION_UPDATE)
const canDelete = can(PERMISSIONS.NUMBERING_RESOLUTION_DELETE)

const items = ref<NumberingResolutionResponse[]>([])
const loading = ref(false)
const formOpen = ref(false)
const editing = ref<NumberingResolutionResponse | null>(null)
const deleting = ref<NumberingResolutionResponse | null>(null)

const today = new Date().toISOString().slice(0, 10)

onMounted(load)

async function load() {
  loading.value = true
  try {
    items.value = await numberingResolutionApi.listAll()
  } catch (e) {
    toast.error('No se pudieron cargar las resoluciones', getProblemDetailMessage(e))
  } finally {
    loading.value = false
  }
}

function usagePct(r: NumberingResolutionResponse): number {
  const span = r.rangeTo - r.rangeFrom + 1
  if (span <= 0) return 0
  const used = Math.min(Math.max(r.currentNumber - r.rangeFrom, 0), span)
  return Math.round((used / span) * 100)
}
function lowRange(r: NumberingResolutionResponse): boolean {
  return r.rangeTo - r.currentNumber <= (r.rangeTo - r.rangeFrom + 1) * 0.1
}
function expired(r: NumberingResolutionResponse): boolean {
  return r.validTo < today
}

function openNew() {
  editing.value = null
  formOpen.value = true
}
function openEdit(r: NumberingResolutionResponse) {
  editing.value = r
  formOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  try {
    await numberingResolutionApi.remove(deleting.value.id)
    toast.success('Resolución eliminada', '')
    deleting.value = null
    await load()
  } catch (e) {
    toast.error('No se pudo eliminar', getProblemDetailMessage(e))
  }
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <div>
        <h2>Resoluciones de numeración</h2>
        <p>Rangos de consecutivos autorizados por la DIAN, por tipo de documento.</p>
      </div>
      <button v-if="canCreate" type="button" class="cta" @click="openNew">
        <Plus :size="15" :stroke-width="1.9" /> Nueva
      </button>
    </header>

    <div v-if="loading" class="muted">Cargando…</div>
    <p v-else-if="items.length === 0" class="muted">No hay resoluciones registradas.</p>
    <table v-else class="table">
      <thead>
        <tr><th>Tipo</th><th>Prefijo</th><th>Rango</th><th>Consumo</th><th>Vigencia</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="r in items" :key="r.id">
          <td>{{ DOC_TYPE_LABEL[r.documentType] }}</td>
          <td class="mono">{{ r.prefix || '—' }}</td>
          <td class="mono">{{ r.rangeFrom }}–{{ r.rangeTo }}</td>
          <td>
            <div class="usage">
              <div class="bar"><span :style="{ width: usagePct(r) + '%' }" :class="{ warn: lowRange(r) }" /></div>
              <span class="usage-txt" :class="{ warn: lowRange(r) }">{{ r.currentNumber }} / {{ r.rangeTo }}</span>
            </div>
          </td>
          <td>
            <span :class="{ expired: expired(r) }">{{ r.validFrom }} → {{ r.validTo }}</span>
            <span v-if="expired(r)" class="badge-exp">Vencida</span>
          </td>
          <td class="row-actions">
            <button v-if="canUpdate" type="button" class="ico" title="Editar" @click="openEdit(r)"><Pencil :size="14" /></button>
            <button v-if="canDelete" type="button" class="ico danger" title="Eliminar" @click="deleting = r"><Trash2 :size="14" /></button>
          </td>
        </tr>
      </tbody>
    </table>

    <ResolutionFormModal :open="formOpen" :resolution="editing" @close="formOpen = false" @saved="load" />
    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar resolución"
      message="Esta acción deshabilita la resolución de numeración."
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </section>
</template>

<style scoped>
.card { background: white; border: 1px solid var(--warm-200); border-radius: 14px; padding: 22px 24px; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.card-head h2 { margin: 0; font-family: var(--font-serif); font-size: 20px; color: var(--warm-900); font-weight: 400; }
.card-head p { margin: 4px 0 0; font-size: 12.5px; color: var(--warm-500); }
.cta {
  display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 8px 14px; border-radius: 9px; cursor: pointer; border: 1px solid var(--amatista-200);
  background: var(--amatista-50); color: var(--amatista-700);
}
.muted { font-size: 13px; color: var(--warm-500); }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--warm-100); vertical-align: middle; }
.table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.usage { display: flex; align-items: center; gap: 8px; }
.bar { width: 80px; height: 6px; background: var(--warm-150, var(--warm-200)); border-radius: 999px; overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--amatista-500); }
.bar span.warn { background: oklch(70% 0.15 60); }
.usage-txt { font-family: var(--font-mono); font-size: 11px; color: var(--warm-600); }
.usage-txt.warn { color: oklch(50% 0.15 60); font-weight: 600; }
.expired { color: oklch(50% 0.16 25); }
.badge-exp { margin-left: 6px; font-size: 10px; color: oklch(48% 0.18 25); background: oklch(94% 0.06 25); padding: 1px 6px; border-radius: 999px; }
.row-actions { display: flex; gap: 6px; justify-content: flex-end; }
.ico { background: transparent; border: none; cursor: pointer; color: var(--warm-500); padding: 4px; border-radius: 6px; }
.ico:hover { background: var(--warm-100); color: var(--warm-800); }
.ico.danger:hover { color: oklch(52% 0.18 25); background: oklch(95% 0.05 25); }
</style>
