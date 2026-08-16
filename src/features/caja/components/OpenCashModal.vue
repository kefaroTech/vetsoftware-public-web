<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Wallet } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { useBranches } from '@/features/branches/composables/useBranches'
import { useCaja } from '../composables/useCaja'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { cashTerminalApi } from '../api/cashTerminal.api'
import type { CashTerminal } from '../types/cashTerminal.types'
import type { CashSessionView } from '../types/caja'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [session: CashSessionView] }>()

const { open: openCaja, openSessions, loadOpenSessions } = useCaja()
const { visibleBranches, selectedBranchId, loading: branchesLoading } = useBranches()

const openingFloat = ref('')
const branchId = ref('')
const defaultBranchId = ref<number | null>(null)
const terminalId = ref('')
const terminals = ref<CashTerminal[]>([])
const terminalsLoading = ref(false)
const note = ref('')
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const branchOptions = computed(() =>
  visibleBranches.value.map((branch) => ({
    value: String(branch.id),
    label: branch.city?.name ? `${branch.name} - ${branch.city.name}` : branch.name,
  })),
)
const selectedBranchNumericId = computed(() => (branchId.value ? Number(branchId.value) : null))
const branchChanged = computed(
  () =>
    defaultBranchId.value != null &&
    selectedBranchNumericId.value != null &&
    selectedBranchNumericId.value !== defaultBranchId.value,
)
const availableTerminals = computed(() =>
  terminals.value.filter(
    (terminal) =>
      !openSessions.value.some(
        (session) =>
          session.branchId === terminal.branchId &&
          session.terminal.trim().toUpperCase() === terminal.code.trim().toUpperCase(),
      ),
  ),
)
const terminalOptions = computed(() =>
  availableTerminals.value.map((terminal) => ({
    value: String(terminal.id),
    label: `${terminal.name} · ${terminal.code}`,
  })),
)
const occupiedTerminalCount = computed(
  () => terminals.value.length - availableTerminals.value.length,
)
const terminalHint = computed(() => {
  if (terminalsLoading.value) return undefined
  if (terminals.value.length === 0) return 'No hay terminales activos en esta sede.'
  if (availableTerminals.value.length === 0) {
    return 'Todos los terminales de esta sede ya tienen una caja abierta.'
  }
  if (occupiedTerminalCount.value > 0) {
    return `${occupiedTerminalCount.value} ${
      occupiedTerminalCount.value === 1
        ? 'terminal no está disponible'
        : 'terminales no están disponibles'
    } porque ya ${occupiedTerminalCount.value === 1 ? 'tiene' : 'tienen'} una caja abierta.`
  }
  return undefined
})
const floatValue = computed(() => Number(openingFloat.value.replace(',', '.')))
const floatError = computed(() =>
  openingFloat.value.trim() === '' || Number.isNaN(floatValue.value) || floatValue.value < 0
    ? 'Ingresa una base válida (0 o más).'
    : null,
)

function branchName(id: number | null): string {
  return visibleBranches.value.find((branch) => branch.id === id)?.name ?? 'la sede seleccionada'
}

function resolveDefaultBranchId(): number | null {
  const visibleIds = visibleBranches.value.map((branch) => branch.id)
  if (selectedBranchId.value != null && visibleIds.includes(selectedBranchId.value)) {
    return selectedBranchId.value
  }
  return visibleBranches.value[0]?.id ?? null
}

let terminalLoadSequence = 0
async function loadTerminals(selectedBranchId = branchId.value): Promise<void> {
  const requestSequence = ++terminalLoadSequence
  terminalId.value = ''
  terminals.value = []

  const selectedId = Number(selectedBranchId)
  if (!selectedBranchId || !Number.isFinite(selectedId)) {
    terminalsLoading.value = false
    return
  }

  terminalsLoading.value = true
  try {
    const [loaded] = await Promise.all([cashTerminalApi.list(selectedId, true), loadOpenSessions()])
    if (requestSequence !== terminalLoadSequence) return
    const branchTerminals = loaded.filter((terminal) => terminal.branchId === selectedId)
    terminals.value = branchTerminals
    const [onlyTerminal] = availableTerminals.value
    if (onlyTerminal && availableTerminals.value.length === 1)
      terminalId.value = String(onlyTerminal.id)
  } catch (e) {
    if (requestSequence !== terminalLoadSequence) return
    serverError.value = getProblemDetailMessage(e, 'No se pudieron cargar los terminales')
  } finally {
    if (requestSequence === terminalLoadSequence) terminalsLoading.value = false
  }
}

function changeBranch(nextBranchId: string): void {
  if (branchId.value === nextBranchId) return
  branchId.value = nextBranchId
  serverError.value = null
  void loadTerminals(nextBranchId)
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      terminalLoadSequence++
      terminalsLoading.value = false
      return
    }

    openingFloat.value = ''
    terminalId.value = ''
    note.value = ''
    submitted.value = false
    serverError.value = null
    terminals.value = []

    defaultBranchId.value = resolveDefaultBranchId()
    const nextBranchId = defaultBranchId.value == null ? '' : String(defaultBranchId.value)
    branchId.value = nextBranchId
    void loadTerminals(nextBranchId)
  },
  { immediate: true },
)

watch(visibleBranches, () => {
  if (!props.open || branchId.value) return
  const defaultBranchId = resolveDefaultBranchId()
  if (defaultBranchId != null) {
    const nextBranchId = String(defaultBranchId)
    branchId.value = nextBranchId
    void loadTerminals(nextBranchId)
  }
})

async function submit() {
  submitted.value = true
  serverError.value = null
  if (floatError.value || !branchId.value || !terminalId.value) return
  saving.value = true
  try {
    const session = await openCaja({
      branchId: Number(branchId.value),
      terminalId: Number(terminalId.value),
      openingFloat: floatValue.value,
      note: note.value.trim() || null,
    })
    emit('saved', session)
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo abrir la caja')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Abrir caja"
    subtitle="Registra la base inicial para comenzar a cobrar"
    :icon="Wallet"
    :width="520"
    compact
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="ds-server-error">{{ serverError }}</p>
      <div class="grid">
        <BaseField
          label="Base inicial (efectivo)"
          required
          :error="submitted ? (floatError ?? undefined) : undefined"
        >
          <BaseInput
            v-model="openingFloat"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="submitted && !!floatError"
          />
        </BaseField>
        <BaseField
          label="Sede"
          required
          :error="submitted && !branchId ? 'Selecciona una sede.' : undefined"
        >
          <BaseSelect
            :model-value="branchId"
            :options="branchOptions"
            :placeholder="branchesLoading ? 'Cargando…' : 'Selecciona una sede'"
            :disabled="branchesLoading || branchOptions.length === 0"
            :invalid="submitted && !branchId"
            @update:model-value="changeBranch"
          />
        </BaseField>
        <p v-if="branchChanged" class="branch-warning" role="alert">
          Estás cambiando la sede de la caja de
          <strong>{{ branchName(defaultBranchId) }}</strong> a
          <strong>{{ branchName(selectedBranchNumericId) }}</strong
          >. Los terminales disponibles corresponden a la nueva sede.
        </p>
        <BaseField
          label="Terminal"
          required
          :error="submitted && !terminalId ? 'Selecciona un terminal.' : undefined"
          :hint="terminalHint"
        >
          <BaseSelect
            v-model="terminalId"
            :options="terminalOptions"
            :placeholder="terminalsLoading ? 'Cargando…' : 'Selecciona un terminal'"
            :disabled="terminalsLoading || terminalOptions.length === 0"
            :invalid="submitted && !terminalId"
          />
        </BaseField>
        <BaseField label="Nota" hint="Opcional">
          <BaseTextarea v-model="note" placeholder="Observaciones de apertura…" :rows="2" />
        </BaseField>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--strong" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        :disabled="saving"
        @click="submit"
      >
        {{ saving ? 'Abriendo…' : 'Abrir caja' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.branch-warning {
  margin: -8px 0 0;
  padding: 10px 12px;
  border: 1px solid #e6b84f;
  border-radius: 8px;
  background: #fff8df;
  color: #75540d;
  font-size: 13px;
  line-height: 1.45;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
