<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Beaker, Plus, Trash2, X, Pencil } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, LaboratoryTest } from '@/types/domain'
import type { LaboratoryTestDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { useTestTypes } from '../composables/useTestTypes'

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
  return { testTypeId: '', quantity: '1', diagnosis: '' }
}

const draft = reactive({
  date: todayISO(),
  tests: [emptyTest()] as TestDraft[],
})
const submitted = ref(false)
const editingIndex = ref<number | null>(null)

function resetDraft() {
  draft.date = todayISO()
  draft.tests = [emptyTest()]
  submitted.value = false
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
      testTypeId: item.testTypeId,
      quantity: String(item.quantity),
      diagnosis: item.diagnosis,
    },
  ]
  editingIndex.value = idx
  submitted.value = false
}

function cancelEditing() {
  editingIndex.value = null
  resetDraft()
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
      !t.quantity.trim() ||
      !Number.isFinite(Number(t.quantity)) ||
      Number(t.quantity) < 1
        ? 'Cantidad inválida'
        : null,
    diagnosis: !t.diagnosis.trim() ? 'Indica el diagnóstico presuntivo' : null,
  })),
}))

const valid = computed<boolean>(() =>
  errors.value.tests.every(
    (t) => !t.testTypeId && !t.quantity && !t.diagnosis,
  ),
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

function testErr(i: number, k: keyof TestDraft): string | undefined {
  if (!submitted.value) return undefined
  return errors.value.tests[i]?.[k] ?? undefined
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const items: LaboratoryTest[] = draft.tests.map((t) => ({
    date: draft.date,
    testTypeId: t.testTypeId,
    quantity: Number(t.quantity),
    diagnosis: t.diagnosis.trim(),
    status: 'PENDING_COLLECTION',
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
    :width="860"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <section v-if="props.existing.length > 0" class="existing-section">
        <h4 class="existing-title">Ya solicitados ({{ props.existing.length }})</h4>
        <ul class="existing-list">
          <li
            v-for="(item, idx) in props.existing"
            :key="idx"
            class="existing-card"
          >
            <div class="existing-summary">
              <div class="existing-main">
                {{ formatDateShort(item.date) }} · {{ typeLabel(item.testTypeId) }}
              </div>
              <div class="existing-sub">
                {{ item.quantity }} unidad{{ item.quantity === 1 ? '' : 'es' }}
                · {{ item.diagnosis || 'sin diagnóstico' }}
              </div>
            </div>
            <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
            <template v-else>
              <button
                type="button"
                class="edit-existing"
                :class="{ active: editingIndex === idx }"
                aria-label="Editar examen"
                :disabled="editingIndex !== null && editingIndex !== idx"
                @click="
                  editingIndex === idx ? cancelEditing() : startEditing(idx)
                "
              >
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                type="button"
                class="remove-existing"
                aria-label="Eliminar examen"
                :disabled="editingIndex !== null"
                @click="emit('remove-existing', idx)"
              >
                <X :size="14" :stroke-width="1.7" />
              </button>
            </template>
          </li>
        </ul>
      </section>

      <div v-if="editingIndex !== null" class="editing-banner">
        <Pencil :size="14" :stroke-width="1.7" />
        <span>Editando examen #{{ editingIndex + 1 }}</span>
        <button type="button" class="editing-cancel" @click="cancelEditing">
          Cancelar
        </button>
      </div>

      <div class="tests-list">
        <div v-for="(t, i) in draft.tests" :key="i" class="test-card">
          <div class="test-head">
            <div class="test-num">{{ i + 1 }}</div>
            <div class="test-title">Examen {{ i + 1 }}</div>
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
            <BaseField
              label="Tipo de examen"
              required
              :error="testErr(i, 'testTypeId')"
            >
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
            <BaseField
              label="Cantidad"
              required
              :error="testErr(i, 'quantity')"
            >
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
            <BaseField
              label="Diagnóstico presuntivo"
              required
              :error="testErr(i, 'diagnosis')"
            >
              <template #default="{ id }">
                <BaseTextarea
                  :id="id"
                  v-model="t.diagnosis"
                  :rows="2"
                  placeholder="Sospecha clínica que justifica el examen"
                />
              </template>
            </BaseField>
          </div>
        </div>
      </div>

      <button
        v-if="editingIndex === null"
        type="button"
        class="add-btn"
        @click="addTest"
      >
        <Plus :size="14" :stroke-width="1.8" />
        <span>Agregar otro examen</span>
      </button>
    </template>

    <template #footer-left>
      <span v-if="editingIndex !== null">Editando examen existente</span>
      <span v-else>
        {{ draft.tests.length }} examen{{ draft.tests.length === 1 ? '' : 'es' }}
        · Se vinculará a la consulta
      </span>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="btn-primary"
        @click="save"
      >
        {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar solicitud' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.catalog-error {
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  margin-bottom: 14px;
}
.tests-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
.test-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--amatista-100);
  color: var(--amatista-700);
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}
.test-title {
  flex: 1;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
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
  color: oklch(50% 0.18 25);
}
.test-grid {
  display: grid;
  grid-template-columns: 2fr 120px 2fr;
  gap: 12px;
}
@media (max-width: 880px) {
  .test-grid {
    grid-template-columns: 1fr;
  }
}
.add-btn {
  margin-top: 10px;
  width: 100%;
  background: transparent;
  border: 1.5px dashed var(--warm-300);
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
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn-ghost:hover {
  background: var(--warm-100);
}
.btn-primary {
  background: var(--amatista-700);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.existing-section {
  margin-bottom: 22px;
  padding: 14px 16px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 12px;
}
.existing-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--amatista-700);
  margin: 0 0 10px;
}
.existing-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.existing-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.existing-summary {
  min-width: 0;
  flex: 1;
}
.existing-main {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.existing-sub {
  font-size: 13px;
  color: var(--warm-600);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saved-chip {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 999px;
  background: oklch(94% 0.06 150);
  color: oklch(40% 0.15 150);
  border: 1px solid oklch(85% 0.10 150);
  white-space: nowrap;
}
.remove-existing {
  background: transparent;
  border: 1px solid var(--warm-200);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}
.remove-existing:hover:not(:disabled) {
  background: oklch(94% 0.06 25);
  border-color: oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
}
.remove-existing:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.edit-existing {
  background: transparent;
  border: 1px solid var(--warm-200);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}
.edit-existing:hover:not(:disabled) {
  background: var(--amatista-50);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
}
.edit-existing.active {
  background: var(--amatista-700);
  border-color: var(--amatista-700);
  color: white;
}
.edit-existing:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.editing-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: var(--amatista-700);
  color: white;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}
.editing-banner span {
  flex: 1;
}
.editing-cancel {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: white;
  cursor: pointer;
}
.editing-cancel:hover {
  background: rgba(255, 255, 255, 0.28);
}
</style>
