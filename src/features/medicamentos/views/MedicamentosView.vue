<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Globe, PauseCircle, Pencil, Plus, RotateCcw } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import MedicamentFormModal from '../components/MedicamentFormModal.vue'
import { useMedicamentCatalog } from '../composables/useMedicamentCatalog'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { MedicamentResponse } from '@/features/dashboard/views/consulta/nueva/api/medicament.api'

const store = useMedicamentCatalog()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.PRESCRIPTION_CREATE)
const canUpdate = can(PERMISSIONS.PRESCRIPTION_UPDATE)
const canDelete = can(PERMISSIONS.PRESCRIPTION_DELETE)

/** 'active' = disponibles (globales + propios); 'paused' = pausados propios para reactivar. */
const mode = ref<'active' | 'paused'>('active')

const modalOpen = ref(false)
const editing = ref<MedicamentResponse | null>(null)
const pausing = ref<MedicamentResponse | null>(null)
const pausingBusy = ref(false)
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

function requestPause(m: MedicamentResponse) {
  pausing.value = m
}

async function onConfirmPause() {
  const target = pausing.value
  if (!target) return
  pausingBusy.value = true
  try {
    await store.remove(target.id)
    toast.info('Medicamento pausado', `${target.name} dejó de estar disponible.`)
    pausing.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo pausar'))
  } finally {
    pausingBusy.value = false
  }
}

async function onReactivate(m: MedicamentResponse) {
  try {
    await store.enable(m.id)
    toast.success('Medicamento reactivado', `${m.name} volvió a estar disponible.`)
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo reactivar'))
  }
}

const sorted = computed(() => [...store.items.value].sort((a, b) => a.name.localeCompare(b.name)))
</script>

<template>
  <div class="inv">
    <header class="ds-head">
      <div>
        <div class="kicker">Administración · Medicamentos</div>
        <h1 class="ds-display">Catálogo de medicamentos</h1>
      </div>
      <div class="head-actions">
        <div class="seg" role="tablist">
          <button type="button" :class="{ on: mode === 'active' }" @click="switchMode('active')">
            Disponibles
          </button>
          <button type="button" :class="{ on: mode === 'paused' }" @click="switchMode('paused')">
            Pausados
          </button>
        </div>
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
    <div v-if="mode === 'active'" class="tbl-scroll">
      <table class="table">
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
          <tr v-for="m in sorted" v-else :key="m.id" class="trow">
            <td class="tname">{{ m.name }}</td>
            <td class="tdesc">{{ m.description || '—' }}</td>
            <td>
              <span v-if="m.general" class="scope global"
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
    <div v-else class="tbl-scroll">
      <table class="table">
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
            <td class="tname">{{ m.name }}</td>
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

    <ConfirmDeleteDialog
      :open="pausing !== null"
      title="Pausar medicamento"
      action-label="Pausar"
      :message="
        pausing
          ? `${pausing.name} dejará de estar disponible al recetar. Podrás reactivarlo desde la pestaña “Pausados”.`
          : ''
      "
      :busy="pausingBusy"
      @cancel="pausing = null"
      @confirm="onConfirmPause"
    />
  </div>
</template>

<style scoped>
.inv {
  font-family: var(--font-sans);
  color: var(--warm-900);
}
.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
  margin-bottom: 6px;
}
.head-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}
.seg {
  display: inline-flex;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 2px;
}
.seg button {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
  padding: 6px 12px;
  border-radius: 7px;
  cursor: pointer;
}
.seg button.on {
  background: var(--warm-50);
  color: var(--amatista-700);
  box-shadow: 0 1px 2px rgb(50 20 80 / 8%);
}
.tbl-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 13px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}
.table th {
  text-align: left;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 11px 14px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
  vertical-align: middle;
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.trow:hover {
  background: var(--warm-100);
}
.tname {
  font-weight: 500;
  color: var(--warm-900);
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
.scope.global {
  background: var(--amatista-50);
  color: var(--amatista-700);
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
