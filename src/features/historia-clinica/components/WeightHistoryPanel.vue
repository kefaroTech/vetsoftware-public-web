<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Trash2, TrendingUp, X } from 'lucide-vue-next'
import PawLoader from '@/components/feedback/PawLoader.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { weightRecordApi } from '@/features/dashboard/views/consulta/nueva/api/weightRecord.api'
import type {
  WeightRecordResponse,
  WeightSource,
} from '@/features/dashboard/views/consulta/nueva/types/weightRecord.types'
import type { WeightUnit } from '@/types/domain'
import { formatDateShort } from '@/composables/format'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  animalId: number
  defaultUnit: WeightUnit
  canEdit: boolean
}>()

const emit = defineEmits<{ changed: [] }>()

const records = ref<WeightRecordResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const UNIT_LABEL: Record<WeightUnit, string> = {
  GRAMS: 'g',
  POUNDS: 'lb',
  KILOGRAMS: 'kg',
}
const UNIT_OPTIONS = [
  { value: 'KILOGRAMS', label: 'Kilogramos (kg)' },
  { value: 'POUNDS', label: 'Libras (lb)' },
  { value: 'GRAMS', label: 'Gramos (g)' },
]
const SOURCE_LABEL: Record<WeightSource, string> = {
  MANUAL: 'Manual',
  CONSULTATION: 'Consulta',
  HOSPITALIZATION: 'Hospitalización',
}

function toKg(value: number, unit: WeightUnit): number {
  if (unit === 'GRAMS') return value / 1000
  if (unit === 'POUNDS') return value * 0.453592
  return value
}

async function load() {
  loading.value = true
  error.value = null
  try {
    records.value = await weightRecordApi.listByAnimal(props.animalId)
  } catch {
    error.value = 'No se pudo cargar el historial de peso.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.animalId, load)

// Serie ascendente (cronológica) para el gráfico de tendencia; la lista se muestra descendente.
const ascending = computed(() =>
  [...records.value].sort((a, b) => {
    const d = a.measuredAt.localeCompare(b.measuredAt)
    return d !== 0 ? d : a.id - b.id
  }),
)

const CHART_W = 560
const CHART_H = 150
const PAD_X = 14
const PAD_Y = 18

// Todos los puntos se normalizan a kg para que la tendencia sea comparable aunque haya
// registros en unidades distintas. En la lista se conserva la unidad original.
const chart = computed(() => {
  const pts = ascending.value.map((r) => ({
    kg: toKg(r.value, r.unit),
    record: r,
  }))
  if (pts.length === 0) return null
  const values = pts.map((p) => p.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const n = pts.length
  const xFor = (i: number) =>
    n === 1 ? CHART_W / 2 : PAD_X + (i * (CHART_W - 2 * PAD_X)) / (n - 1)
  const yFor = (kg: number) => CHART_H - PAD_Y - ((kg - min) / span) * (CHART_H - 2 * PAD_Y)
  const coords = pts.map((p, i) => ({
    x: xFor(i),
    y: yFor(p.kg),
    record: p.record,
    kg: p.kg,
  }))
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')
  // `pts` ya se comprobó no vacío arriba y `coords` sale de mapearlo, así que
  // los extremos existen; se nombran para que el compilador lo vea igual que
  // lo ve quien lee, en vez de repetir el indexado dentro de la plantilla.
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (!first || !last) return null
  const area =
    `M${first.x.toFixed(1)},${(CHART_H - PAD_Y).toFixed(1)} ` +
    coords.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
    ` L${last.x.toFixed(1)},${(CHART_H - PAD_Y).toFixed(1)} Z`
  return { coords, line, area, min, max }
})

// Variación respecto al registro anterior (en kg normalizado), para el resumen superior.
const trend = computed(() => {
  const asc = ascending.value
  const lastRec = asc[asc.length - 1]
  const prevRec = asc[asc.length - 2]
  if (!lastRec || !prevRec) return null
  const last = toKg(lastRec.value, lastRec.unit)
  const prev = toKg(prevRec.value, prevRec.unit)
  const diff = last - prev
  const pct = prev !== 0 ? (diff / prev) * 100 : 0
  return { diff, pct }
})

const descending = computed(() => [...ascending.value].reverse())

// --- Alta de registro manual ---
const showForm = ref(false)
const today = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const form = ref<{ value: string; unit: WeightUnit; measuredAt: string; note: string }>({
  value: '',
  unit: props.defaultUnit,
  measuredAt: today,
  note: '',
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

const valueError = computed(() => {
  const raw = form.value.value.trim().replace(',', '.')
  if (!raw) return 'Ingresa el peso'
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 'El peso debe ser mayor a 0'
  return null
})

function openForm() {
  form.value = { value: '', unit: props.defaultUnit, measuredAt: today, note: '' }
  submitted.value = false
  saveError.value = null
  showForm.value = true
}

async function submit() {
  submitted.value = true
  if (valueError.value) {
    scrollToFirstError()
    return
  }
  saving.value = true
  saveError.value = null
  try {
    await weightRecordApi.create(props.animalId, {
      value: Number(form.value.value.trim().replace(',', '.')),
      unit: form.value.unit,
      measuredAt: form.value.measuredAt || null,
      note: form.value.note.trim() || null,
    })
    showForm.value = false
    await load()
    emit('changed')
  } catch {
    saveError.value = 'No se pudo guardar el registro.'
  } finally {
    saving.value = false
  }
}

const deletingId = ref<number | null>(null)
async function remove(id: number) {
  deletingId.value = id
  try {
    await weightRecordApi.remove(props.animalId, id)
    await load()
    emit('changed')
  } catch {
    error.value = 'No se pudo eliminar el registro.'
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <section class="wpanel ds-card">
    <header class="wp-head ds-flex-row ds-flex-row--12">
      <div class="wp-title ds-flex-row ds-flex-row--accent">
        <TrendingUp :size="16" :stroke-width="1.8" />
        <h2>Historial de peso</h2>
        <span v-if="records.length" class="wp-count ds-tone--accent">{{ records.length }}</span>
      </div>
      <button
        v-if="canEdit && !showForm"
        type="button"
        class="wp-add ds-btn ds-btn--solid ds-btn--sm"
        @click="openForm"
      >
        <Plus :size="14" :stroke-width="1.8" />
        Registrar peso
      </button>
    </header>

    <div v-if="loading" class="wp-loading">
      <PawLoader :size="34" :glow="false" :speed="900" />
    </div>

    <div v-else-if="error" class="wp-banner error">{{ error }}</div>

    <template v-else>
      <!-- Formulario de alta -->
      <form v-if="showForm" class="wp-form" @submit.prevent="submit">
        <div class="wp-form-grid">
          <BaseField
            label="Peso"
            required
            :error="submitted ? (valueError ?? undefined) : undefined"
          >
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="form.value"
                type="text"
                inputmode="decimal"
                placeholder="Ej. 12.5"
                :invalid="submitted && !!valueError"
              />
            </template>
          </BaseField>
          <BaseField label="Unidad">
            <template #default="{ id }">
              <BaseSelect :id="id" v-model="form.unit" :options="UNIT_OPTIONS" />
            </template>
          </BaseField>
          <BaseField label="Fecha">
            <template #default="{ id }">
              <DateInput :id="id" v-model="form.measuredAt" :max="today" />
            </template>
          </BaseField>
          <BaseField label="Nota" class="wp-note">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="form.note" placeholder="Opcional" />
            </template>
          </BaseField>
        </div>
        <div v-if="saveError" class="wp-banner error">{{ saveError }}</div>
        <div class="wp-form-actions ds-actions">
          <button
            type="button"
            class="wp-btn-ghost ds-btn ds-btn--ghost ds-btn--snug"
            :disabled="saving"
            @click="showForm = false"
          >
            <X :size="14" :stroke-width="1.8" />
            Cancelar
          </button>
          <button type="submit" class="wp-btn-primary ds-btn ds-btn--solid" :disabled="saving">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>

      <div v-if="records.length === 0" class="wp-empty ds-empty">
        Sin registros de peso todavía.
      </div>

      <template v-else>
        <!-- Resumen + gráfico de tendencia -->
        <div v-if="chart" class="wp-chart-wrap">
          <div v-if="trend" class="wp-trend" :class="trend.diff >= 0 ? 'up' : 'down'">
            {{ trend.diff >= 0 ? '▲' : '▼' }}
            {{ Math.abs(trend.diff).toFixed(2) }} kg
            <span class="wp-trend-pct"
              >({{ trend.pct >= 0 ? '+' : '' }}{{ trend.pct.toFixed(1) }}%)</span
            >
            <span class="wp-trend-cap">vs. registro anterior</span>
          </div>
          <svg
            class="wp-chart"
            :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
            preserveAspectRatio="none"
            role="img"
            aria-label="Tendencia de peso"
          >
            <defs>
              <linearGradient id="wpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--amatista-400)" stop-opacity="0.28" />
                <stop offset="100%" stop-color="var(--amatista-400)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="chart.area" fill="url(#wpGrad)" />
            <path
              :d="chart.line"
              fill="none"
              stroke="var(--amatista-600)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
            <circle
              v-for="(c, i) in chart.coords"
              :key="i"
              :cx="c.x"
              :cy="c.y"
              r="3"
              fill="var(--amatista-700)"
            />
          </svg>
          <div class="wp-chart-axis ds-meta ds-meta--caption">
            <span>máx {{ chart.max.toFixed(2) }} kg</span>
            <span>mín {{ chart.min.toFixed(2) }} kg</span>
          </div>
        </div>

        <!-- Lista de registros (más reciente primero) -->
        <ul class="wp-list ds-list-reset ds-stack">
          <li v-for="r in descending" :key="r.id" class="wp-item ds-flex-row ds-flex-row--12">
            <div class="wp-item-main">
              <span class="wp-item-value ds-strong">{{ r.value }} {{ UNIT_LABEL[r.unit] }}</span>
              <span class="ds-meta">{{ formatDateShort(r.measuredAt) }}</span>
            </div>
            <div class="wp-item-meta ds-flex-fill ds-flex-row">
              <span class="wp-src" :class="`src-${r.source.toLowerCase()}`">
                {{ SOURCE_LABEL[r.source] }}
              </span>
              <span v-if="r.note" class="wp-item-note ds-truncate">{{ r.note }}</span>
            </div>
            <button
              v-if="canEdit"
              type="button"
              class="wp-del"
              :class="{ 'ds-is-disabled': deletingId === r.id }"
              :disabled="deletingId === r.id"
              title="Eliminar registro"
              @click="remove(r.id)"
            >
              <Trash2 :size="14" :stroke-width="1.7" />
            </button>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped>
.wpanel {
  margin-bottom: var(--space-18);
  padding: var(--space-18) var(--space-20);
}

.wp-head {
  justify-content: space-between;
  margin-bottom: var(--space-14);
}

.wp-title {
  display: inline-flex;
}

.wp-title h2 {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 400;
  color: var(--warm-900);
  margin: 0;
}

/* Resto sobre `.ds-tone--accent`: forma y tipografía del contador. */
.wp-count {
  font-size: 11.5px;
  font-weight: 600;
  border-radius: var(--radius-pill);
  padding: 1px 8px;
}

.wp-add {
  border-radius: var(--radius-md);
}

/* Gana al `filter: brightness()` de `.ds-btn--solid:hover` por especificidad
   (0,4,0 frente a 0,3,0), no por orden de hoja. */
.wp-add:hover:not(:disabled) {
  background: var(--amatista-600);
}

.wp-loading {
  display: grid;
  place-items: center;
  padding: 30px 0;
}

.wp-banner.error {
  padding: 10px 12px;
  font-size: 12.5px;
  border-radius: 9px;
  background: oklch(97% 0.02 25deg);
  color: var(--danger-700);
  border: 1px solid oklch(85% 0.06 25deg);
  margin-bottom: 12px;
}

.wp-form {
  background: white;
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

/* 4 columnas con dos escalones de colapso: sin equivalente en el design system. */
.wp-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-14) var(--space-16);
}

@media (width <= 720px) {
  .wp-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 480px) {
  .wp-form-grid {
    grid-template-columns: 1fr;
  }
}

.wp-note {
  grid-column: 1 / -1;
}

.wp-form-actions {
  gap: var(--space-8);
  margin-top: var(--space-14);
}

.wp-btn-primary {
  padding: var(--space-8) var(--space-16);
  border-radius: var(--radius-md);
}

/* Este botón se apaga a 0,6 y no al 0,5 de `.ds-btn:disabled`. */
.wp-btn-primary:disabled {
  opacity: 0.6;
}

.wp-btn-ghost {
  border-radius: var(--radius-md);
  background: var(--warm-50);
}

.wp-empty {
  padding: var(--space-28) var(--space-16);
  font-size: var(--text-body);
}

.wp-chart-wrap {
  margin-bottom: 14px;
}

.wp-trend {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.wp-trend.up {
  color: oklch(52% 0.16 150deg);
}

.wp-trend.down {
  color: var(--danger-500);
}

.wp-trend-pct {
  font-weight: 500;
}

.wp-trend-cap {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--warm-500);
}

.wp-chart {
  width: 100%;
  height: 150px;
  display: block;
}

/* Resto sobre `.ds-meta --caption`: reparto de los dos extremos del eje. */
.wp-chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
}

.wp-list {
  gap: var(--space-2);
}

.wp-item {
  padding: var(--space-9) var(--space-10);
  border-radius: var(--radius-control);
}

.wp-item:hover {
  background: var(--warm-100);
}

.wp-item-main {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 150px;
}

.wp-item-value {
  font-size: var(--text-xl);
}

/* Resto sobre `.ds-flex-fill` + `.ds-flex-row`: gap propio (10px). */
.wp-item-meta {
  gap: var(--space-10);
}

.wp-src {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--warm-200);
  color: var(--warm-700);
}

.wp-src.src-consultation {
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.wp-src.src-hospitalization {
  background: oklch(93% 0.05 250deg);
  color: oklch(45% 0.15 250deg);
}

.wp-item-note {
  color: var(--warm-600);
  font-size: var(--text-sm);
}

.wp-del {
  background: transparent;
  border: none;
  color: var(--warm-400);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  flex-shrink: 0;
}

.wp-del:hover {
  color: var(--danger-500);
  background: oklch(96% 0.02 25deg);
}
</style>
