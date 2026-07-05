<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PauseCircle, Pencil, Plus, RotateCcw } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import TaxFormModal from '../components/TaxFormModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney } from '../composables/pricing'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { TaxResponse } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.TAX_CREATE)
const canUpdate = can(PERMISSIONS.TAX_UPDATE)
const canDelete = can(PERMISSIONS.TAX_DELETE)

/** 'active' = impuestos vivos; 'paused' = impuestos pausados (enabled=false) para reactivar. */
const mode = ref<'active' | 'paused'>('active')

const modalOpen = ref(false)
const editing = ref<TaxResponse | null>(null)
const pausing = ref<TaxResponse | null>(null)
const pausingBusy = ref(false)
const pausedLoading = ref(false)

onMounted(() => store.reload())

/** Nº de productos + servicios que referencian cada impuesto (pre-chequeo cliente de "en uso"). */
const taxUsage = computed<Record<number, number>>(() => {
  const m: Record<number, number> = {}
  for (const p of store.products.value) if (p.tax) m[p.tax.id] = (m[p.tax.id] ?? 0) + 1
  for (const s of store.services.value) if (s.tax) m[s.tax.id] = (m[s.tax.id] ?? 0) + 1
  return m
})
function usageOf(id: number): number {
  return taxUsage.value[id] ?? 0
}

async function switchMode(m: 'active' | 'paused') {
  if (mode.value === m) return
  mode.value = m
  if (m === 'paused') {
    pausedLoading.value = true
    try {
      await store.loadPausedTaxes()
    } catch (e) {
      toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudieron cargar los pausados'))
    } finally {
      pausedLoading.value = false
    }
  }
}

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onRowClick(item: TaxResponse) {
  if (canUpdate.value) editing.value = item
}
function onSaved() {
  const wasEdit = editing.value !== null
  toast.success('Impuesto guardado', wasEdit ? 'Los cambios se guardaron.' : 'Se creó el impuesto.')
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

/** Solo se puede pausar un impuesto que NO esté en uso (el back lo bloquea con 409; aquí lo prevenimos). */
function requestPause(t: TaxResponse) {
  if (usageOf(t.id) > 0) {
    toast.warn('Impuesto en uso', `${t.name} está asignado a ${usageOf(t.id)} ítem(s). Cámbialos de tasa antes de pausarlo.`)
    return
  }
  pausing.value = t
}

/** Pausar = soft-delete (DELETE → enabled=false). Recuperable desde "Pausados". */
async function onConfirmPause() {
  const target = pausing.value
  if (!target) return
  pausingBusy.value = true
  try {
    await store.removeTax(target.id)
    toast.info('Impuesto pausado', `${target.name} dejó de estar disponible.`)
    pausing.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo pausar'))
  } finally {
    pausingBusy.value = false
  }
}

async function onReactivate(t: TaxResponse) {
  try {
    await store.enableTax(t.id)
    toast.success('Impuesto reactivado', `${t.name} volvió a estar disponible.`)
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo reactivar'))
  }
}

function ivaContenido(percentage: number): string {
  return formatMoney(Math.round(100000 - 100000 / (1 + percentage / 100)))
}
</script>

<template>
  <div class="inv">
    <header class="head">
      <div>
        <div class="kicker">Tienda · Impuestos</div>
        <h1 class="title">Administración de impuestos</h1>
      </div>
      <div class="head-actions">
        <div class="seg" role="tablist">
          <button type="button" :class="{ on: mode === 'active' }" @click="switchMode('active')">Activos</button>
          <button type="button" :class="{ on: mode === 'paused' }" @click="switchMode('paused')">Pausados</button>
        </div>
        <button v-if="canCreate && mode === 'active'" type="button" class="cta" @click="openNew">
          <Plus :size="16" :stroke-width="1.8" /> Nuevo impuesto
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <!-- ─────────── Modo ACTIVOS ─────────── -->
    <table v-if="mode === 'active'" class="table">
      <thead>
        <tr>
          <th>Impuesto</th>
          <th>Tributo</th>
          <th>Porcentaje</th>
          <th>IVA contenido en $100.000</th>
          <th>En uso</th>
          <th v-if="canUpdate || canDelete"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="store.loading.value">
          <td colspan="6" class="empty">Cargando…</td>
        </tr>
        <tr v-else-if="store.taxes.value.length === 0">
          <td colspan="6" class="empty">Sin impuestos. Crea el primero.</td>
        </tr>
        <tr v-for="t in store.taxes.value" v-else :key="t.id" class="trow" @click="onRowClick(t)">
          <td class="tname">{{ t.name }}</td>
          <td>{{ t.taxScheme }}</td>
          <td class="tstock">{{ t.percentage }}%</td>
          <td>{{ ivaContenido(t.percentage) }}</td>
          <td class="tuse">{{ usageOf(t.id) }} ítem(s)</td>
          <td v-if="canUpdate || canDelete" @click.stop>
            <div class="actions">
              <button v-if="canUpdate" type="button" class="icon-btn" title="Editar" @click="editing = t">
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                v-if="canDelete"
                type="button"
                class="icon-btn"
                :disabled="usageOf(t.id) > 0"
                :title="usageOf(t.id) > 0 ? 'No se puede pausar: impuesto en uso' : 'Pausar'"
                @click="requestPause(t)"
              >
                <PauseCircle :size="14" :stroke-width="1.7" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ─────────── Modo PAUSADOS ─────────── -->
    <table v-else class="table">
      <thead>
        <tr>
          <th>Impuesto</th>
          <th>Tributo</th>
          <th>Porcentaje</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pausedLoading">
          <td colspan="4" class="empty">Cargando…</td>
        </tr>
        <tr v-else-if="store.pausedTaxes.value.length === 0">
          <td colspan="4" class="empty">No hay impuestos pausados.</td>
        </tr>
        <tr v-for="t in store.pausedTaxes.value" v-else :key="t.id">
          <td class="tname">{{ t.name }}</td>
          <td>{{ t.taxScheme }}</td>
          <td class="tstock">{{ t.percentage }}%</td>
          <td>
            <button v-if="canDelete" type="button" class="reactivate" @click="onReactivate(t)">
              <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="note">
      Cada producto y servicio tiene asignado un impuesto (campo "Impuesto" en su ficha). En el
      punto de venta el impuesto se calcula por línea y se agrupa por tasa en la factura.
    </p>

    <TaxFormModal :open="modalOpen || editing !== null" :initial="editing" @close="onFormClose" @saved="onSaved" />

    <ConfirmDeleteDialog
      :open="pausing !== null"
      title="Pausar impuesto"
      action-label="Pausar"
      :message="pausing ? `${pausing.name} dejará de estar disponible para asignar. Podrás reactivarlo desde la pestaña “Pausados”.` : ''"
      :busy="pausingBusy"
      @cancel="pausing = null"
      @confirm="onConfirmPause"
    />
  </div>
</template>

<style scoped>
.inv { font-family: var(--font-sans); color: var(--warm-900); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; margin-bottom: 6px; }
.title { margin: 0; font-family: var(--font-serif); font-size: 36px; font-weight: 400; letter-spacing: -0.015em; line-height: 1.05; color: var(--warm-900); }
.head-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
.seg { display: inline-flex; background: var(--warm-100); border: 1px solid var(--warm-200); border-radius: 9px; padding: 2px; }
.seg button { border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 500; color: var(--warm-600); padding: 6px 12px; border-radius: 7px; cursor: pointer; }
.seg button.on { background: var(--warm-50); color: var(--amatista-700); box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08); }
.cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff; border: none; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; overflow: hidden; }
.table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; padding: 11px 14px; background: var(--warm-100); border-bottom: 1px solid var(--warm-200); }
.table td { padding: 11px 14px; border-bottom: 1px solid var(--warm-150); color: var(--warm-800); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.trow { cursor: pointer; }
.trow:hover { background: var(--warm-100); }
.empty { text-align: center; padding: 40px; color: var(--warm-500); }
.tname { font-weight: 500; color: var(--warm-900); }
.tstock { font-weight: 600; }
.tuse { color: var(--warm-600); font-size: 12.5px; }
.actions { display: flex; gap: 4px; align-items: center; }
.icon-btn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer; }
.icon-btn:hover:not(:disabled) { background: var(--warm-100); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.reactivate { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--amatista-200); background: var(--amatista-50); color: var(--amatista-700); font-family: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.reactivate:hover { background: var(--amatista-100); }
.note { margin: 16px 0 0; font-size: 12.5px; color: var(--warm-500); line-height: 1.55; max-width: 640px; }
</style>
