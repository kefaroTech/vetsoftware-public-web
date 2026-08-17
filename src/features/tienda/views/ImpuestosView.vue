<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PauseCircle, Pencil, Plus, RotateCcw } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog.vue'
import TaxFormModal from '../components/TaxFormModal.vue'
import AccentButton from '../components/AccentButton.vue'
import SegTabs from '../components/SegTabs.vue'
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
      toast.error(
        'Ocurrió un error',
        getProblemDetailMessage(e, 'No se pudieron cargar los pausados'),
      )
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
    toast.warn(
      'Impuesto en uso',
      `${t.name} está asignado a ${usageOf(t.id)} ítem(s). Cámbialos de tasa antes de pausarlo.`,
    )
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
    toast.errorFrom('Ocurrió un error', e, 'No se pudo pausar')
  } finally {
    pausingBusy.value = false
  }
}

async function onReactivate(t: TaxResponse) {
  try {
    await store.enableTax(t.id)
    toast.success('Impuesto reactivado', `${t.name} volvió a estar disponible.`)
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo reactivar')
  }
}

function ivaContenido(percentage: number): string {
  return formatMoney(Math.round(100000 - 100000 / (1 + percentage / 100)))
}
</script>

<template>
  <div class="ds-page">
    <header class="ds-head">
      <div>
        <div class="ds-kicker ds-kicker--spaced">Tienda · Impuestos</div>
        <h1 class="ds-display">Administración de impuestos</h1>
      </div>
      <div class="head-actions ds-flex-row">
        <SegTabs
          :model-value="mode"
          :options="[
            { value: 'active', label: 'Activos' },
            { value: 'paused', label: 'Pausados' },
          ]"
          @update:model-value="switchMode"
        />
        <button
          v-if="canCreate && mode === 'active'"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--elevated ds-btn--nowrap"
          @click="openNew"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nuevo impuesto
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

    <!-- ─────────── Modo ACTIVOS ─────────── -->
    <div v-if="mode === 'active'" class="tbl-scroll">
      <table class="ds-table">
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
            <td colspan="6" class="ds-empty ds-empty--lg">Cargando…</td>
          </tr>
          <tr v-else-if="store.taxes.value.length === 0">
            <td colspan="6" class="ds-empty ds-empty--lg">Sin impuestos. Crea el primero.</td>
          </tr>
          <tr v-for="t in store.taxes.value" v-else :key="t.id" class="trow" @click="onRowClick(t)">
            <td class="tname">{{ t.name }}</td>
            <td>{{ t.taxScheme }}</td>
            <td class="tstock">{{ t.percentage }}%</td>
            <td>{{ ivaContenido(t.percentage) }}</td>
            <td class="tuse">{{ usageOf(t.id) }} ítem(s)</td>
            <td v-if="canUpdate || canDelete" @click.stop>
              <div class="actions">
                <button
                  v-if="canUpdate"
                  type="button"
                  class="ds-icon-btn"
                  title="Editar"
                  @click="editing = t"
                >
                  <Pencil :size="14" :stroke-width="1.7" />
                </button>
                <button
                  v-if="canDelete"
                  type="button"
                  class="ds-icon-btn"
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
    </div>

    <!-- ─────────── Modo PAUSADOS ─────────── -->
    <div v-else class="tbl-scroll">
      <table class="ds-table">
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
            <td colspan="4" class="ds-empty ds-empty--lg">Cargando…</td>
          </tr>
          <tr v-else-if="store.pausedTaxes.value.length === 0">
            <td colspan="4" class="ds-empty ds-empty--lg">No hay impuestos pausados.</td>
          </tr>
          <tr v-for="t in store.pausedTaxes.value" v-else :key="t.id">
            <td class="tname">{{ t.name }}</td>
            <td>{{ t.taxScheme }}</td>
            <td class="tstock">{{ t.percentage }}%</td>
            <td>
              <AccentButton v-if="canDelete" @click="onReactivate(t)">
                <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
              </AccentButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="note">
      Cada producto y servicio tiene asignado un impuesto (campo "Impuesto" en su ficha). En el
      punto de venta el impuesto se calcula por línea y se agrupa por tasa en la factura.
    </p>

    <TaxFormModal
      :open="modalOpen || editing !== null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <ConfirmDeleteDialog
      :open="pausing !== null"
      title="Pausar impuesto"
      action-label="Pausar"
      :message="
        pausing
          ? `${pausing.name} dejará de estar disponible para asignar. Podrás reactivarlo desde la pestaña “Pausados”.`
          : ''
      "
      :busy="pausingBusy"
      @cancel="pausing = null"
      @confirm="onConfirmPause"
    />
  </div>
</template>

<style scoped>
/* El contenedor usa `.ds-page` y la cabecera `.ds-head` (primitives.css).
   Esta vista es la única de las tres que deja envolver la cabecera. */
.ds-head {
  flex-wrap: wrap;
}

/* El rótulo en versalitas es `.ds-kicker ds-kicker--spaced` y la fila de la
   cabecera `.ds-flex-row` (primitives.css). */
.head-actions {
  flex-shrink: 0;
  flex-wrap: wrap;
}
.tbl-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Las dos tablas (activos y pausados) son `.ds-table` (primitives.css). Aquí no
   queda ninguna regla `.table`: la primitiva la sustituye por completo. El
   `.ds-empty ds-empty--lg` de las cuatro celdas `<td colspan>` vacías lo
   resuelve la excepción `.ds-table td.ds-empty--lg` de `primitives.css`
   (0,2,1), que le gana a `.ds-table td` (0,1,1). */

/* NO es `.ds-row-clickable` (tiñe de amatista y sobre el `td`); ver la misma
   nota en `InventoryProductsTable`. */
.trow {
  cursor: pointer;
}
.trow:hover {
  background: var(--warm-100);
}
.tname {
  font-weight: 500;
  color: var(--warm-900);
}
.tstock {
  font-weight: 600;
}
.tuse {
  color: var(--warm-600);
  font-size: 12.5px;
}
.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.note {
  margin: 16px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.55;
  max-width: 640px;
}
</style>
