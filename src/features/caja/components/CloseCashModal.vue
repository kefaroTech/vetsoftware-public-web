<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { LockKeyhole, FileDown } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
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

/**
 * `null` = ese medio TODAVÍA NO se ha contado. No es lo mismo que «conté cero»:
 * en un arqueo esa distinción es la que separa un descuadre real de uno
 * inventado, y por eso la celda vacía se pinta con el marcador de dato ausente
 * (`—`) y no con un `0`.
 */
function countedOf(method: CashPaymentMethod): number | null {
  const raw = (counted[method] ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (raw === '') return null
  const v = Number(raw)
  return Number.isFinite(v) ? v : null
}
function differenceOf(method: CashPaymentMethod): number | null {
  const c = countedOf(method)
  return c === null ? null : c - expectedOf(method)
}

const totalExpected = computed(() => rows.value.reduce((s, t) => s + t.expectedAmount, 0))
const totalCounted = computed(() => rows.value.reduce((s, t) => s + (countedOf(t.method) ?? 0), 0))
/** Todos los medios contados: hasta entonces el total del arqueo no significa nada. */
const allCounted = computed(() => rows.value.every((t) => countedOf(t.method) !== null))
const totalDifference = computed(() =>
  allCounted.value ? totalCounted.value - totalExpected.value : null,
)

/** Importe o marcador de dato ausente, según se haya contado o no. */
function money(v: number | null): string {
  return v === null ? '—' : formatMoney(v)
}

watch(
  () => props.open,
  (o) => {
    if (o) {
      phase.value = 'count'
      closedSession.value = null
      note.value = ''
      serverError.value = null
      // CONTEO CIEGO: el campo arranca VACÍO. Prellenarlo con el importe esperado
      // —lo que hacía antes— convertía el arqueo en una confirmación: el cajero
      // veía la cifra del sistema antes de contar y el descuadre tendía a cero
      // por construcción, que es justo lo que un arqueo existe para detectar.
      for (const t of rows.value) counted[t.method] = ''
    }
  },
)

async function confirmClose() {
  if (saving.value) return
  serverError.value = null
  if (!allCounted.value) {
    serverError.value =
      'Escribe lo contado en cada medio de pago antes de cerrar. Si en alguno no había nada, escribe 0.'
    return
  }
  saving.value = true
  try {
    closedSession.value = await close({
      // `allCounted` ya garantizó que ninguno es `null` aquí.
      counts: rows.value.map((t) => ({
        method: t.method,
        countedAmount: countedOf(t.method) ?? 0,
      })),
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

function diffClass(diff: number | null): string {
  // Devuelve el nombre de la primitiva de signo (`primitives.css`), no una
  // clase local: el par color+peso del importe ya vive en la capa 2. Sin contar
  // todavía no hay signo que pintar.
  if (diff === null || diff === 0) return ''
  return diff > 0 ? 'ds-amount--pos' : 'ds-amount--neg'
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
      <p v-if="serverError" class="ds-server-error" role="alert" data-error-anchor>
        {{ serverError }}
      </p>

      <div v-if="phase === 'count'">
        <table class="arqueo">
          <thead>
            <tr>
              <th>Medio</th>
              <th class="ds-num">Esperado</th>
              <th class="ds-num">Contado</th>
              <th class="ds-num">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.method">
              <td>{{ methodLabel(t.method) }}</td>
              <td class="ds-num">{{ formatMoney(t.expectedAmount) }}</td>
              <td class="ds-num">
                <!-- `—`, no `0`: el campo arranca vacío (conteo ciego) y un `0`
                     ahí afirmaría «conté cero», que no es lo mismo que «aún no
                     lo he contado». Es la primitiva de vacío del sistema. -->
                <BaseInput
                  v-model="counted[t.method]"
                  class="count-input"
                  inputmode="decimal"
                  placeholder="—"
                />
              </td>
              <td class="ds-num" :class="diffClass(differenceOf(t.method))">
                {{ money(differenceOf(t.method)) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td class="ds-num">{{ formatMoney(totalExpected) }}</td>
              <td class="ds-num">{{ allCounted ? formatMoney(totalCounted) : '—' }}</td>
              <td class="ds-num" :class="diffClass(totalDifference)">
                {{ money(totalDifference) }}
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
          <strong :class="diffClass(totalDifference)">{{ money(totalDifference) }}</strong
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

.count-input {
  max-width: 140px;
  margin-left: auto;
}

/* Ver `CashMovementsTable`: la primitiva del negativo es sólo color y aquí el
   arqueo también lo pone en semibold. */
.ds-amount--neg {
  font-weight: 600;
}

.note-field {
  margin-top: 18px;
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
