<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Globe, PauseCircle, Pencil, Plus, RotateCcw } from 'lucide-vue-next'
import MedicamentFormModal from '../components/MedicamentFormModal.vue'
import SegTabs from '@/features/tienda/components/SegTabs.vue'
import { useMedicamentCatalog } from '../composables/useMedicamentCatalog'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { MedicamentResponse } from '@/features/dashboard/views/consulta/nueva/types/medicament.types'

const store = useMedicamentCatalog()
const toast = useToast()
const { confirm } = useConfirmDialog()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.PRESCRIPTION_CREATE)
const canUpdate = can(PERMISSIONS.PRESCRIPTION_UPDATE)
const canDelete = can(PERMISSIONS.PRESCRIPTION_DELETE)

/** 'active' = disponibles (globales + propios); 'paused' = pausados propios para reactivar. */
const mode = ref<'active' | 'paused'>('active')

const modalOpen = ref(false)
const editing = ref<MedicamentResponse | null>(null)
const pausedLoading = ref(false)

onMounted(() => store.reload())

// Los medicamentos globales (general=true) son de solo lectura para la empresa:
// no se pueden editar ni pausar; solo los propios (general=false).
function isOwn(m: MedicamentResponse): boolean {
  return !m.general
}

async function switchMode(m: 'active' | 'paused') {
  if (mode.value === m) return
  mode.value = m
  if (m === 'paused') {
    pausedLoading.value = true
    try {
      await store.loadDisabled()
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
function onSaved() {
  const wasEdit = editing.value !== null
  toast.success(
    'Medicamento guardado',
    wasEdit ? 'Los cambios se guardaron.' : 'Se creó el medicamento.',
  )
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

/**
 * Pausar pasa por el único diálogo de confirmación de la app: la acción viaja
 * dentro de `confirm()`, así que mientras el DELETE está en vuelo el diálogo
 * sigue abierto con los botones inertes y la fila no puede volver a dispararlo.
 */
async function requestPause(m: MedicamentResponse) {
  try {
    const ok = await confirm({
      title: 'Pausar medicamento',
      message: `${m.name} dejará de estar disponible al recetar.`,
      consequence: 'Podrás reactivarlo desde la pestaña “Pausados”.',
      confirmLabel: 'Pausar',
      busyLabel: 'Pausando…',
      action: () => store.remove(m.id),
    })
    if (!ok) return
    toast.info('Medicamento pausado', `${m.name} dejó de estar disponible.`)
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo pausar')
  }
}

async function onReactivate(m: MedicamentResponse) {
  try {
    await store.enable(m.id)
    toast.success('Medicamento reactivado', `${m.name} volvió a estar disponible.`)
  } catch (e) {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo reactivar')
  }
}

const sorted = computed(() => [...store.items.value].sort((a, b) => a.name.localeCompare(b.name)))
</script>

<template>
  <div class="ds-page">
    <header class="ds-head">
      <div>
        <div class="ds-kicker ds-kicker--spaced">Administración · Medicamentos</div>
        <h1 class="ds-display">Catálogo de medicamentos</h1>
      </div>
      <div class="head-actions ds-flex-row">
        <SegTabs
          aria-label="Estado de los medicamentos"
          :model-value="mode"
          :options="[
            { value: 'active', label: 'Disponibles' },
            { value: 'paused', label: 'Pausados' },
          ]"
          @update:model-value="switchMode"
        />
        <button
          v-if="canCreate && mode === 'active'"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
          @click="openNew"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nuevo medicamento
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

    <!-- ─────────── Modo DISPONIBLES ─────────── -->
    <div v-if="mode === 'active'" class="ds-table-scroll">
      <table class="ds-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Descripción</th>
            <th>Alcance</th>
            <th v-if="canUpdate || canDelete"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading.value">
            <td colspan="4" class="ds-empty ds-empty--lg">Cargando…</td>
          </tr>
          <tr v-else-if="sorted.length === 0">
            <td colspan="4" class="ds-empty ds-empty--lg">Sin medicamentos. Crea el primero.</td>
          </tr>
          <tr v-for="m in sorted" v-else :key="m.id" class="ds-row-hover">
            <td class="tname ds-text-strong">{{ m.name }}</td>
            <td class="tdesc">{{ m.description || '—' }}</td>
            <td>
              <span v-if="m.general" class="scope ds-tone--accent-soft"
                ><Globe :size="12" :stroke-width="1.9" /> Global</span
              >
              <span v-else class="scope own">Propio</span>
            </td>
            <td v-if="canUpdate || canDelete">
              <div class="actions">
                <button
                  v-if="canUpdate && isOwn(m)"
                  type="button"
                  class="ds-icon-btn"
                  title="Editar"
                  @click="editing = m"
                >
                  <Pencil :size="14" :stroke-width="1.7" />
                </button>
                <button
                  v-if="canDelete && isOwn(m)"
                  type="button"
                  class="ds-icon-btn"
                  title="Pausar"
                  @click="requestPause(m)"
                >
                  <PauseCircle :size="14" :stroke-width="1.7" />
                </button>
                <span v-if="m.general" class="readonly-hint">Solo lectura</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ─────────── Modo PAUSADOS ─────────── -->
    <div v-else class="ds-table-scroll">
      <table class="ds-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Descripción</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pausedLoading">
            <td colspan="3" class="ds-empty ds-empty--lg">Cargando…</td>
          </tr>
          <tr v-else-if="store.disabled.value.length === 0">
            <td colspan="3" class="ds-empty ds-empty--lg">No hay medicamentos pausados.</td>
          </tr>
          <tr v-for="m in store.disabled.value" v-else :key="m.id">
            <td class="tname ds-text-strong">{{ m.name }}</td>
            <td class="tdesc">{{ m.description || '—' }}</td>
            <td>
              <button v-if="canDelete" type="button" class="reactivate" @click="onReactivate(m)">
                <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="note">
      Los medicamentos <strong>globales</strong> son compartidos por todas las clínicas y son de
      solo lectura. Los <strong>propios</strong> los creas tú y puedes editarlos o pausarlos. Al
      recetar (plan terapéutico) se elige el medicamento de este catálogo.
    </p>

    <MedicamentFormModal
      :open="modalOpen || editing !== null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
/* El contenedor usa `.ds-page`, la cabecera `.ds-head` y el rótulo
   `.ds-kicker--spaced` (primitives.css). */
.head-actions {
  flex-shrink: 0;
}

/* El conmutador «Disponibles/Pausados» es `SegTabs` (issue #161). Aquí había una
   sexta copia de su cuerpo CSS —idéntica salvo el `box-shadow`, que literalizaba
   el valor de `--shadow-xs`— sobre un `role="tablist"` cuyos botones no eran
   `role="tab"`. Mismo gesto que el de `ImpuestosView`, que ya se clasificó como
   filtro: dos conmutadores iguales en pantalla no pueden anunciarse distinto
   según la vista en la que estén. No devolver el CSS local: el componente lo trae. */

/* Los dos contenedores con scroll usan `.ds-table-scroll` y la fila con hover
   `.ds-row-hover` (primitives.css). `.tname` migra por completo a
   `.ds-text-strong`: la primitiva aporta el `font-weight` desde su base y el
   `color` desde la excepción `.ds-table td.ds-text-strong` (primitives.css,
   auditoría FE-08 fase final), que le gana a `.ds-table td` (0,1,1) por
   nombre — ya no queda CSS local para esta celda. */

/* Las dos tablas usan `.ds-table` (primitives.css): la firma "pantalla"
   (13px / radio 12 / celda 11×14) coincidía propiedad a propiedad, así que
   las reglas `.table`, `.table th`, `.table td` y `.table tbody
   tr:last-child td` se borraron en vez de dejarlas competir con la
   primitiva. Lo único que la primitiva NO cubre es el ancho mínimo, que es
   propio de esta vista (sus columnas se aplastarían dentro de
   `.tbl-scroll`), así que se conserva como override local mínimo. */
.ds-table {
  min-width: 560px;
}
.tdesc {
  color: var(--warm-600);
  font-size: 12.5px;
  max-width: 380px;
}
.scope {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
}

/* El tono global es `.ds-tone--accent-soft`; sólo queda su borde. */
.scope.ds-tone--accent-soft {
  border: 1px solid var(--amatista-200);
}
.scope.own {
  background: var(--warm-100);
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
}
.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.readonly-hint {
  font-size: 11.5px;
  color: var(--warm-400);
}
.reactivate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--amatista-200);
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.reactivate:hover {
  background: var(--amatista-100);
}
.note {
  margin: 16px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.55;
  max-width: 680px;
}
</style>
