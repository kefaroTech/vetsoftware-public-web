<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { MonitorSmartphone, Pencil, Plus, Power, PowerOff } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { PERMISSIONS } from '@/constants/permissions'
import type { BranchResponse } from '@/features/branches/types/branch.types'
import { cashTerminalApi } from '../api/cashTerminal.api'
import type { CashTerminal, SaveCashTerminalRequest } from '../types/cashTerminal.types'

const props = defineProps<{ branches: BranchResponse[] }>()
const { can } = useAuthorization()
const toast = useToast()

const activeBranches = computed(() => props.branches.filter((branch) => branch.active))
const branchOptions = computed(() =>
  activeBranches.value.map((branch) => ({ value: String(branch.id), label: branch.name })),
)
const canManage = computed(() => can(PERMISSIONS.BRANCH_UPDATE).value)

const selectedBranchId = ref('')
const terminals = ref<CashTerminal[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const editing = ref<CashTerminal | null>(null)
const submitted = ref(false)
const saving = ref(false)
const draft = reactive({ name: '', code: '' })

watch(
  activeBranches,
  (branches) => {
    if (!branches.some((branch) => String(branch.id) === selectedBranchId.value)) {
      selectedBranchId.value = branches[0] ? String(branches[0].id) : ''
    }
  },
  { immediate: true },
)

watch(selectedBranchId, () => void load(), { immediate: true })

async function load() {
  if (!selectedBranchId.value) {
    terminals.value = []
    return
  }
  loading.value = true
  try {
    terminals.value = await cashTerminalApi.list(Number(selectedBranchId.value))
  } catch (e) {
    toast.errorFrom('No se pudieron cargar', e, 'Error cargando terminales.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  draft.name = ''
  draft.code = ''
  submitted.value = false
  modalOpen.value = true
}

function openEdit(terminal: CashTerminal) {
  editing.value = terminal
  draft.name = terminal.name
  draft.code = terminal.code
  submitted.value = false
  modalOpen.value = true
}

const nameError = computed(() =>
  draft.name.trim().length >= 2 ? null : 'Ingresa un nombre de al menos 2 caracteres.',
)
const codeError = computed(() => (draft.code.trim() ? null : 'Ingresa un código.'))

async function save() {
  submitted.value = true
  if (nameError.value || codeError.value || !selectedBranchId.value) return
  saving.value = true
  try {
    const body: SaveCashTerminalRequest = {
      branchId: Number(selectedBranchId.value),
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
    }
    if (editing.value) {
      await cashTerminalApi.update(editing.value.id, { name: body.name, code: body.code })
      toast.success('Terminal actualizado', body.name)
    } else {
      await cashTerminalApi.create(body)
      toast.success('Terminal creado', body.name)
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    toast.errorFrom('No se pudo guardar', e, 'Revisa los datos del terminal.')
  } finally {
    saving.value = false
  }
}

async function toggle(terminal: CashTerminal) {
  try {
    await cashTerminalApi.setActive(terminal.id, !terminal.active)
    toast.success(terminal.active ? 'Terminal desactivado' : 'Terminal activado', terminal.name)
    await load()
  } catch (e) {
    toast.error(
      'No se pudo cambiar el estado',
      getProblemDetailMessage(e, 'El terminal puede tener una caja abierta.'),
    )
  }
}
</script>

<template>
  <section class="terminals-panel">
    <div class="panel-head">
      <div>
        <h3><MonitorSmartphone :size="17" :stroke-width="1.7" /> Terminales de caja</h3>
        <p>Administra los puntos de caja disponibles en cada sede.</p>
      </div>
      <div class="actions">
        <BaseSelect
          v-model="selectedBranchId"
          :options="branchOptions"
          placeholder="Selecciona una sede"
          :disabled="branchOptions.length === 0"
        />
        <button
          v-if="canManage"
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="!selectedBranchId"
          @click="openCreate"
        >
          <Plus :size="15" :stroke-width="1.8" /> Nuevo terminal
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty">Cargando terminales…</div>
    <div v-else-if="terminals.length" class="terminal-grid">
      <article
        v-for="terminal in terminals"
        :key="terminal.id"
        class="terminal"
        :class="{ inactive: !terminal.active }"
      >
        <span class="terminal-icon"><MonitorSmartphone :size="18" :stroke-width="1.6" /></span>
        <div class="terminal-info">
          <strong>{{ terminal.name }}</strong>
          <span>{{ terminal.code }}</span>
        </div>
        <span class="status" :class="terminal.active ? 'active' : 'off'">
          {{ terminal.active ? 'Activo' : 'Inactivo' }}
        </span>
        <div v-if="canManage" class="terminal-actions">
          <button type="button" title="Editar terminal" @click="openEdit(terminal)">
            <Pencil :size="13" /> Editar
          </button>
          <button type="button" @click="toggle(terminal)">
            <component :is="terminal.active ? PowerOff : Power" :size="13" />
            {{ terminal.active ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
      </article>
    </div>
    <div v-else class="empty">
      {{
        selectedBranchId
          ? 'No hay terminales registrados en esta sede.'
          : 'No hay sedes activas disponibles.'
      }}
    </div>

    <ModalShell
      :open="modalOpen"
      :title="editing ? 'Editar terminal' : 'Nuevo terminal'"
      subtitle="El código identifica el terminal dentro de la sede."
      :icon="MonitorSmartphone"
      :width="480"
      @close="modalOpen = false"
    >
      <template #body>
        <div class="form-grid">
          <BaseField
            label="Nombre"
            required
            :error="submitted ? (nameError ?? undefined) : undefined"
          >
            <BaseInput
              v-model="draft.name"
              placeholder="Caja recepción"
              :invalid="submitted && !!nameError"
            />
          </BaseField>
          <BaseField
            label="Código"
            required
            :error="submitted ? (codeError ?? undefined) : undefined"
          >
            <BaseInput
              v-model="draft.code"
              placeholder="CAJA-01"
              :invalid="submitted && !!codeError"
              @update:model-value="
                draft.code = String($event)
                  .replace(/[^A-Za-z0-9_-]/g, '')
                  .toUpperCase()
              "
            />
          </BaseField>
        </div>
      </template>
      <template #footer-actions>
        <button
          type="button"
          class="ds-btn ds-btn--neutral ds-btn--snug"
          @click="modalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </button>
      </template>
    </ModalShell>
  </section>
</template>

<style scoped>
.terminals-panel {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--warm-200);
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}
.panel-head h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 400;
  color: var(--warm-900);
}
.panel-head p {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
}
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 390px;
}
.actions :deep(.base-select) {
  flex: 1;
}

/* Los botones usan `.ds-btn` (primitives.css). */
button:disabled {
  opacity: 0.55;
  cursor: default;
}
.terminal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.terminal {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  background: var(--warm-50);
}
.terminal.inactive {
  opacity: 0.7;
}
.terminal-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--amatista-100);
  color: var(--amatista-700);
}
.terminal-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.terminal-info strong {
  font-size: 13.5px;
  color: var(--warm-900);
}
.terminal-info span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--warm-500);
}
.status {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
}
.status.active {
  background: var(--success-bg);
  color: var(--success-fg);
}
.status.off {
  background: var(--warm-200);
  color: var(--warm-600);
}
.terminal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding-top: 10px;
  border-top: 1px solid var(--warm-150);
}
.terminal-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--warm-200);
  border-radius: 7px;
  background: transparent;
  color: var(--warm-700);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.empty {
  padding: 24px;
  text-align: center;
  border: 1px dashed var(--warm-200);
  border-radius: 12px;
  color: var(--warm-500);
  font-size: 13px;
}
.form-grid {
  display: grid;
  gap: 16px;
}

@media (width <= 720px) {
  .panel-head {
    align-items: stretch;
    flex-direction: column;
  }
  .actions {
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
