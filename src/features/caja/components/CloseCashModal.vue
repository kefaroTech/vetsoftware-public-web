<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { LockKeyhole, FileDown } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { useCaja, formatMoney, methodLabel } from '../composables/useCaja'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { CashPaymentMethod, CashSessionView } from '../types/caja'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; closed: [] }>()

const { current, close, exportArqueo } = useCaja()

const counted = reactive<Record<string, string>>({})
const note = ref('')
const phase = ref<'count' | 'done'>('count')
const closedSession = ref<CashSessionView | null>(null)
const saving = ref(false)
const serverError = ref<string | null>(null)

const rows = computed(() => current.value?.totals ?? [])

function expectedOf(method: CashPaymentMethod): number {
  return rows.value.find((t) => t.method === method)?.expectedAmount ?? 0
}
function countedOf(method: CashPaymentMethod): number {
  const v = Number((counted[method] ?? '').replace(',', '.'))
  return Number.isNaN(v) ? 0 : v
}
function differenceOf(method: CashPaymentMethod): number {
  return countedOf(method) - expectedOf(method)
}

const totalExpected = computed(() => rows.value.reduce((s, t) => s + t.expectedAmount, 0))
const totalCounted = computed(() => rows.value.reduce((s, t) => s + countedOf(t.method), 0))
const totalDifference = computed(() => totalCounted.value - totalExpected.value)

watch(
  () => props.open,
  (o) => {
    if (o) {
      phase.value = 'count'
      closedSession.value = null
      note.value = ''
      serverError.value = null
      for (const t of rows.value) counted[t.method] = String(t.expectedAmount)
    }
  },
)

async function confirmClose() {
  serverError.value = null
  saving.value = true
  try {
    closedSession.value = await close({
      counts: rows.value.map((t) => ({ method: t.method, countedAmount: countedOf(t.method) })),
      note: note.value.trim() || null,
    })
    phase.value = 'done'
    emit('closed')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo cerrar la caja')
  } finally {
    saving.value = false
  }
}

function download(format: 'csv' | 'pdf') {
  if (closedSession.value) void exportArqueo(closedSession.value.id, format)
}

function diffClass(diff: number): string {
  return diff === 0 ? '' : diff > 0 ? 'pos' : 'neg'
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="phase === 'done' ? 'Caja cerrada' : 'Cerrar caja'"
    :subtitle="
      phase === 'done'
        ? 'Arqueo listo para descargar'
        : 'Cuenta el efectivo y concilia por medio de pago'
    "
    :icon="phase === 'done' ? FileDown : LockKeyhole"
    :width="640"
    compact
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="server-error">{{ serverError }}</p>

      <div v-if="phase === 'count'">
        <table class="arqueo">
          <thead>
            <tr>
              <th>Medio</th>
              <th class="num">Esperado</th>
              <th class="num">Contado</th>
              <th class="num">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.method">
              <td>{{ methodLabel(t.method) }}</td>
              <td class="num">{{ formatMoney(t.expectedAmount) }}</td>
              <td class="num">
                <BaseInput
                  v-model="counted[t.method]"
                  class="count-input"
                  inputmode="decimal"
                  placeholder="0"
                />
              </td>
              <td class="num" :class="diffClass(differenceOf(t.method))">
                {{ formatMoney(differenceOf(t.method)) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td class="num">{{ formatMoney(totalExpected) }}</td>
              <td class="num">{{ formatMoney(totalCounted) }}</td>
              <td class="num" :class="diffClass(totalDifference)">
                {{ formatMoney(totalDifference) }}
              </td>
            </tr>
          </tfoot>
        </table>

        <BaseField
          label="Nota de cierre"
          hint="Opcional (justifica una diferencia, etc.)"
          class="note-field"
        >
          <BaseTextarea v-model="note" placeholder="Observaciones del arqueo…" />
        </BaseField>
      </div>

      <div v-else class="done">
        <p class="done-msg">
          La caja se cerró correctamente. Diferencia total del arqueo:
          <strong :class="diffClass(totalDifference)">{{ formatMoney(totalDifference) }}</strong
          >.
        </p>
        <div class="download-row">
          <button
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--strong"
            @click="download('csv')"
          >
            <FileDown :size="15" :stroke-width="1.7" /> Descargar CSV
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--strong"
            @click="download('pdf')"
          >
            <FileDown :size="15" :stroke-width="1.7" /> Descargar PDF
          </button>
        </div>
      </div>
    </template>

    <template #footer-actions>
      <template v-if="phase === 'count'">
        <button type="button" class="ds-btn ds-btn--neutral ds-btn--strong" @click="emit('close')">
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--strong"
          :disabled="saving"
          @click="confirmClose"
        >
          {{ saving ? 'Cerrando…' : 'Cerrar caja' }}
        </button>
      </template>
      <button
        v-else
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        @click="emit('close')"
      >
        Listo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.arqueo {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.arqueo th {
  text-align: left;
  color: var(--warm-500);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}

.arqueo td {
  padding: 8px;
  border-bottom: 1px solid var(--warm-100);
}

.arqueo tfoot td {
  font-weight: 700;
  border-top: 2px solid var(--warm-300);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.count-input {
  max-width: 140px;
  margin-left: auto;
}

.pos {
  color: #2f7d4f;
  font-weight: 600;
}

.neg {
  color: #b4453a;
  font-weight: 600;
}

.note-field {
  margin-top: 18px;
}

.server-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--danger-150);
  color: oklch(45% 0.18 25deg);
  font-size: 13px;
}

.done-msg {
  font-size: 14px;
  color: var(--warm-800);
  margin: 0 0 16px;
}

.download-row {
  display: flex;
  gap: 10px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
