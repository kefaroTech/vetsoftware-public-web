<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { PauseCircle, Pencil, Plus, RotateCcw } from 'lucide-vue-next'
import TaxFormModal from '../components/TaxFormModal.vue'
import AccentButton from '../components/AccentButton.vue'
import SegTabs from '../components/SegTabs.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney } from '../composables/pricing'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { TaxResponse } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { confirm } = useConfirmDialog()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.TAX_CREATE)
const canUpdate = can(PERMISSIONS.TAX_UPDATE)
const canDelete = can(PERMISSIONS.TAX_DELETE)

// Sin `TAX_CREATE` no hay botón de alta en la cabecera, así que «Crea el
// primero» sería una instrucción que la pantalla no deja seguir.
const emptyText = computed(() =>
  canCreate.value
    ? 'Sin impuestos. Crea el primero.'
    : 'Sin impuestos. Tu rol no incluye crearlos.',
)

/** 'active' = impuestos vivos; 'paused' = impuestos pausados (enabled=false) para reactivar. */
const mode = ref<'active' | 'paused'>('active')

const modalOpen = ref(false)
const editing = ref<TaxResponse | null>(null)
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

/**
 * Solo se puede pausar un impuesto que NO esté en uso (el back lo bloquea con
 * 409; aquí lo prevenimos). Si pasa el filtro, la confirmación es la única de la
 * app y lleva dentro la acción: mientras el DELETE vuela el diálogo sigue
 * abierto con los botones inertes, así que la fila no puede dispararlo dos veces.
 */
async function requestPause(t: TaxResponse) {
  if (usageOf(t.id) > 0) {
    toast.warn(
      'Impuesto en uso',
      `${t.name} está asignado a ${usageOf(t.id)} ítem(s). Cámbialos de tasa antes de pausarlo.`,
    )
    return
  }
  try {
    const ok = await confirm({
      title: 'Pausar impuesto',
      message: `${t.name} dejará de estar disponible para asignar.`,
      consequence: 'Podrás reactivarlo desde la pestaña “Pausados”.',
      confirmLabel: 'Pausar',
      busyLabel: 'Pausando…',
      action: () => store.removeTax(t.id),
    })
    if (!ok) return
    toast.info('Impuesto pausado', `${t.name} dejó de estar disponible.`)
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo pausar')
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

const activos = useTemplateRef<HTMLElement>('activos')
const activosDesborda = useScrollableRegion(activos)
const pausados = useTemplateRef<HTMLElement>('pausados')
const pausadosDesborda = useScrollableRegion(pausados)
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
          aria-label="Estado de los impuestos"
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

    <!-- EST-01: la rama de error va ANTES que la de vacío. Si conviven, la
         pantalla que falló afirma «Sin impuestos. Crea el primero». -->
    <div v-if="store.error.value" class="ds-banner ds-banner--error" role="alert">
      {{ store.error.value }}
    </div>

    <!-- ─────────── Modo ACTIVOS ─────────── -->
    <div
      v-if="!store.error.value && mode === 'active'"
      ref="activos"
      class="ds-table-scroll ds-focus-ring"
      role="region"
      aria-label="Impuestos activos"
      :tabindex="activosDesborda ? 0 : undefined"
    >
      <table class="ds-table">
        <thead>
          <tr>
            <th>Impuesto</th>
            <th>Tributo</th>
            <th class="ds-num">Porcentaje</th>
            <th class="ds-num">IVA contenido en $100.000</th>
            <th>En uso</th>
            <th v-if="canUpdate || canDelete"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading.value">
            <td colspan="6" class="ds-empty ds-empty--lg">Cargando…</td>
          </tr>
          <tr v-else-if="store.taxes.value.length === 0">
            <td colspan="6" class="ds-empty ds-empty--lg">{{ emptyText }}</td>
          </tr>
          <tr
            v-for="t in store.taxes.value"
            v-else
            :key="t.id"
            class="trow ds-row-hover"
            @click="onRowClick(t)"
          >
            <td class="tname ds-text-strong">{{ t.name }}</td>
            <td>{{ t.taxScheme }}</td>
            <td class="tstock ds-num">{{ t.percentage }}%</td>
            <td class="ds-num">{{ ivaContenido(t.percentage) }}</td>
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
    <div
      v-else-if="!store.error.value"
      ref="pausados"
      class="ds-table-scroll ds-focus-ring"
      role="region"
      aria-label="Impuestos pausados"
      :tabindex="pausadosDesborda ? 0 : undefined"
    >
      <table class="ds-table">
        <thead>
          <tr>
            <th>Impuesto</th>
            <th>Tributo</th>
            <th class="ds-num">Porcentaje</th>
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
            <td class="tname ds-text-strong">{{ t.name }}</td>
            <td>{{ t.taxScheme }}</td>
            <td class="tstock ds-num">{{ t.percentage }}%</td>
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

/* Los dos contenedores con scroll son `.ds-table-scroll` (primitives.css): las
   dos declaraciones coincidían byte a byte y la regla local se borró.

   Las dos tablas (activos y pausados) son `.ds-table` (primitives.css). Aquí no
   queda ninguna regla `.table`: la primitiva la sustituye por completo. El
   `.ds-empty ds-empty--lg` de las cuatro celdas `<td colspan>` vacías lo
   resuelve la excepción `.ds-table td.ds-empty--lg` de `primitives.css`
   (0,2,1), que le gana a `.ds-table td` (0,1,1). */

/* NO es `.ds-row-clickable` (tiñe de amatista y sobre el `td`); el gris sobre
   el `<tr>` es `.ds-row-hover`, que va en el marcado. Ver la misma nota en
   `InventoryProductsTable`. */
.trow {
  cursor: pointer;
}

/* El `font-weight` Y el `color` los pone `.ds-text-strong` (primitives.css):
   el `color` le llega vía la excepción `.ds-table td.ds-text-strong`
   (auditoría FE-08 fase final), que le gana a `.ds-table td` (0,1,1) por
   nombre; ya no queda CSS local para esta celda. */
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
