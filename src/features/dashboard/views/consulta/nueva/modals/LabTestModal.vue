<script setup lang="ts">
import { nextRowUid } from '@/composables/rowUid'
import { computed, reactive, ref, watch } from 'vue'
import { Beaker, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BranchConfirmNotice from '../components/BranchConfirmNotice.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import type { Animal, LaboratoryTest } from '@/types/domain'
import type { LaboratoryTestDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '@/composables/format'
import { useTestTypes } from '@/features/laboratory-test-types/composables/useLaboratoryTestTypes'
import { useBranches } from '@/features/branches/composables/useBranches'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: LaboratoryTestDraftItem[]
}>()

const emit = defineEmits<{
  save: [tests: LaboratoryTest[]]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, test: LaboratoryTest]
}>()

interface TestDraft {
  /** Clave estable de la fila; nace vacia, no hay dato del que derivarla. */
  uid: number
  testTypeId: string
  quantity: string
  diagnosis: string
}

const {
  options: testOptions,
  loading: loadingTypes,
  error: typesError,
  create: createTestType,
} = useTestTypes()

function emptyTest(): TestDraft {
  return { uid: nextRowUid(), testTypeId: '', quantity: '1', diagnosis: '' }
}

// Desplegable de sede: solo las sedes ASIGNADAS al usuario (aunque sea admin).
const { assignedBranches, selectedBranchId } = useBranches()

const draft = reactive({
  date: todayISO(),
  tests: [emptyTest()] as TestDraft[],
})
const submitted = ref(false)
const editingIndex = ref<number | null>(null)
const branchId = ref<number | null>(null)
const defaultBranchId = ref<number | null>(null)
const confirmingBranch = ref(false)

// Sede por defecto: la del menú si el usuario la tiene asignada; si no, su primera sede asignada.
function resolveDefaultBranch(): number | null {
  const ids = assignedBranches.value.map((b) => b.id)
  if (selectedBranchId.value != null && ids.includes(selectedBranchId.value))
    return selectedBranchId.value
  return assignedBranches.value[0]?.id ?? null
}
// Sede de la solicitud: se elige si el usuario tiene ≥2 sedes asignadas.
const showBranchField = computed(() => assignedBranches.value.length > 1)
const branchOptions = computed(() =>
  assignedBranches.value.map((b) => ({
    value: String(b.id),
    label: b.city?.name ? `${b.name} - ${b.city.name}` : b.name,
  })),
)
function branchName(id: number | null): string {
  return assignedBranches.value.find((b) => b.id === id)?.name ?? 'la sede'
}
// Hay que confirmar si la sede elegida difiere de la sede por defecto.
const needsBranchConfirm = computed(
  () =>
    defaultBranchId.value != null &&
    branchId.value != null &&
    branchId.value !== defaultBranchId.value,
)

function resetDraft() {
  draft.date = todayISO()
  draft.tests = [emptyTest()]
  submitted.value = false
  confirmingBranch.value = false
  defaultBranchId.value = resolveDefaultBranch()
  branchId.value = defaultBranchId.value
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetDraft()
      editingIndex.value = null
    }
  },
)

function startEditing(idx: number) {
  const item = props.existing[idx]
  if (!item) return
  draft.date = item.date
  draft.tests = [
    {
      uid: nextRowUid(),
      testTypeId: item.testTypeId,
      quantity: String(item.quantity),
      diagnosis: item.diagnosis,
    },
  ]
  // Al editar, la sede por defecto es la que ya tenía el examen.
  defaultBranchId.value = item.branchId ?? resolveDefaultBranch()
  branchId.value = defaultBranchId.value
  editingIndex.value = idx
  submitted.value = false
  confirmingBranch.value = false
}

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  tests: draft.tests.map((t) => ({
    testTypeId: !t.testTypeId ? 'Selecciona un tipo' : null,
    quantity:
      !t.quantity.trim() || !Number.isFinite(Number(t.quantity)) || Number(t.quantity) < 1
        ? 'Cantidad inválida'
        : null,
    diagnosis: null, // Observaciones es opcional.
  })),
}))

const valid = computed<boolean>(() =>
  errors.value.tests.every((t) => !t.testTypeId && !t.quantity && !t.diagnosis),
)

function addTest() {
  draft.tests.push(emptyTest())
}
function removeTest(i: number) {
  if (draft.tests.length === 1) return
  draft.tests.splice(i, 1)
}

function typeLabel(id: string): string {
  return testOptions.value.find((o) => o.value === id)?.label ?? 'Tipo no encontrado'
}

async function onCreateTestType(data: { name: string; description: string }) {
  const created = await createTestType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function testErr(i: number, k: Exclude<keyof TestDraft, 'uid'>): string | undefined {
  if (!submitted.value) return undefined
  return errors.value.tests[i]?.[k] ?? undefined
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return draft.tests.every((t) => !t.testTypeId && !t.diagnosis.trim())
}

function save() {
  // Si ya hay ítems agregados y el formulario nuevo está vacío, no se valida ni se crea
  // vacío: solo se cierra. La obligatoriedad solo aplica cuando aún no hay ítems.
  if (editingIndex.value === null && props.existing.length > 0 && isNewDraftEmpty()) {
    emit('close')
    return
  }
  submitted.value = true
  if (!valid.value) {
    scrollToFirstError()
    return
  }
  // Confirmación si la sede elegida difiere de la del menú principal.
  if (needsBranchConfirm.value && !confirmingBranch.value) {
    confirmingBranch.value = true
    return
  }
  doSave()
}

function doSave() {
  confirmingBranch.value = false
  const items: LaboratoryTest[] = draft.tests.map((t) => ({
    date: draft.date,
    testTypeId: t.testTypeId,
    quantity: Number(t.quantity),
    diagnosis: t.diagnosis.trim(),
    status: 'PENDING_COLLECTION',
    branchId: branchId.value,
  }))
  if (editingIndex.value !== null) {
    const first = items[0]
    if (!first) return
    emit('update-existing', editingIndex.value, first)
    editingIndex.value = null
    resetDraft()
  } else {
    emit('save', items)
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Beaker"
    title="Solicitar examen de laboratorio"
    :subtitle="subtitle"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <BranchConfirmNotice
        v-if="confirmingBranch"
        :branch-name="branchName(branchId)"
        :default-branch-name="branchName(defaultBranchId)"
      />
      <template v-else>
        <div v-if="typesError" class="ds-catalog-error">{{ typesError }}</div>

        <BaseField v-if="showBranchField" label="Sede" required class="branch-field">
          <BaseSelect
            :model-value="branchId != null ? String(branchId) : null"
            :options="branchOptions"
            placeholder="Selecciona una sede"
            @update:model-value="(v: string) => (branchId = Number(v))"
          />
        </BaseField>

        <ExistingItemsSection
          :items="props.existing"
          title="Ya solicitados"
          noun="examen"
          :editing-index="editingIndex"
          @edit="startEditing"
          @remove="emit('remove-existing', $event)"
        >
          <template #main="{ item }"
            >{{ formatDateShort(item.date) }} · {{ typeLabel(item.testTypeId) }}</template
          >
          <template #sub="{ item }">
            {{ item.quantity }} unidad{{ item.quantity === 1 ? '' : 'es' }} ·
            {{ item.diagnosis || 'sin observaciones' }}
          </template>
        </ExistingItemsSection>

        <div class="ds-stack ds-stack--10">
          <div v-for="(t, i) in draft.tests" :key="t.uid" class="test-card">
            <div class="test-head">
              <div class="test-num ds-tone--accent">{{ i + 1 }}</div>
              <div class="test-title ds-meta-dark ds-meta-dark--sm">Examen {{ i + 1 }}</div>
              <button
                v-if="draft.tests.length > 1"
                type="button"
                class="remove"
                aria-label="Quitar examen"
                @click="removeTest(i)"
              >
                <Trash2 :size="14" :stroke-width="1.7" />
              </button>
            </div>
            <div class="test-grid">
              <BaseField label="Tipo de examen" required :error="testErr(i, 'testTypeId')">
                <template #default>
                  <SearchableSelect
                    v-model="t.testTypeId"
                    :options="testOptions"
                    :loading="loadingTypes"
                    placeholder="Selecciona un tipo"
                    create-label="Crear tipo de examen"
                    :invalid="!!testErr(i, 'testTypeId')"
                    :on-create="onCreateTestType"
                  />
                </template>
              </BaseField>
              <BaseField label="Cantidad" required :error="testErr(i, 'quantity')">
                <template #default="{ id }">
                  <BaseInput
                    :id="id"
                    v-model="t.quantity"
                    inputmode="numeric"
                    placeholder="1"
                    :invalid="!!testErr(i, 'quantity')"
                  />
                </template>
              </BaseField>
              <BaseField label="Observaciones" :error="testErr(i, 'diagnosis')">
                <template #default="{ id }">
                  <BaseTextarea
                    :id="id"
                    v-model="t.diagnosis"
                    :rows="2"
                    placeholder="Observaciones sobre el examen solicitado"
                  />
                </template>
              </BaseField>
            </div>
          </div>
        </div>

        <button v-if="editingIndex === null" type="button" class="add-btn" @click="addTest">
          <Plus :size="14" :stroke-width="1.8" />
          <span>Agregar otro examen</span>
        </button>
      </template>
    </template>

    <template #footer-left>
      <span v-if="confirmingBranch">Confirma la sede antes de continuar</span>
      <span v-else-if="editingIndex !== null">Editando examen existente</span>
      <span v-else>
        {{ draft.tests.length }} examen{{ draft.tests.length === 1 ? '' : 'es' }}
        · Se vinculará a la consulta
      </span>
    </template>
    <template #footer-actions>
      <template v-if="confirmingBranch">
        <button type="button" class="ds-btn ds-btn--ghost" @click="confirmingBranch = false">
          Volver
        </button>
        <button type="button" class="ds-btn ds-btn--solid" @click="doSave">
          Sí, usar esta sede
        </button>
      </template>
      <template v-else>
        <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
        <button type="button" class="ds-btn ds-btn--solid" @click="save">
          {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar solicitud' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
.branch-field {
  margin-bottom: 16px;
  max-width: 380px;
}

.test-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  padding: 14px;
}

.test-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.test-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

/* Residuo sobre `.ds-meta-dark` + `--sm` (warm-600 / 12,5px). */
.test-title {
  flex: 1;
  font-weight: 500;
}

.remove {
  background: transparent;
  border: none;
  color: var(--warm-500);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.remove:hover {
  background: var(--warm-100);
  color: var(--danger-600);
}

.test-grid {
  display: grid;
  grid-template-columns: 2fr 120px 2fr;
  gap: 12px;
}

@media (width <= 880px) {
  .test-grid {
    grid-template-columns: 1fr;
  }
}

.add-btn {
  margin-top: 10px;
  width: 100%;
  background: transparent;
  border: 1.5px dashed var(--warm-450);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--warm-700);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.add-btn:hover {
  background: var(--warm-100);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
}
</style>
